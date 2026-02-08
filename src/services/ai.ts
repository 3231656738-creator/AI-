import { JudgeReport, Topic, Difficulty, StageConfig, DebateMode } from '../types'

// ===== AI Debater (豆包 API) =====

interface DebaterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function buildDebaterSystemPrompt(
  topic: Topic,
  aiStance: 'pro' | 'con',
  difficulty: Difficulty,
  stage: StageConfig
): string {
  const stanceLabel = aiStance === 'pro' ? '正方' : '反方'
  const position = aiStance === 'pro' ? topic.proPosition : topic.conPosition
  const opponentPosition = aiStance === 'pro' ? topic.conPosition : topic.proPosition

  const difficultyGuide: Record<Difficulty, string> = {
    beginner:
      '你是一位入门级辩手。使用简单直接的论点，语言平实易懂。不要使用过于复杂的逻辑或专业术语。适度给对手留出反驳空间。',
    intermediate:
      '你是一位中等水平的辩手。论点有一定深度，善于使用事实和数据。能进行有效反驳，但不要过于犀利。',
    expert:
      '你是一位顶尖辩手。论点犀利且逻辑严密，善于发现对方论证的漏洞。使用高级辩论技巧，如归谬法、类比论证等。引经据典，论证有力。',
  }

  const stageGuide: Record<string, string> = {
    opening_pro: '现在是开篇立论环节。请系统地阐述你方的基本立场和主要论点（建议提出2-3个核心论点）。',
    opening_con: '现在是开篇立论环节。请系统地阐述你方的基本立场和主要论点（建议提出2-3个核心论点）。',
    cross_pro: aiStance === 'pro'
      ? '现在是正方质询环节。请向对方提出犀利的问题，揭示其论点中的问题。问题要简短有力。'
      : '现在是正方质询环节。对方正在向你提问，请正面回答对方的问题，不要回避。回答简洁有力。',
    cross_con: aiStance === 'con'
      ? '现在是反方质询环节。请向对方提出犀利的问题，揭示其论点中的问题。问题要简短有力。'
      : '现在是反方质询环节。对方正在向你提问，请正面回答对方的问题，不要回避。回答简洁有力。',
    free_debate: '现在是自由辩论环节。根据对方刚才的发言进行有针对性的反驳，同时巩固己方论点。发言要简洁有力，每次控制在2-4句话。',
    closing_con: '现在是总结陈词环节。请总结全场辩论，重申己方核心论点，指出对方论证的不足，做出有力的收束。',
    closing_pro: '现在是总结陈词环节。请总结全场辩论，重申己方核心论点，指出对方论证的不足，做出有力的收束。',
    emotional_debate: '现在是情绪辩论环节。请使用更强烈的立场与富有情感的表达进行反驳与陈述，但保持基本礼貌与尊重。每次发言控制在2-4句话，表达应有情绪色彩、强调态度，同时尽量保持基本逻辑。',
  }

  return `你是一位经验丰富的辩论选手，正在参加一场正式辩论赛。

辩题：${topic.title}
你的立场（${stanceLabel}）：${position}
对方立场：${opponentPosition}

${difficultyGuide[difficulty]}

${stageGuide[stage.type] || ''}

重要规则：
- 始终坚守你的${stanceLabel}立场"${position}"，绝不动摇
- 使用中文进行辩论
- 称呼对方为"对方辩友"
- 保持辩论的礼貌和专业性
- 发言内容要与当前环节匹配
- 不要在回复中包含"作为AI"等破坏角色扮演的内容
- 控制篇幅，每次发言不超过300字`
}

export function buildDebaterMessages(
  topic: Topic,
  aiStance: 'pro' | 'con',
  difficulty: Difficulty,
  stage: StageConfig,
  history: { role: 'user' | 'assistant'; content: string }[]
): DebaterMessage[] {
  const systemPrompt = buildDebaterSystemPrompt(topic, aiStance, difficulty, stage)
  return [
    { role: 'system', content: systemPrompt },
    ...history,
  ]
}

export async function* streamDebateResponse(
  messages: DebaterMessage[],
  apiKey: string,
  modelId: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const response = await fetch('/api/doubao/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
      temperature: 0.75,
      max_tokens: 800,
    }),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`豆包 API 错误 (${response.status}): ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // skip invalid JSON
      }
    }
  }
}

// ===== AI Judge (DeepSeek API) =====

function buildJudgePromptStandard(transcript: string, topic: Topic): string {
  return `你是一位专业、公正的辩论赛裁判。请根据以下完整辩论记录进行评判。

