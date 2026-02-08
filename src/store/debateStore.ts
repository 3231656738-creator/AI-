import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  Topic, DebateConfig, DEFAULT_CONFIG, StageConfig, Message,
  Difficulty, DebateStatus, JudgeReport, getStagesForMode, DebateMode,
} from '../types'

interface DebateState {
  // Setup
  topic: Topic | null
  userStance: 'pro' | 'con'
  difficulty: Difficulty
  config: DebateConfig
  mode: DebateMode
  customTopics: Topic[]

  // Status
  status: DebateStatus
  pausedState: DebateStatus | null
  stages: StageConfig[]
  currentStageIndex: number
  timeRemaining: number

  // Messages
  messages: Message[]
  aiStreamingText: string

  // AI state
  isAiThinking: boolean

  // Report
  report: JudgeReport | null

  // Actions
  initDebate: (topic: Topic, stance: 'pro' | 'con', difficulty: Difficulty, config?: Partial<DebateConfig>, mode?: DebateMode) => void
  setMode: (mode: DebateMode) => void
  addCustomTopic: (topic: Topic) => void
  removeCustomTopic: (id: string) => void
  setStatus: (status: DebateStatus) => void
  pauseDebate: () => void
  resumeDebate: () => void
  nextStage: () => boolean
  setTimeRemaining: (t: number) => void
  tick: () => number
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void
  setAiStreaming: (text: string) => void
  appendAiStreaming: (chunk: string) => void
  finalizeAiMessage: (stageType: StageConfig['type']) => void
  setIsAiThinking: (v: boolean) => void
  setReport: (report: JudgeReport) => void
  getTranscript: () => string
  reset: () => void
}

let msgCounter = 0

