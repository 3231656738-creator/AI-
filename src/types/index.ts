// ===== Topic =====
export interface Topic {
  id: string
  title: string
  proPosition: string
  conPosition: string
  category: TopicCategory
  difficulty: 'easy' | 'medium' | 'hard'
  background?: string
  keyPoints?: string[]
}

export type TopicCategory = '严肃' | '娱乐'

export type DebateMode = 'standard' | 'emotional'

// ===== Debate Config =====
export interface DebateConfig {
  openingTime: number      // seconds
  crossExamTime: number    // seconds
  freeDebateTime: number   // seconds per side
  closingTime: number      // seconds
  prepTime: number         // seconds between stages
  emotionalTotalTime: number // seconds
}

export const DEFAULT_CONFIG: DebateConfig = {
  openingTime: 180,
  crossExamTime: 120,
  freeDebateTime: 180,
  closingTime: 120,
  prepTime: 15,
  emotionalTotalTime: 600,
}

// ===== Debate Stage =====
export type StageType =
  | 'opening_pro'
  | 'opening_con'
  | 'cross_pro'
  | 'cross_con'
  | 'free_debate'
  | 'closing_con'
  | 'closing_pro'
  | 'emotional_debate'

export interface StageConfig {
  type: StageType
  displayName: string
  description: string
  speaker: 'pro' | 'con' | 'both'
  timeLimit: number
}

// ===== Message =====
export interface Message {
  id: string
  speaker: 'user' | 'ai'
  content: string
  timestamp: number
  stageType: StageType
  inputMethod: 'voice' | 'text'
}

// ===== Difficulty =====
export type Difficulty = 'beginner' | 'intermediate' | 'expert'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '入门',
  intermediate: '进阶',
  expert: '专家',
}

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner: 'text-emerald-400',
  intermediate: 'text-amber-400',
  expert: 'text-rose-400',
}

// ===== Judge Report =====
export interface StandardScoreDetail {
  total: number
  argumentQuality: number
  logic: number
  rebuttal: number
  evidence: number
  expression: number
}

export interface EmotionalScoreDetail {
  total: number
  emotionIntensity: number
  logicReasoning: number
  blendQuality: number
}

export interface KeyMoment {
  stage: string
  description: string
  impact: 'positive' | 'negative' | 'neutral'
}

export interface JudgeReportBase {
  winner: 'user' | 'ai' | 'tie'
  overallComment: string
  userHighlights: string[]
  userImprovements: string[]
  stageComments: Record<string, string>
  keyMoments: KeyMoment[]
  mode: DebateMode
}

export interface StandardJudgeReport extends JudgeReportBase {
  mode: 'standard'
  userScore: StandardScoreDetail
  aiScore: StandardScoreDetail
}

export interface EmotionalJudgeReport extends JudgeReportBase {
  mode: 'emotional'
  userScore: EmotionalScoreDetail
  aiScore: EmotionalScoreDetail
}

export type JudgeReport = StandardJudgeReport | EmotionalJudgeReport

// ===== Debate Status =====
export type DebateStatus =
  | 'idle'
  | 'countdown'
  | 'stage_transition'
  | 'user_turn'
  | 'ai_turn'
  | 'paused'
  | 'scoring'
  | 'completed'

// ===== Settings =====
export interface AppSettings {
  doubaoApiKey: string
  doubaoModelId: string
  deepseekApiKey: string
  voiceEnabled: boolean
  voiceSpeed: number
  ttsEnabled: boolean
  ttsVoiceName: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  doubaoApiKey: '',
  doubaoModelId: '',
  deepseekApiKey: '',
  voiceEnabled: true,
  voiceSpeed: 1.0,
  ttsEnabled: true,
  ttsVoiceName: '',
}

// ===== Stage utilities =====
export function getStagesForConfig(
  userStance: 'pro' | 'con',
  config: DebateConfig
): StageConfig[] {
  return [
    {
      type: 'opening_pro',
      displayName: '正方开篇立论',
      description: '请正方阐述基本立场和主要论点',
      speaker: 'pro',
      timeLimit: config.openingTime,
    },
    {
      type: 'opening_con',
      displayName: '反方开篇立论',
      description: '请反方阐述基本立场和主要论点',
      speaker: 'con',
      timeLimit: config.openingTime,
    },
    {
      type: 'cross_pro',
      displayName: '正方质询',
      description: '正方向反方提问，反方回答',
      speaker: 'both',
      timeLimit: config.crossExamTime,
    },
    {
      type: 'cross_con',
      displayName: '反方质询',
      description: '反方向正方提问，正方回答',
      speaker: 'both',
      timeLimit: config.crossExamTime,
    },
    {
      type: 'free_debate',
      displayName: '自由辩论',
      description: '双方交替自由发言',
      speaker: 'both',
      timeLimit: config.freeDebateTime * 2,
    },
    {
      type: 'closing_con',
      displayName: '反方总结陈词',
      description: '请反方进行总结陈词',
      speaker: 'con',
      timeLimit: config.closingTime,
    },
    {
      type: 'closing_pro',
      displayName: '正方总结陈词',
      description: '请正方进行总结陈词',
      speaker: 'pro',
      timeLimit: config.closingTime,
    },
  ]
}

export function getStagesForMode(
  mode: DebateMode,
  userStance: 'pro' | 'con',
  config: DebateConfig
): StageConfig[] {
  if (mode === 'emotional') {
    return [
      {
        type: 'emotional_debate',
        displayName: '情绪辩论',
        description: '用更强烈的立场与情绪进行辩论，但保持基本礼貌',
        speaker: 'both',
        timeLimit: config.emotionalTotalTime,
      },
    ]
  }
  return getStagesForConfig(userStance, config)
}

export function isUserTurn(stage: StageConfig, userStance: 'pro' | 'con'): boolean {
  if (stage.speaker === 'both') return true
  return stage.speaker === userStance
}

export function isAiTurn(stage: StageConfig, userStance: 'pro' | 'con'): boolean {
  if (stage.speaker === 'both') return true
  return stage.speaker !== userStance
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
