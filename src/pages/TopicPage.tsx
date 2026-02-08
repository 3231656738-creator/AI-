import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Shuffle, X, ArrowRight, BookOpen, ChevronDown, Feather } from 'lucide-react'
import Header from '../components/Header'
import { topics } from '../data/topics'
import { useDebateStore } from '../store/debateStore'
import { useSettingsStore } from '../store/settingsStore'
import { Topic, Difficulty, DebateConfig, DEFAULT_CONFIG, DIFFICULTY_LABELS, TopicCategory, DebateMode } from '../types'

export default function TopicPage() {
  const navigate = useNavigate()
  const initDebate = useDebateStore((s) => s.initDebate)
  const setMode = useDebateStore((s) => s.setMode)
  const addCustomTopic = useDebateStore((s) => s.addCustomTopic)
  const customTopics = useDebateStore((s) => s.customTopics)
  const isConfigured = useSettingsStore((s) => s.isConfigured)

  const [selectedCategory, setSelectedCategory] = useState<TopicCategory | '全部'>('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [stance, setStance] = useState<'pro' | 'con' | 'random'>('pro')
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [config, setConfig] = useState<DebateConfig>(DEFAULT_CONFIG)
  const [mode, setLocalMode] = useState<DebateMode>('standard')
  const [showCustom, setShowCustom] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customClass, setCustomClass] = useState<TopicCategory>('严肃')

  const filteredTopics = useMemo(() => {
    const all = [...topics, ...customTopics]
    let result = all
    if (selectedCategory !== '全部') {
      result = result.filter((t) => t.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.proPosition.toLowerCase().includes(q) ||
          t.conPosition.toLowerCase().includes(q)
      )
    }
    return result
  }, [selectedCategory, searchQuery, customTopics])

  const handleRandomTopic = () => {
    const all = [...topics, ...customTopics]
    const pool = selectedCategory === '全部' ? all : all.filter((t) => t.category === selectedCategory)
    const random = pool[Math.floor(Math.random() * pool.length)]
    if (random) setSelectedTopic(random)
  }

  const handleStart = () => {
    if (!selectedTopic) return
    const finalStance = stance === 'random' ? (Math.random() > 0.5 ? 'pro' : 'con') : stance
    setMode(mode)
    initDebate(selectedTopic, finalStance, difficulty, config, mode)
    navigate('/debate')
  }

  const sensitiveWords = ['暴力', '仇恨', '违法', '涉黄', '恐怖', '极端']
  const isCustomValid = () => {
    const t = customTitle.trim()
    if (t.length < 4 || t.length > 50) return false
    return !sensitiveWords.some((w) => t.includes(w))
  }

  const handleAddCustomTopic = () => {
    if (!isCustomValid()) return
    const id = `custom-${Date.now()}`
    const title = customTitle.trim()
    const newTopic: Topic = {
      id,
      title,
      proPosition: `支持“${title}”`,
      conPosition: `反对“${title}”`,
      category: customClass,
      difficulty: 'medium',
    }
    addCustomTopic(newTopic)
    setSelectedTopic(newTopic)
    setShowCustom(false)
    setCustomTitle('')
  }

  const pageTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
  }

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageTransition} className="min-h-screen bg-base-950 text-base-100 pb-20">
      <div className="bg-grain" />
      <Header />

      <div className="max-w-6xl mx-auto px-6 pt-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-serif font-medium mb-3">选择辩题</h1>
            <p className="text-base-400 font-light">挑选话题并选择辩论模式</p>
          </motion.div>

          {/* Search */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="relative w-full md:w-80"
          >
            <input
              type="text"
              placeholder="搜索辩题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-base-900/50 border-b border-base-700 px-4 py-3 pl-10 text-sm input-base placeholder-base-600"
            />
            <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-base-500" />
          </motion.div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {(['standard', 'emotional'] as DebateMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setLocalMode(m)}
              className={`px-4 py-2 rounded-full text-sm transition-all interactive-hover ${
                mode === m
                  ? 'bg-primary-500 text-base-950'
                  : 'text-base-400 hover:text-base-200 hover:bg-white/5'
              }`}
            >
              {m === 'standard' ? '标准辩论' : '情绪辩论'}
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => setShowCustom(true)}
              className="text-sm text-primary-400 hover:text-primary-300 interactive-hover"
            >
              自定义话题
            </button>
          </div>
        </div>

        {/* Categories */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-10 pb-4 border-b border-white/5"
        >
          {['全部', '严肃', '娱乐'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-4 py-2 rounded-full text-sm transition-all duration-300 interactive-hover ${
                selectedCategory === cat
                  ? 'bg-base-100 text-base-950 font-medium'
                  : 'text-base-400 hover:text-base-200 hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={handleRandomTopic}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-primary-400 hover:text-primary-300 text-sm transition-colors interactive-hover"
          >
            <Shuffle size={14} />
            随机抽取
          </button>
        </motion.div>

        {/* Warning */}
        {!isConfigured() && (
          <div className="mb-8 p-4 bg-primary-900/10 border border-primary-500/20 rounded-lg text-primary-300 text-sm flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            请先前往设置页面配置 API 密钥以开始辩论。
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTopics.map((topic, i) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => setSelectedTopic(topic)}
              className="group cursor-pointer relative bg-base-900/40 border border-white/5 p-8 hover:border-primary-400/30 transition-all duration-500 hover:-translate-y-1 interactive-hover"
              data-reveal
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/0 to-transparent group-hover:via-primary-500/50 transition-all duration-700" />
              
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-mono text-base-500 uppercase tracking-wider">{topic.category}</span>
                <Feather size={16} className="text-base-700 group-hover:text-primary-400 transition-colors" />
              </div>

              <h3 className="text-xl font-serif font-medium text-base-200 mb-6 group-hover:text-primary-100 transition-colors line-clamp-2">
                {topic.title}
              </h3>

              <div className="space-y-3 text-sm font-light">
                <div className="flex gap-3">
                  <span className="text-primary-400/60 shrink-0 font-serif italic">正</span>
                  <span className="text-base-400 line-clamp-1 group-hover:text-base-300 transition-colors">{topic.proPosition}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-base-600 shrink-0 font-serif italic">反</span>
                  <span className="text-base-500 line-clamp-1 group-hover:text-base-400 transition-colors">{topic.conPosition}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedTopic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-base-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedTopic(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#1c1917] border border-white/10 shadow-2xl overflow-hidden relative"
            >
              {/* Decorative border line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 to-primary-300" />

              <div className="p-8 md:p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-xs font-mono text-primary-400 uppercase tracking-widest mb-2 block">Selected Topic</span>
                    <h2 className="text-3xl font-serif font-medium text-base-100">{selectedTopic.title}</h2>
                  </div>
                  <button onClick={() => setSelectedTopic(null)} className="text-base-500 hover:text-base-300 transition-colors interactive-hover">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  <div className="p-5 bg-base-900/50 border-l-2 border-primary-500/50">
                    <span className="text-xs text-primary-400 font-serif italic mb-2 block">Pro / 正方</span>
                    <p className="text-base-200">{selectedTopic.proPosition}</p>
                  </div>
                  <div className="p-5 bg-base-900/50 border-l-2 border-base-700">
                    <span className="text-xs text-base-500 font-serif italic mb-2 block">Con / 反方</span>
                    <p className="text-base-300">{selectedTopic.conPosition}</p>
                  </div>
                </div>

                {/* Configuration */}
                <div className="space-y-8">
                  {/* Stance */}
                  <div>
                    <label className="text-xs font-mono text-base-500 uppercase tracking-wider mb-3 block">Choose Your Side</label>
                    <div className="flex gap-4">
                      {(['pro', 'con', 'random'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStance(s)}
                          className={`flex-1 py-3 border transition-all duration-300 interactive-hover ${
                            stance === s
                              ? 'border-primary-500 bg-primary-500/10 text-primary-200'
                              : 'border-white/10 text-base-500 hover:border-white/20 hover:text-base-300'
                          }`}
                        >
                          {s === 'pro' ? '正方' : s === 'con' ? '反方' : '随机分配'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="text-xs font-mono text-base-500 uppercase tracking-wider mb-3 block">AI Level</label>
                    <div className="flex gap-4">
                      {(['beginner', 'intermediate', 'expert'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`flex-1 py-3 border transition-all duration-300 interactive-hover ${
                            difficulty === d
                              ? 'border-base-200 bg-base-200 text-base-950'
                              : 'border-white/10 text-base-500 hover:border-white/20 hover:text-base-300'
                          }`}
                        >
                          {DIFFICULTY_LABELS[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Advanced Toggle */}
                <div className="mt-8 pt-6 border-t border-white/5">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-xs text-base-500 hover:text-base-300 transition-colors interactive-hover"
                  >
                    <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    高级时间设置
                  </button>
                  
                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-4">
                          {([
                            { key: 'openingTime' as const, label: '开篇立论' },
                            { key: 'crossExamTime' as const, label: '攻辩质询' },
                            { key: 'freeDebateTime' as const, label: '自由辩论' },
                            { key: 'closingTime' as const, label: '总结陈词' },
                          ]).map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm text-base-400">{label}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={60}
                                  max={300}
                                  step={30}
                                  value={config[key]}
                                  onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })}
                                  className="w-24 accent-primary-500 h-1 bg-base-800 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-xs font-mono text-primary-400 w-8 text-right">
                                  {Math.floor(config[key] / 60)}m
                                </span>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-base-400">情绪辩论总时长</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={300}
                                max={900}
                                step={60}
                                value={config.emotionalTotalTime}
                                onChange={(e) => setConfig({ ...config, emotionalTotalTime: Number(e.target.value) })}
                                className="w-24 accent-primary-500 h-1 bg-base-800 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-xs font-mono text-primary-400 w-8 text-right">
                                {Math.floor(config.emotionalTotalTime / 60)}m
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer Action */}
              <div className="bg-base-900/50 p-6 flex justify-end">
                <button
                  onClick={handleStart}
                  className="btn-primary flex items-center gap-3 px-8 py-3 interactive-hover"
                >
                  <span className="font-serif">Enter Arena</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-base-950/90 backdrop-blur-xl flex items-center justify-center"
            onClick={() => setShowCustom(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-900/70 border border-white/10 p-8 rounded-2xl w-full max-w-lg"
            >
              <h3 className="text-lg font-serif text-base-200 mb-4">自定义话题</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-base-500">话题标题</label>
                  <input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="请输入话题，如“短视频平台利弊”"
                    className="w-full mt-2 bg-base-900/40 border border-white/10 px-3 py-2 text-sm input-base"
                  />
                  <div className="text-xs text-base-500 mt-1">4-50字符，自动生成正反立场</div>
                </div>
                <div>
                  <label className="text-xs text-base-500">话题类型</label>
                  <div className="mt-2 flex gap-2">
                    {(['严肃', '娱乐'] as TopicCategory[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCustomClass(c)}
                        className={`px-3 py-1 rounded-full text-xs interactive-hover ${
                          customClass === c ? 'bg-primary-500 text-base-950' : 'text-base-400 bg-white/5'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button className="text-sm text-base-400 interactive-hover" onClick={() => setShowCustom(false)}>取消</button>
                <button
                  onClick={handleAddCustomTopic}
                  disabled={!isCustomValid()}
                  className={`px-4 py-2 text-sm rounded-lg interactive-hover ${
                    isCustomValid() ? 'bg-primary-500 text-base-950' : 'bg-base-800 text-base-600'
                  }`}
                >
                  添加
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