export const useDebateStore = create<DebateState>()(
  persist(
    (set, get) => ({
      topic: null,
      userStance: 'pro',
      difficulty: 'intermediate',
      config: DEFAULT_CONFIG,
      mode: 'standard',
      customTopics: [],
      status: 'idle',
      pausedState: null,
      stages: [],
      currentStageIndex: 0,
      timeRemaining: 0,
      messages: [],
      aiStreamingText: '',
      isAiThinking: false,
      report: null,

      initDebate: (topic, stance, difficulty, configOverride, modeOverride) => {
        const config = { ...DEFAULT_CONFIG, ...configOverride }
        const mode = modeOverride || get().mode
        const stages = getStagesForMode(mode, stance, config)
        set({
          topic,
          userStance: stance,
          difficulty,
          config,
          mode,
          stages,
          currentStageIndex: 0,
          timeRemaining: stages[0]?.timeLimit || 0,
          messages: [],
          aiStreamingText: '',
          isAiThinking: false,
          report: null,
          status: 'countdown',
          pausedState: null,
        })
      },

      setMode: (mode) => set({ mode }),

      addCustomTopic: (topic) => set((state) => ({
        customTopics: [topic, ...state.customTopics],
      })),

      removeCustomTopic: (id) => set((state) => ({
        customTopics: state.customTopics.filter((topic) => topic.id !== id),
      })),

      setStatus: (status) => set({ status }),

      pauseDebate: () => {
        const { status, aiStreamingText, stages, currentStageIndex } = get()
        if (status === 'paused') return

        // Save streaming text if it exists, regardless of current status (to be safe)
        if (aiStreamingText.trim()) {
          msgCounter++
          const message: Message = {
            id: `msg-${msgCounter}-${Date.now()}`,
            speaker: 'ai',
            content: aiStreamingText.trim(),
            timestamp: Date.now(),
            stageType: stages[currentStageIndex]?.type || 'free_debate',
            inputMethod: 'text',
          }
          set((state) => ({
            messages: [...state.messages, message],
            aiStreamingText: '',
            pausedState: status,
            status: 'paused',
            isAiThinking: false
          }))
        } else {
          set({
            pausedState: status,
            status: 'paused',
          })
        }
      },

      resumeDebate: () => {
        const { pausedState } = get()
        if (pausedState) {
          set({
            status: pausedState,
            pausedState: null,
          })
        } else {
          // Fallback if no paused state
          set({ status: 'user_turn' })
        }
      },

      nextStage: () => {
        const { currentStageIndex, stages } = get()
        const nextIndex = currentStageIndex + 1
        if (nextIndex >= stages.length) {
          set({ status: 'scoring' })
          return false
        }
        set({
          currentStageIndex: nextIndex,
          timeRemaining: stages[nextIndex].timeLimit,
          status: 'stage_transition',
          aiStreamingText: '',
          isAiThinking: false,
        })
        return true
      },

      setTimeRemaining: (t) => set({ timeRemaining: Math.max(0, t) }),

      tick: () => {
        const t = Math.max(0, get().timeRemaining - 1)
        set({ timeRemaining: t })
        return t
      },

      addMessage: (msg) => {
        msgCounter++
        const message: Message = {
          ...msg,
          id: `msg-${msgCounter}-${Date.now()}`,
          timestamp: Date.now(),
        }
        set((state) => ({ messages: [...state.messages, message] }))
      },

      setAiStreaming: (text) => set({ aiStreamingText: text }),
      appendAiStreaming: (chunk) => set((s) => ({ aiStreamingText: s.aiStreamingText + chunk })),

      finalizeAiMessage: (stageType) => {
        const { aiStreamingText } = get()
        if (aiStreamingText.trim()) {
          msgCounter++
          const message: Message = {
            id: `msg-${msgCounter}-${Date.now()}`,
            speaker: 'ai',
            content: aiStreamingText.trim(),
            timestamp: Date.now(),
            stageType,
            inputMethod: 'text',
          }
          set((state) => ({
            messages: [...state.messages, message],
            aiStreamingText: '',
          }))
        }
      },

      setIsAiThinking: (v) => set({ isAiThinking: v }),

      setReport: (report) => set({ report, status: 'completed' }),

      getTranscript: () => {
        const { messages, topic, userStance, stages, mode } = get()
        if (!topic) return ''

        let transcript = `辩题：${topic.title}\n`
        transcript += `模式：${mode === 'emotional' ? '情绪辩论' : '标准辩论'}\n`
        transcript += `正方立场：${topic.proPosition}\n`
        transcript += `反方立场：${topic.conPosition}\n`
        transcript += `用户担任：${userStance === 'pro' ? '正方' : '反方'}\n`
        transcript += `AI担任：${userStance === 'pro' ? '反方' : '正方'}\n\n`

        for (const stage of stages) {
          const stageMessages = messages.filter((m) => m.stageType === stage.type)
          if (stageMessages.length === 0) continue
          transcript += `【${stage.displayName}】\n`
          for (const msg of stageMessages) {
            const label = msg.speaker === 'user'
              ? (userStance === 'pro' ? '正方（用户）' : '反方（用户）')
              : (userStance === 'pro' ? '反方（AI）' : '正方（AI）')
            transcript += `${label}：${msg.content}\n\n`
          }
        }

        return transcript
      },

      reset: () => {
        set({
          topic: null,
          userStance: 'pro',
          difficulty: 'intermediate',
          config: DEFAULT_CONFIG,
          status: 'idle',
          pausedState: null,
          stages: [],
          currentStageIndex: 0,
          timeRemaining: 0,
          messages: [],
          aiStreamingText: '',
          isAiThinking: false,
          report: null,
        })
      },
    }),
    {
      name: 'ai-debate-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist necessary state to restore session
        topic: state.topic,
        userStance: state.userStance,
        difficulty: state.difficulty,
        config: state.config,
        mode: state.mode,
        customTopics: state.customTopics,
        status: state.status,
        pausedState: state.pausedState,
        stages: state.stages,
        currentStageIndex: state.currentStageIndex,
        timeRemaining: state.timeRemaining,
        messages: state.messages,
        aiStreamingText: state.aiStreamingText,
        report: state.report,
      }),
    }
  )
)
