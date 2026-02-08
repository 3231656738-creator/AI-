import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, ArrowRight, RotateCcw, Star, Quote, Share2, Download, TrendingUp, AlertCircle, ChevronRight, Award, Target } from 'lucide-react'
import Header from '../components/Header'
import RadarChart from '../components/RadarChart'
import { useDebateStore } from '../store/debateStore'
import { StandardScoreDetail, EmotionalScoreDetail } from '../types'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function ReportPage() {
  const navigate = useNavigate()
  const { topic, userStance, report, reset } = useDebateStore()

  useEffect(() => {
    if (!report || !topic) navigate('/', { replace: true })
  }, [report, topic, navigate])

  if (!report || !topic) return null

  const { winner, overallComment, userHighlights, userImprovements } = report
  const isEmotional = report.mode === 'emotional'
  const isWinner = winner === 'user'
  const standardUserScore = !isEmotional ? report.userScore as StandardScoreDetail : null
  const standardAiScore = !isEmotional ? report.aiScore as StandardScoreDetail : null
  const emotionalUserScore = isEmotional ? report.userScore as EmotionalScoreDetail : null
  const emotionalAiScore = isEmotional ? report.aiScore as EmotionalScoreDetail : null

  const pageTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
  }

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageTransition} className="min-h-screen bg-base-950 text-base-100 pb-20">
      <div className="bg-grain" />
      <Header />

      <div className="max-w-4xl mx-auto px-6 pt-32">
        {/* Result Banner */}
        <motion.div 
          initial="hidden" animate="visible"
          className="text-center mb-16"
        >
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-base-400 uppercase tracking-widest mb-6">
            {isEmotional ? 'Emotional Debate Report' : 'Debate Analysis Report'}
          </motion.div>
          
          <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-serif font-medium mb-6 text-primary-100">
            {isWinner ? (isEmotional ? 'Passion Victory' : 'Victory') : winner === 'tie' ? 'Draw' : (isEmotional ? 'Passion Defeat' : 'Defeat')}
          </motion.h1>
          
          <motion.p variants={fadeUp} custom={2} className="text-xl text-base-400 font-light max-w-2xl mx-auto">
            {topic.title}
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Content (Left) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Judge's Comment */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={3}
              className="glass-card p-8 rounded-2xl relative overflow-hidden"
              data-reveal
            >
              <Quote className="absolute top-6 right-6 text-white/5 rotate-180" size={80} />
              <h3 className="text-lg font-serif text-primary-300 mb-4">{isEmotional ? '情绪裁判点评' : '裁判点评'}</h3>
              <p className="text-base-300 leading-relaxed font-light text-lg">
                {overallComment}
              </p>
            </motion.div>

            {/* Highlights & Improvements */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={4}
                className="p-6 rounded-2xl bg-base-900/30 border border-white/5"
                data-reveal
              >
                <h4 className="text-sm font-mono uppercase tracking-wider text-base-500 mb-4 flex items-center gap-2">
                  <Star size={14} className="text-primary-400" /> Highlights
                </h4>
                <ul className="space-y-3">
                  {userHighlights.map((h, i) => (
                    <li key={i} className="text-base-300 text-sm font-light flex gap-3">
                      <span className="w-1 h-1 bg-primary-500 rounded-full mt-2 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={5}
                className="p-6 rounded-2xl bg-base-900/30 border border-white/5"
                data-reveal
              >
                <h4 className="text-sm font-mono uppercase tracking-wider text-base-500 mb-4 flex items-center gap-2">
                  <ArrowRight size={14} className="text-base-400" /> Improvements
                </h4>
                <ul className="space-y-3">
                  {userImprovements.map((h, i) => (
                    <li key={i} className="text-base-300 text-sm font-light flex gap-3">
                      <span className="w-1 h-1 bg-base-600 rounded-full mt-2 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>

          {/* Sidebar (Right) - Scores */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={6}
              className="glass-card p-6 rounded-2xl"
              data-reveal
            >
              <div className="text-center mb-6">
                <div className="text-sm text-base-500 mb-1">Total Score</div>
              <div className="text-6xl font-serif text-primary-400">
                <CountUpNumber value={isEmotional ? (emotionalUserScore?.total ?? 0) : (standardUserScore?.total ?? 0)} />
              </div>
              </div>
              <div className="h-px bg-white/10 my-6" />
              
              {!isEmotional && standardUserScore && standardAiScore && (
                <div className="-ml-4">
                  <RadarChart userScore={standardUserScore} aiScore={standardAiScore} />
                </div>
              )}
            </motion.div>

            {!isEmotional && standardUserScore && (
              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={7}
                className="p-6 rounded-2xl bg-base-900/30 border border-white/5 space-y-4"
                data-reveal
              >
                <ScoreRow label="论点质量" score={standardUserScore.argumentQuality} max={25} />
                <ScoreRow label="逻辑严密" score={standardUserScore.logic} max={25} />
                <ScoreRow label="反驳能力" score={standardUserScore.rebuttal} max={20} />
                <ScoreRow label="论据支撑" score={standardUserScore.evidence} max={15} />
                <ScoreRow label="表达风度" score={standardUserScore.expression} max={15} />
              </motion.div>
            )}

            {isEmotional && emotionalUserScore && (
              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={7}
                className="p-6 rounded-2xl bg-base-900/30 border border-white/5 space-y-4"
                data-reveal
              >
                <ScoreRow label="情绪化表达强度" score={emotionalUserScore.emotionIntensity} max={100} />
                <ScoreRow label="逻辑合理性" score={emotionalUserScore.logicReasoning} max={100} />
                <ScoreRow label="两者结合度" score={emotionalUserScore.blendQuality} max={100} />
              </motion.div>
            )}
          </div>
        </div>

        {/* Actions */}
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={8}
          className="mt-16 flex justify-center gap-4"
        >
          <button onClick={() => { reset(); navigate('/topic') }} className="btn-primary flex items-center gap-2 interactive-hover">
            <RotateCcw size={18} /> 再来一局
          </button>
          <Link to="/" className="btn-secondary flex items-center gap-2 interactive-hover">
            返回首页
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}

function ScoreRow({ label, score, max }: { label: string, score: number, max: number }) {
  const pct = useMemo(() => (score / max) * 100, [score, max])
  const animatedScore = useCountUp(score, 900)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-base-400">{label}</span>
        <span className="text-base-200 font-mono">{animatedScore}/{max}</span>
      </div>
      <div className="h-1 bg-base-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-primary-500"
        />
      </div>
    </div>
  )
}

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let rafId = 0
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * progress))
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      }
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])
  return value
}

function CountUpNumber({ value }: { value: number }) {
  const display = useCountUp(value, 1200)
  return <span>{display}</span>
}