${transcript}

请严格按照以下JSON格式返回评判结果（不要包含任何其他文字）：

{
  "mode": "standard",
  "winner": "user或ai或tie",
  "userScore": {
    "total": 0到100的数字,
    "argumentQuality": 0到25的数字,
    "logic": 0到25的数字,
    "rebuttal": 0到20的数字,
    "evidence": 0到15的数字,
    "expression": 0到15的数字
  },
  "aiScore": {
    "total": 0到100的数字,
    "argumentQuality": 0到25的数字,
    "logic": 0到25的数字,
    "rebuttal": 0到20的数字,
    "evidence": 0到15的数字,
    "expression": 0到15的数字
  },
  "overallComment": "对整场辩论的总体评价，200字左右",
  "userHighlights": ["用户的亮点1", "用户的亮点2"],
  "userImprovements": ["用户的改进建议1", "改进建议2"],
  "stageComments": {
    "opening": "开篇立论环节点评",
    "cross_examination": "质询环节点评",
    "free_debate": "自由辩论环节点评",
    "closing": "总结陈词环节点评"
  },
  "keyMoments": [
    {
      "stage": "环节名称",
      "description": "关键时刻描述",
      "impact": "positive或negative或neutral"
    }
  ]
}

评分维度说明：
- argumentQuality（论点质量，满分25）：论点是否清晰、有力、有说服力
- logic（逻辑严密性，满分25）：论证过程是否有逻辑，是否存在逻辑谬误
- rebuttal（反驳能力，满分20）：是否有效回应和反驳对方论点
- evidence（论据支撑，满分15）：是否使用了有效的事实、数据、案例
- expression（表达与风度，满分15）：语言表达是否流畅，是否保持辩论风度

total必须等于五个维度分数之和。请公正客观地评判，不要因为一方是AI就给予特殊对待。`
}

function buildJudgePromptEmotional(transcript: string, topic: Topic): string {
  return `你是一位专业、公正的辩论赛裁判。以下是完整辩论记录，请针对“情绪辩论模式”进行评判。

${transcript}

请严格按照以下JSON格式返回评判结果（不要包含任何其他文字）：

{
  "mode": "emotional",
  "winner": "user或ai或tie",
  "userScore": {
    "total": 0到100的数字,
    "emotionIntensity": 0到100的数字,
    "logicReasoning": 0到100的数字,
    "blendQuality": 0到100的数字
  },
  "aiScore": {
    "total": 0到100的数字,
    "emotionIntensity": 0到100的数字,
    "logicReasoning": 0到100的数字,
    "blendQuality": 0到100的数字
  },
  "overallComment": "对整场辩论的总体评价，200字左右",
  "userHighlights": ["用户的亮点1", "用户的亮点2"],
  "userImprovements": ["用户的改进建议1", "改进建议2"],
  "stageComments": {
    "emotional_debate": "情绪辩论环节点评"
  },
  "keyMoments": [
    {
      "stage": "情绪辩论",
      "description": "关键时刻描述",
      "impact": "positive或negative或neutral"
    }
  ]
}

评分标准（用于计算total）：
- 情绪化表达强度（占比30%）：表达是否具有情感色彩与强烈立场
- 逻辑合理性（占比40%）：在情绪化表达下是否保持基本逻辑与清晰结构
- 两者结合度（占比30%）：情绪与逻辑融合得是否自然有效

请按照以上比例综合计算total，并确保评价客观、公正。`
}

export async function getJudgeReport(
  transcript: string,
  topic: Topic,
  mode: DebateMode,
  apiKey: string,
  signal?: AbortSignal
): Promise<JudgeReport> {
  const response = await fetch('/api/deepseek/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的辩论赛裁判。请严格按照用户要求的JSON格式返回评判结果。只返回JSON，不要包含其他任何文字。',
        },
        {
          role: 'user',
          content: mode === 'emotional'
            ? buildJudgePromptEmotional(transcript, topic)
            : buildJudgePromptStandard(transcript, topic),
        },
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) throw new Error('裁判未返回评判结果')

  try {
    const parsed = JSON.parse(content) as JudgeReport
    if (!('mode' in parsed)) {
      return { ...parsed, mode } as JudgeReport
    }
    return parsed
  } catch {
    throw new Error('裁判返回的格式无法解析')
  }
}
