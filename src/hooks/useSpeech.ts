import { useState, useRef, useCallback, useEffect } from 'react'

// ===== Audio Level Hook =====
export function useAudioLevel() {
  const [level, setLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      sourceRef.current = source

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevel = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Calculate average volume
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length
        
        // Normalize to 0-100 (approximate)
        // Typical speech might be around 20-50 in this scale
        const normalized = Math.min(100, Math.round((average / 128) * 100 * 2))
        
        setLevel(normalized)
        rafRef.current = requestAnimationFrame(updateLevel)
      }

      updateLevel()
    } catch (err) {
      console.warn('Failed to start audio monitoring:', err)
    }
  }, [])

  const stopMonitoring = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (analyserRef.current) {
      analyserRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setLevel(0)
  }, [])

  useEffect(() => {
    return () => stopMonitoring()
  }, [stopMonitoring])

  return { level, startMonitoring, stopMonitoring }
}

// ===== Speech Recognition (STT) =====
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldRestartRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(!!SpeechRecognitionClass)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionClass) return

    // Clean up existing
    if (recognitionRef.current) {
      shouldRestartRef.current = false
      recognitionRef.current.abort()
    }

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'zh-CN'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      let newFinalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          newFinalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      if (newFinalText) {
        finalTranscriptRef.current += newFinalText
        setTranscript(finalTranscriptRef.current)
      }
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event: Event & { error: string }) => {
      console.warn('Speech recognition error:', event.error)
      
      // Handle common errors
      if (event.error === 'no-speech') {
        // Just ignore no-speech errors, don't stop listening
        return
      }
      
      if (event.error === 'network') {
        // Network error is common, try to restart after a delay
        setIsListening(false)
        if (shouldRestartRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            try { recognition.start() } catch {}
          }, 1000)
        }
        return
      }

      if (event.error === 'aborted') {
        // Intentional stop
        return
      }
      
      // Other errors: stop
      setIsListening(false)
      shouldRestartRef.current = false
    }

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (shouldRestartRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          try { recognition.start() } catch (e) {
            console.warn('Restart failed:', e)
            setIsListening(false)
            shouldRestartRef.current = false
          }
        }, 300)
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    
    // Don't clear transcript here if we are just restarting
    // But since this is startListening (user action), we usually want to clear
    // We'll rely on resetTranscript for explicit clearing
    
    try {
      recognition.start()
    } catch (e) {
      console.warn('Failed to start speech recognition:', e)
      setIsListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
  }, [])

  const getFullTranscript = useCallback(() => {
    return (finalTranscriptRef.current + '').trim()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
    }
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    getFullTranscript,
  }
}

// ===== Speech Synthesis (TTS) =====
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis?.getVoices() || []
      // Prefer Chinese voices
      const chineseVoices = allVoices.filter(
        (v) => v.lang.startsWith('zh') || v.lang.includes('CN')
      )
      setVoices(chineseVoices.length > 0 ? chineseVoices : allVoices)
    }

    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  const speak = useCallback(
    (text: string, voiceName?: string, rate: number = 1.0) => {
      if (!window.speechSynthesis) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = rate
      utterance.pitch = 1.0

      if (voiceName) {
        const voice = voices.find((v) => v.name === voiceName)
        if (voice) utterance.voice = voice
      } else {
        // Auto-select best Chinese voice
        const zhVoice = voices.find(
          (v) => v.lang === 'zh-CN' || v.lang === 'zh_CN'
        )
        if (zhVoice) utterance.voice = zhVoice
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [voices]
  )

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  return { isSpeaking, voices, speak, stop }
}
