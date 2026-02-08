import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Send, Pause, Play, SkipForward,
  Volume2, VolumeX, User, Bot, Loader2, Clock, AlertCircle, Keyboard
} from 'lucide-react'
import { useDebateStore } from '../store/debateStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTimer } from '../hooks/useTimer'
import { useSpeechRecognition, useSpeechSynthesis, useAudioLevel } from '../hooks/useSpeech'
import { buildDebaterMessages, streamDebateResponse } from '../services/ai'
import { formatTime, isUserTurn, isAiTurn, StageConfig, Message } from '../types'

export default function DebatePage() {
  const navigate = useNavigate()
  const store = useDebateStore()
  const settings = useSettingsStore()

  const {
    topic, userStance, difficulty, config, status, stages,
    currentStageIndex, timeRemaining, messages, aiStreamingText,
    isAiThinking, setStatus, nextStage, tick, addMessage,
    setAiStreaming, appendAiStreaming, finalizeAiMessage,
    setIsAiThinking, setTimeRemaining, mode,
  } = store

  const stt = useSpeechRecognition()
  const tts = useSpeechSynthesis()
  const audioLevel = useAudioLevel()
  
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [textInput, setTextInput] = useState('')
  const [countdown, setCountdown] = useState(3)
  const [stageTransitionName, setStageTransitionName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const turnHandledRef = useRef(false)

  const currentStage = stages[currentStageIndex] as StageConfig | undefined

  // ===== Redirect if no debate initialized =====
  useEffect(() => {
    if (!topic) navigate('/topic', { replace: true })
  }, [topic, navigate])

  // ===== Auto-scroll messages =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiStreamingText, stt.transcript, stt.interimTranscript])

  // ===== Countdown Phase =====
  useEffect(() => {
    if (status !== 'countdown') return
    if (countdown <= 0) {
      showStageTransition()
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [status, countdown])

  // ===== Stage Transition =====
  const showStageTransition = useCallback(() => {
    if (!currentStage) return
    setStageTransitionName(currentStage.displayName)
    setStatus('stage_transition')
    turnHandledRef.current = false

    setTimeout(() => {
      setStageTransitionName('')
      beginStageTurn()
    }, 2200)
  }, [currentStageIndex, stages, userStance])

  // ===== Begin Turn Logic =====
  const beginStageTurn = useCallback(() => {
    if (!currentStage) return
    if (currentStage.type === 'emotional_debate') {
      setStatus('user_turn')
      return
    }

    const userFirst = isUserTurn(currentStage, userStance) &&
      (currentStage.speaker !== 'both' || currentStage.type === 'cross_pro'
        ? userStance === 'pro' : userStance === 'con')

    // For single speaker stages
    if (currentStage.speaker !== 'both') {
      if (isUserTurn(currentStage, userStance)) {
        setStatus('user_turn')
      } else {
        setStatus('ai_turn')
        triggerAiResponse()
      }
      return
    }

    // For alternating stages (cross-exam, free debate)
    if (userFirst) {
      setStatus('user_turn')
    } else {
      setStatus('ai_turn')
      triggerAiResponse()
    }
  }, [currentStageIndex, stages, userStance])

  // ===== Timer =====
  const isTimerActive = status === 'user_turn' || status === 'ai_turn'

  useTimer(isTimerActive, timeRemaining, tick, {
    onWarning: (type) => {
      // Could play a sound here
    },
    onTimeout: () => {
      handleTimeout()
    },
  })

  const handleTimeout = useCallback(() => {
    if (status === 'user_turn') {
      endUserTurn()
    }
    if (status === 'ai_turn') {
      abortRef.current?.abort()
      finalizeAiMessage(currentStage!.type)
    }
    // Move to next part of stage or next stage
    advanceDebate()
  }, [status, currentStage])

  // ===== Advance Debate =====
  const advanceDebate = useCallback(() => {
    if (turnHandledRef.current) return
    turnHandledRef.current = true

    // For alternating stages where both haven't spoken, switch turns
    if (currentStage?.speaker === 'both' && status !== 'stage_transition') {
      // Just go to next stage for simplicity
    }

    const hasMore = nextStage()
    if (hasMore) {
      setTimeout(() => showStageTransition(), 500)
    } else {
      // Debate is over, go to scoring
      handleScoring()
    }
  }, [currentStage, status])

  // ===== User Turn =====
  const endUserTurn = useCallback(() => {
    stt.stopListening()
    const userText = inputMode === 'voice'
      ? (stt.transcript + stt.interimTranscript).trim()
      : textInput.trim()

    if (userText) {
      addMessage({
        speaker: 'user',
        content: userText,
        stageType: currentStage!.type,
        inputMethod: inputMode,
      })
    }

    stt.resetTranscript()
    setTextInput('')

    // After user, check if AI should respond in this stage
    if (currentStage?.speaker === 'both') {
      turnHandledRef.current = false
      setStatus('ai_turn')
      triggerAiResponse()
    } else {
      advanceDebate()
    }
  }, [inputMode, stt, textInput, currentStage])

  const handleSendText = () => {
    if (!textInput.trim()) return
    endUserTurn()
  }

  // ===== AI Turn =====
  const triggerAiResponse = useCallback(async () => {
    if (!currentStage || !topic) return
    setIsAiThinking(true)
    setAiStreaming('')

    const aiStance = userStance === 'pro' ? 'con' : 'pro'

    // Build history from messages
    const history = messages.map((m) => ({
      role: (m.speaker === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))

    // Check if we are resuming from a pause (last message is assistant)
    if (history.length > 0 && history[history.length - 1].role === 'assistant') {
      history.push({ role: 'user', content: '请继续你刚才的发言，不要重复已经说的内容。' })
    }

    const apiMessages = buildDebaterMessages(topic, aiStance as 'pro' | 'con', difficulty, currentStage, history)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let fullText = ''
      setIsAiThinking(false)

      for await (const chunk of streamDebateResponse(
        apiMessages,
        settings.doubaoApiKey,
        settings.doubaoModelId,
        controller.signal
      )) {
        fullText += chunk
        appendAiStreaming(chunk)
      }

      finalizeAiMessage(currentStage.type)

      // TTS
      if (settings.ttsEnabled && fullText.trim()) {
        tts.speak(fullText.trim(), settings.ttsVoiceName, settings.voiceSpeed)
      }

      // Only advance if completed successfully
      // After AI, check if user should respond in this stage
      if (currentStage.speaker === 'both' && timeRemaining > 5) {
        turnHandledRef.current = false
        setStatus('user_turn')
      } else {
        advanceDebate()
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('AI response error:', err)
        // Add error as a system message
        const errorText = `[AI 回复出错: ${err.message || '请检查API配置'}]`
        setAiStreaming(errorText)
        finalizeAiMessage(currentStage.type)
        
        // Advance even on error
        advanceDebate()
      }
      // If AbortError, do nothing (paused or skipped)
    } finally {
      setIsAiThinking(false)
    }
  }, [currentStage, topic, userStance, difficulty, messages, settings, timeRemaining])

  // ===== Scoring =====
  const handleScoring = useCallback(async () => {
    setStatus('scoring')
    tts.stop()

    try {
      const { getJudgeReport } = await import('../services/ai')
      const transcript = store.getTranscript()
      const report = await getJudgeReport(
        transcript,
        topic!,
        mode,
        settings.deepseekApiKey,
      )
      store.setReport(report)
      navigate('/report')
    } catch (err: any) {
      console.error('Scoring error:', err)
      // Create a fallback report
      const fallbackReport = mode === 'emotional'
        ? {
            mode: 'emotional' as const,
            winner: 'tie' as const,
            userScore: { total: 70, emotionIntensity: 70, logicReasoning: 70, blendQuality: 70 },
            aiScore: { total: 70, emotionIntensity: 70, logicReasoning: 70, blendQuality: 70 },
            overallComment: `评分过程中遇到错误：${err.message}。请检查 DeepSeek API 配置后重试。`,
            userHighlights: ['完成了一场情绪化辩论'],
            userImprovements: ['请检查 API 配置后重新进行辩论以获取详细评价'],
            stageComments: { emotional_debate: '系统评分失败，提供占位数据' },
            keyMoments: [],
          }
        : {
            mode: 'standard' as const,
            winner: 'tie' as const,
            userScore: { total: 70, argumentQuality: 17, logic: 18, rebuttal: 14, evidence: 10, expression: 11 },
            aiScore: { total: 70, argumentQuality: 17, logic: 18, rebuttal: 14, evidence: 10, expression: 11 },
            overallComment: `评分过程中遇到错误：${err.message}。请检查 DeepSeek API 配置后重试。`,
            userHighlights: ['完成了一场完整的辩论'],
            userImprovements: ['请检查 API 配置后重新进行辩论以获取详细评价'],
            stageComments: {},
            keyMoments: [],
          }
      store.setReport(fallbackReport)
      navigate('/report')
    }
  }, [topic, settings.deepseekApiKey, mode])

  // ===== Pause/Resume =====
  const togglePause = () => {
    if (status === 'paused') {
      store.resumeDebate()
      // Note: We don't automatically restart STT/TTS here to allow user to get ready
      // We rely on the effects (Voice Control & Resume AI Generation) to handle restart
    } else if (status === 'user_turn' || status === 'ai_turn') {
      // Pause first to save any streaming content immediately
      store.pauseDebate()
      
      stt.stopListening()
      tts.stop()
      abortRef.current?.abort()
    }
  }

  // Effect to restart STT is handled by the main Voice Control effect below

  // ===== Skip stage =====
  const skipStage = () => {
    stt.stopListening()
    tts.stop()
    abortRef.current?.abort()
    if (aiStreamingText) finalizeAiMessage(currentStage!.type)
    advanceDebate()
  }

  // ===== Voice control =====
  useEffect(() => {
    // Only start listening if we are in user turn and voice mode
    // We do NOT reset transcript here to support resuming from pause
    if (status === 'user_turn' && inputMode === 'voice' && settings.voiceEnabled && stt.isSupported) {
      if (!stt.isListening) {
        stt.startListening()
        audioLevel.startMonitoring()
      }
    }
    return () => {
      // We only stop listening if we are leaving user_turn (handled by dependency change)
      // But we don't want to stop if we are just re-rendering
      if (status !== 'user_turn' && stt.isListening) {
         stt.stopListening()
         audioLevel.stopMonitoring()
      }
    }
  }, [status, inputMode])

  // ===== Resume AI Generation =====
  useEffect(() => {
    // If we resumed to ai_turn (and cleared previous streaming text), trigger AI response again
    if (status === 'ai_turn' && !isAiThinking && !aiStreamingText) {
      triggerAiResponse()
    }
  }, [status, isAiThinking, aiStreamingText, triggerAiResponse])

  // ===== Render =====
  if (!topic || !currentStage) return null

  const timerColor = timeRemaining <= 10 ? 'text-red-400' : timeRemaining <= 30 ? 'text-amber-400' : 'text-slate-100'
  const timerUrgent = timeRemaining <= 10

  return (
    <div className="h-screen flex flex-col bg-base-950 text-base-100 overflow-hidden font-sans">
      <div className="bg-grain" />

      {/* ===== Overlays ===== */}
      <AnimatePresence>
        {status === 'paused' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-base-950/60 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-base-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-base-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                <Pause className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-xl font-bold text-base-100 mb-2">辩论已暂停</h3>
              <p className="text-base-500 mb-8">休息一下，整理思路，随时准备继续。</p>
              <button
                onClick={togglePause}
                className="w-full py-3 bg-primary-500 hover:bg-primary-400 text-base-950 font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20"
              >
                继续辩论
              </button>
            </div>
          </motion.div>
        )}

        {status === 'countdown' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-base-950 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                key={countdown}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                className="text-[120px] font-serif font-bold text-primary-400"
              >
                {countdown > 0 ? countdown : '辩'}
              </motion.div>
              <p className="text-base-500 font-mono tracking-widest uppercase mt-4">Preparing Arena</p>
            </div>
          </motion.div>
        )}

        {stageTransitionName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-base-950/90 backdrop-blur-xl flex items-center justify-center"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center max-w-xl px-6"
            >
              <div className="w-16 h-1 bg-primary-500 mx-auto mb-8" />
              <h2 className="text-4xl md:text-5xl font-serif font-medium text-base-100 mb-6">{stageTransitionName}</h2>
              <p className="text-xl text-base-400 font-light leading-relaxed">{currentStage.description}</p>
            </motion.div>
          </motion.div>
        )}

        {status === 'scoring' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-base-950/90 backdrop-blur-xl flex items-center justify-center"
          >
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 border-2 border-base-800 rounded-full" />
                <div className="absolute inset-0 border-t-2 border-primary-500 rounded-full animate-spin" />
                <Brain className="absolute inset-0 m-auto text-primary-400" size={32} />
              </div>
              <h3 className="text-2xl font-serif text-base-200 mb-2">AI 裁判正在评判</h3>
              <p className="text-base-500">DeepSeek 正在深度分析逻辑与论据...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Header ===== */}
      <header className="px-6 py-4 border-b border-white/5 bg-base-950/50 backdrop-blur-sm z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-base-900 flex items-center justify-center border border-white/5">
            <span className="font-serif font-bold text-primary-400">{currentStageIndex + 1}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-base-200">{currentStage.displayName}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-base-400 uppercase tracking-wider">
                {mode === 'emotional' ? '情绪模式' : '标准模式'}
              </span>
            </div>
            <div className="flex gap-1 mt-1">
              {stages.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === currentStageIndex ? 'bg-primary-500' : i < currentStageIndex ? 'bg-base-700' : 'bg-base-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-base-900 rounded-full border border-white/5">
            <Clock size={16} className={timeRemaining < 30 ? 'text-orange-400' : 'text-base-500'} />
            <span className={`font-mono text-lg ${timeRemaining < 30 ? 'text-orange-400' : 'text-base-200'}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          <button
            onClick={togglePause}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-base-400 transition-colors"
          >
            {status === 'paused' ? <Play size={20} /> : <Pause size={20} />}
          </button>
        </div>
      </header>

      {/* ===== Chat Area ===== */}
      <main className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
        {/* Background Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full pointer-events-none opacity-20">
          <div className="absolute top-20 left-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} userStance={userStance} />
          ))}

          {/* AI Thinking Indicator */}
          {isAiThinking && (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-10 h-10 rounded-full bg-base-800 flex items-center justify-center border border-white/5 shadow-lg shadow-blue-500/10">
                <Bot size={18} className="text-blue-400" />
              </div>
              <div className="flex items-center gap-1.5 text-base-500 text-xs">
                <span>AI 正在思考</span>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-base-500 rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-base-500 rounded-full animate-bounce delay-100" />
                  <span className="w-1 h-1 bg-base-500 rounded-full animate-bounce delay-200" />
                </span>
              </div>
            </div>
          )}

          {/* AI Streaming Text */}
          {aiStreamingText && !isAiThinking && (
            <div className="flex justify-center w-full">
              <div className="w-full max-w-2xl bg-base-900/40 backdrop-blur-md border border-blue-500/20 rounded-2xl p-8 shadow-xl shadow-blue-900/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600" />
                <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
                  <Bot size={16} className="text-blue-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-blue-300">AI Opponent</span>
                </div>
                <p className="text-base-200 leading-relaxed font-light whitespace-pre-wrap text-lg">
                  {aiStreamingText}
                  <span className="inline-block w-1.5 h-5 bg-blue-400 ml-1 animate-pulse align-middle" />
                </p>
              </div>
            </div>
          )}

          {/* Voice Recording Indicator (Real-time Display) */}
          {status === 'user_turn' && inputMode === 'voice' && stt.isListening && (
            <div className="flex justify-center w-full">
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full max-w-2xl bg-base-900/60 backdrop-blur-md border border-primary-500/30 rounded-2xl p-8 shadow-2xl shadow-primary-900/10 relative overflow-hidden"
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-400 to-primary-600" />
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
                
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <User size={16} className="text-primary-400 relative z-10" />
                      <div className="absolute inset-0 bg-primary-400/20 blur-sm animate-pulse" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-wider text-primary-300">Recording</span>
                  </div>
                  <div className="voice-wave">
                    {[...Array(5)].map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.1}s`, backgroundColor: '#d0a06e' }} />)}
                  </div>
                </div>
                
                <p className="text-base-100 leading-relaxed font-light whitespace-pre-wrap text-lg min-h-[1.5em]">
                  {stt.transcript}
                  <span className="text-base-500">{stt.interimTranscript}</span>
                  <span className="inline-block w-1.5 h-5 bg-primary-400 ml-1 animate-pulse align-middle" />
                </p>
              </motion.div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* ===== Input Area ===== */}
      <footer className="shrink-0 p-6 bg-base-950/80 backdrop-blur-md border-t border-white/5 relative z-20">
        <div className="max-w-3xl mx-auto">
          {status === 'user_turn' ? (
            <div className="flex flex-col gap-4">
              {/* Input Controls */}
              <div className="flex items-end gap-4">
                <button
                  onClick={() => {
                    if (inputMode === 'voice') stt.stopListening()
                    setInputMode(m => m === 'voice' ? 'text' : 'voice')
                  }}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-base-900 border border-white/10 text-base-400 hover:text-base-200 hover:border-white/20 transition-all shrink-0 hover:bg-white/5"
                >
                  {inputMode === 'voice' ? <Keyboard size={20} /> : <Mic size={20} />}
                </button>

                <div className="flex-1 bg-base-900/50 border border-white/10 rounded-2xl p-2 relative overflow-hidden transition-colors focus-within:border-primary-500/30 focus-within:bg-base-900/80">
                  {inputMode === 'voice' ? (
                    <div className="h-12 flex flex-col items-center justify-center relative">
                      {stt.isListening ? (
                        <>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-primary-400 text-sm font-medium tracking-wide">正在聆听...</span>
                          </div>
                          
                          {/* Real-time Volume Bar */}
                          <div className="w-1/2 h-1 bg-base-800 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-primary-600 to-primary-400"
                              animate={{ 
                                width: `${Math.min(100, Math.max(5, audioLevel.level))}%`,
                                opacity: audioLevel.level > 0 ? 1 : 0.3
                              }}
                              transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-base-500 text-sm">点击麦克风开始发言</span>
                      )}
                      
                      {/* Low volume warning */}
                      {stt.isListening && audioLevel.level < 5 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md"
                        >
                          <AlertCircle size={12} />
                          <span>音量过低，请靠近麦克风</span>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendText())}
                      placeholder="请输入你的观点..."
                      className="w-full bg-transparent border-none text-base-200 p-3 h-12 max-h-32 focus:ring-0 resize-none text-sm placeholder-base-600"
                    />
                  )}
                </div>

                <button
                  onClick={inputMode === 'voice' ? endUserTurn : handleSendText}
                  disabled={inputMode === 'text' && !textInput.trim()}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shrink-0 ${
                    (inputMode === 'voice' || textInput.trim())
                      ? 'bg-primary-500 text-base-950 hover:bg-primary-400 shadow-lg shadow-primary-500/20'
                      : 'bg-base-800 text-base-600 cursor-not-allowed'
                  }`}
                >
                  {inputMode === 'voice' ? <SkipForward size={20} /> : <Send size={20} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-4 text-base-500">
              {status === 'ai_turn' ? (
                <>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse delay-150" />
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse delay-300" />
                  </div>
                  <span className="text-sm font-mono uppercase tracking-wider">AI is speaking</span>
                </>
              ) : (
                <span className="text-sm">辩论暂停中</span>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

// ===== Message Bubble Component =====
function MessageBubble({ message, userStance }: { message: Message; userStance: 'pro' | 'con' }) {
  const isUser = message.speaker === 'user'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center w-full"
    >
      <div className={`w-full max-w-2xl relative overflow-hidden rounded-2xl p-8 border shadow-lg transition-all duration-500 ${
        isUser 
          ? 'bg-base-900/40 border-primary-500/20 shadow-primary-900/5' 
          : 'bg-base-900/40 border-blue-500/20 shadow-blue-900/5'
      }`}>
        {/* Accent Line */}
        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${
          isUser ? 'from-primary-400 to-primary-600' : 'from-blue-400 to-blue-600'
        }`} />

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
          {isUser ? <User size={16} className="text-primary-400" /> : <Bot size={16} className="text-blue-400" />}
          <span className={`text-xs font-mono uppercase tracking-wider ${
            isUser ? 'text-primary-300' : 'text-blue-300'
          }`}>
            {isUser ? 'You' : 'AI Opponent'}
          </span>
          <span className="text-xs text-base-600 ml-auto font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>

        {/* Content */}
        <p className="text-base-200 leading-relaxed font-light whitespace-pre-wrap text-lg">
          {message.content}
        </p>
      </div>
    </motion.div>
  )
}
