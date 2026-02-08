import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Swords, Mic, Trophy, Brain, ArrowRight, Quote } from 'lucide-react'
import Header from '../components/Header'
import { useDebateStore } from '../store/debateStore'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 1, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function HomePage() {
  const navigate = useNavigate()
  const setMode = useDebateStore((s) => s.setMode)

  const handleStart = (mode: 'standard' | 'emotional') => {
    setMode(mode)
    navigate('/topic')
  }

  return (
    <div className="min-h-screen bg-base-950 text-base-100 selection:bg-primary-500/30">
      <div className="bg-grain" />
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 pt-20">
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 z-10"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-8 flex items-center gap-3">
              <span className="h-px w-12 bg-primary-400/50"></span>
              <span className="text-primary-400 font-mono text-sm tracking-widest uppercase">AI Debate Arena</span>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-7xl lg:text-8xl font-serif font-medium leading-[1.1] mb-8 text-base-100">
              思维的 <br />
              <span className="text-gradient-gold italic">艺术与交锋</span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-base-400 max-w-xl leading-relaxed mb-12 font-light">
              在这里，没有冰冷的机器，只有思想的共鸣。与 AI 辩手展开一场深度对话，在逻辑的碰撞中寻找真理的火花。
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-5">
              <button onClick={() => handleStart('standard')} className="btn-primary group">
                <span className="flex items-center gap-2">
                  标准辩论
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button onClick={() => handleStart('emotional')} className="btn-secondary group">
                <span className="flex items-center gap-2">
                  情绪辩论
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <Link to="/settings" className="btn-secondary">
                配置 API
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Visual (Abstract Art) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="lg:col-span-5 relative h-[500px] hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-radial from-primary-900/20 to-transparent opacity-50 blur-3xl" />
            
            {/* Abstract Cards */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 right-10 w-64 h-80 glass-card rounded-2xl p-6 border-l-4 border-l-primary-400/50 z-20"
            >
              <Quote size={32} className="text-primary-400/40 mb-4" />
              <p className="font-serif text-xl text-base-200 leading-relaxed">
                "真理越辩越明，逻辑在交锋中升华。"
              </p>
              <div className="absolute bottom-6 left-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-base-800 flex items-center justify-center">
                  <Brain size={14} className="text-base-400" />
                </div>
                <span className="text-xs text-base-500 font-mono">AI DEBATER</span>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-20 left-0 w-60 h-72 glass-card rounded-2xl p-6 z-10 bg-base-900/80"
            >
              <div className="h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-2 w-1/3 bg-base-700/50 rounded-full" />
                  <div className="h-2 w-full bg-base-700/30 rounded-full" />
                  <div className="h-2 w-5/6 bg-base-700/30 rounded-full" />
                  <div className="h-2 w-4/5 bg-base-700/30 rounded-full" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-3xl font-serif text-primary-400">92</div>
                    <div className="text-xs text-base-500 uppercase tracking-wider">Score</div>
                  </div>
                  <Trophy size={24} className="text-base-700" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain size={28} />,
                title: '双模型架构',
                desc: '豆包负责辩论，DeepSeek 负责评判。两个独立的大脑，确保每一次交锋都公平、深刻。'
              },
              {
                icon: <Mic size={28} />,
                title: '沉浸式语音',
                desc: '告别键盘，用声音传递力量。实时语音识别与合成，还原最真实的辩论现场感。'
              },
              {
                icon: <Trophy size={28} />,
                title: '多维评判',
                desc: '不仅仅是输赢。从逻辑、论据、反驳到风度，全方位解析你的辩论表现。'
              }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.8 }}
                className="group p-8 border border-white/5 hover:border-primary-400/20 rounded-2xl transition-colors duration-500 bg-white/[0.01] hover:bg-white/[0.03]"
              >
                <div className="mb-6 text-base-500 group-hover:text-primary-400 transition-colors duration-500">
                  {f.icon}
                </div>
                <h3 className="text-xl font-serif font-medium text-base-200 mb-4">{f.title}</h3>
                <p className="text-base-400 leading-relaxed font-light">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-base-600 font-mono text-xs tracking-widest uppercase">
          Designed for Critical Thinking
        </p>
      </footer>
    </div>
  )
}
