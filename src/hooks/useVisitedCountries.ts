import { useState, useEffect } from 'react'

const STORAGE_KEY = 'mapamundi-visited-countries'

export function useVisitedCountries() {
  const [visited, setVisited] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]))
    } catch {
      // localStorage no disponible
    }
  }, [visited])

  const toggleCountry = (isoNum: string) => {
    setVisited(prev => {
      const next = new Set(prev)
      if (next.has(isoNum)) {
        next.delete(isoNum)
      } else {
        next.add(isoNum)
      }
      return next
    })
  }

  const removeCountry = (isoNum: string) => {
    setVisited(prev => {
      const next = new Set(prev)
      next.delete(isoNum)
      return next
    })
  }

  const isVisited = (isoNum: string) => visited.has(isoNum)

  return { visited, toggleCountry, removeCountry, isVisited }
}
