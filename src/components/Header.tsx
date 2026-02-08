import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Swords, Home, Settings } from 'lucide-react'

export default function Header() {
  const location = useLocation()
  const isDebatePage = location.pathname === '/debate'

  if (isDebatePage) return null

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-6"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 flex items-center justify-center border border-white/10 rounded-full bg-base-900/50 backdrop-blur-md group-hover:border-primary-400/30 transition-colors">
            <Swords size={18} className="text-primary-400" />
          </div>
          <span className="text-lg font-serif font-medium tracking-wide text-base-200 group-hover:text-primary-300 transition-colors">
            AI 辩论练习
          </span>
        </Link>

        <nav className="flex items-center gap-2 p-1.5 rounded-full bg-base-900/50 backdrop-blur-md border border-white/5">
          <NavLink to="/" icon={<Home size={16} />} label="首页" active={location.pathname === '/'} />
          <NavLink to="/settings" icon={<Settings size={16} />} label="设置" active={location.pathname === '/settings'} />
        </nav>
      </div>
    </motion.header>
  )
}

function NavLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm transition-all duration-300 ${
        active
          ? 'bg-white/10 text-primary-200 shadow-sm'
          : 'text-base-400 hover:text-base-200 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  )
}
