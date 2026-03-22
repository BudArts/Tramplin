import { useRef, useState, useCallback } from 'react'

export function useScrollToSection() {
  const [activeSection, setActiveSection] = useState('map')
  const sectionRefs = useRef({})

  const registerRef = useCallback((id, el) => {
    if (el) sectionRefs.current[id] = el
  }, [])

  const scrollToSection = useCallback((sectionId) => {
    setActiveSection(sectionId)
    const el = sectionRefs.current[sectionId]
    if (el) {
      const offset = 72 + 115 // header + nav
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  return { activeSection, registerRef, scrollToSection }
}