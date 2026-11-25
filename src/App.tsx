import { useCallback } from 'react'
import WorldMap from './components/WorldMap'
import MenuBar from './components/MenuBar'
import { exportMapPDF } from './components/PDFExporter'
import { useVisitedCountries } from './hooks/useVisitedCountries'
import './App.css'

export default function App() {
  const { visited, toggleCountry, removeCountry } = useVisitedCountries()

  const handleCountryClick = useCallback((isoNum: string, name: string) => {
    toggleCountry(isoNum)
    // Feedback visual breve
    const msg = document.getElementById('toast')
    if (msg) {
      msg.textContent = visited.has(isoNum)
        ? `${name} eliminado de visitados`
        : `${name} marcado como visitado`
      msg.style.opacity = '1'
      setTimeout(() => { msg.style.opacity = '0' }, 2000)
    }
  }, [visited, toggleCountry])

  const handleExportPDF = useCallback(async () => {
    const svg = document.getElementById('world-map-svg') as SVGSVGElement | null
    if (!svg) return
    await exportMapPDF(svg, visited)
  }, [visited])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#1a2744' }}>
      <MenuBar
        visited={visited}
        onToggleCountry={toggleCountry}
        onRemoveCountry={removeCountry}
        onExportPDF={handleExportPDF}
      />
      <div style={{ paddingTop: '56px', height: '100%', boxSizing: 'border-box' }}>
        <WorldMap
          visited={visited}
          onCountryClick={handleCountryClick}
        />
      </div>
      {/* Toast de feedback */}
      <div
        id="toast"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,20,50,0.92)',
          color: '#fff',
          padding: '8px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: "'Crimson Text', Georgia, serif",
          border: '1px solid rgba(212,169,106,0.4)',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 2000,
          letterSpacing: '0.02em',
        }}
      />
    </div>
  )
}
