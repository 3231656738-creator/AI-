import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'
import DebatePage from './pages/DebatePage'
import ReportPage from './pages/ReportPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const location = useLocation()

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          } else {
            entry.target.classList.remove('is-visible')
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    )
    revealElements.forEach((el) => observer.observe(el))

    const parallaxElements = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'))
    let rafId = 0
    const updateParallax = () => {
      const scrollY = window.scrollY
      parallaxElements.forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0.12
        const elementTop = el.getBoundingClientRect().top + scrollY
        const offset = (elementTop - window.innerHeight * 0.5) * speed
        el.style.transform = `translate3d(0, ${-offset}px, 0)`
      })
      rafId = 0
    }
    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateParallax)
    }
    updateParallax()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateParallax)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateParallax)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/topic" element={<TopicPage />} />
          <Route path="/debate" element={<DebatePage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}
