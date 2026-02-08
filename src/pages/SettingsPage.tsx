import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Save, RotateCcw, ExternalLink, CheckCircle } from 'lucide-react'
import Header from '../components/Header'
import { useSettingsStore } from '../store/settingsStore'

export default function SettingsPage() {
  const settings = useSettingsStore()
  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  const toggleKeyVisibility = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <div className="max-w-2xl mx-auto px-6 pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">设置</h1>
          <p className="text-slate-400 mb-8">配置 API 密钥和语音偏好</p>
        </motion.div>

        {/* AI 辩手配置 - 豆包 */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 mb-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center text-orange-400 text-lg font-bold border border-orange-500/20">
              豆
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">豆包 (Doubao) — AI 辩手</h2>
              <p className="text-sm text-slate-500">火山引擎 ARK 平台</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">API Key</label>
              <div className="relative">
                <input
                  type={showKeys['doubao'] ? 'text' : 'password'}
                  value={settings.doubaoApiKey}
                  onChange={(e) => settings.updateSettings({ doubaoApiKey: e.target.value })}
                  placeholder="输入豆包 API Key..."
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-800/60 border border-slate-700/30 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                />
                <button
                  onClick={() => toggleKeyVisibility('doubao')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showKeys['doubao'] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">模型 ID (Endpoint ID)</label>
              <input
                type="text"
                value={settings.doubaoModelId}
                onChange={(e) => settings.updateSettings({ doubaoModelId: e.target.value })}
                placeholder="例如: ep-2024xxxx-xxxxx"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500/30"
              />
            </div>

            <a
              href="https://console.volcengine.com/ark"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-gold-400 transition-colors"
            >
              前往火山引擎 ARK 平台获取
              <ExternalLink size={13} />
            </a>
          </div>
        </motion.section>

        {/* AI 裁判配置 - DeepSeek */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 mb-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-blue-400 text-lg font-bold border border-blue-500/20">
              D
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">DeepSeek — AI 裁判</h2>
              <p className="text-sm text-slate-500">独立评判辩论结果</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">API Key</label>
              <div className="relative">
                <input
                  type={showKeys['deepseek'] ? 'text' : 'password'}
                  value={settings.deepseekApiKey}
                  onChange={(e) => settings.updateSettings({ deepseekApiKey: e.target.value })}
                  placeholder="输入 DeepSeek API Key..."
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-800/60 border border-slate-700/30 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                />
                <button
                  onClick={() => toggleKeyVisibility('deepseek')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showKeys['deepseek'] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-gold-400 transition-colors"
            >
              前往 DeepSeek 平台获取
              <ExternalLink size={13} />
            </a>
          </div>
        </motion.section>

        {/* 语音设置 */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 mb-8"
        >
          <h2 className="font-semibold text-slate-100 mb-5">语音设置</h2>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200">启用语音输入</p>
                <p className="text-xs text-slate-500">使用麦克风进行语音识别</p>
              </div>
              <button
                onClick={() => settings.updateSettings({ voiceEnabled: !settings.voiceEnabled })}
                className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
                  settings.voiceEnabled ? 'bg-gold-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    settings.voiceEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200">启用语音播放</p>
                <p className="text-xs text-slate-500">AI 发言时自动语音播报</p>
              </div>
              <button
                onClick={() => settings.updateSettings({ ttsEnabled: !settings.ttsEnabled })}
                className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
                  settings.ttsEnabled ? 'bg-gold-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    settings.ttsEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-200">语音速度</span>
                <span className="text-sm text-gold-400">{settings.voiceSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.voiceSpeed}
                onChange={(e) => settings.updateSettings({ voiceSpeed: Number(e.target.value) })}
                className="w-full accent-gold-500"
              />
            </div>
          </div>
        </motion.section>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3"
        >
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-slate-950 font-medium"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? '已保存' : '保存设置'}
          </button>
          <button
            onClick={() => {
              settings.resetSettings()
            }}
            className="btn-secondary flex items-center gap-2 px-6 py-2.5 rounded-xl text-slate-300"
          >
            <RotateCcw size={16} />
            重置
          </button>
        </motion.div>
      </div>
    </div>
  )
}
