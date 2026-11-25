import { useState, useRef, useEffect } from 'react'
import countriesEs from '../data/countries-es.json'

interface MenuBarProps {
  visited: Set<string>
  onToggleCountry: (isoNum: string, name: string) => void
  onRemoveCountry: (isoNum: string) => void
  onExportPDF: () => void
}

const ALL_COUNTRIES = Object.entries(countriesEs as Record<string, string>)
  .map(([iso, name]) => ({ iso, name }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))

export default function MenuBar({ visited, onToggleCountry, onRemoveCountry, onExportPDF }: MenuBarProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filtered = query.length > 0
    ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : []

  const visitedList = ALL_COUNTRIES.filter(c => visited.has(c.iso))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (iso: string, name: string) => {
    onToggleCountry(iso, name)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div style={styles.bar}>
      {/* Logo / título */}
      <div style={styles.title}>
        <span style={styles.titleText}>Mapamundi</span>
        <span style={styles.titleSub}>en moto</span>
      </div>

      {/* Buscador de países */}
      <div ref={dropdownRef} style={styles.searchWrap}>
        <div style={styles.searchBox}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder="Añadir país visitado…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => query && setOpen(true)}
          />
        </div>
        {open && filtered.length > 0 && (
          <div style={styles.dropdown}>
            {filtered.map(({ iso, name }) => (
              <div
                key={iso}
                style={{
                  ...styles.dropdownItem,
                  ...(visited.has(iso) ? styles.dropdownItemVisited : {}),
                }}
                onMouseDown={() => handleSelect(iso, name)}
              >
                <span>{name}</span>
                {visited.has(iso) && (
                  <span style={styles.visitedBadge}>✓ visitado</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contador de visitados */}
      <button
        style={styles.counterBtn}
        onClick={() => setPanelOpen(p => !p)}
        title="Ver países visitados"
      >
        <span style={styles.counterNum}>{visited.size}</span>
        <span style={styles.counterLabel}>
          país{visited.size !== 1 ? 'es' : ''} visitado{visited.size !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Botón PDF */}
      <button style={styles.pdfBtn} onClick={onExportPDF} title="Exportar mapa como PDF">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        Exportar PDF
      </button>

      {/* Panel lateral de países visitados */}
      {panelOpen && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span>Países visitados en moto</span>
            <button style={styles.closeBtn} onClick={() => setPanelOpen(false)}>✕</button>
          </div>
          {visitedList.length === 0 ? (
            <p style={styles.panelEmpty}>Aún no has marcado ningún país.<br />Búscalos arriba o haz clic en el mapa.</p>
          ) : (
            <ul style={styles.panelList}>
              {visitedList.map(({ iso, name }) => (
                <li key={iso} style={styles.panelItem}>
                  <span>{name}</span>
                  <button
                    style={styles.removeBtn}
                    onClick={() => onRemoveCountry(iso)}
                    title="Quitar"
                  >✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '0 24px',
    background: 'rgba(13,27,53,0.88)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    zIndex: 500,
    fontFamily: "'Crimson Text', Georgia, serif",
  },
  title: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    flexShrink: 0,
  },
  titleText: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
  titleSub: {
    color: '#D4A96A',
    fontSize: '13px',
    fontStyle: 'italic',
    letterSpacing: '0.04em',
  },
  searchWrap: {
    position: 'relative',
    flex: 1,
    maxWidth: '340px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '0 12px',
    height: '36px',
  },
  input: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Crimson Text', Georgia, serif",
    width: '100%',
    letterSpacing: '0.01em',
  },
  dropdown: {
    position: 'absolute',
    top: '42px',
    left: 0,
    right: 0,
    background: '#0d1b35',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  dropdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '9px 14px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '14px',
    fontFamily: "'Crimson Text', Georgia, serif",
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  dropdownItemVisited: {
    background: 'rgba(212,169,106,0.1)',
  },
  visitedBadge: {
    fontSize: '11px',
    color: '#D4A96A',
    letterSpacing: '0.03em',
  },
  counterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '0 14px',
    height: '36px',
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: "'Crimson Text', Georgia, serif",
  },
  counterNum: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#D4A96A',
    lineHeight: 1,
  },
  counterLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.02em',
  },
  pdfBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    background: 'rgba(212,169,106,0.15)',
    border: '1px solid rgba(212,169,106,0.4)',
    borderRadius: '8px',
    padding: '0 16px',
    height: '36px',
    color: '#D4A96A',
    cursor: 'pointer',
    flexShrink: 0,
    fontSize: '14px',
    fontFamily: "'Crimson Text', Georgia, serif",
    letterSpacing: '0.02em',
    transition: 'background 0.2s',
  },
  panel: {
    position: 'fixed',
    top: '64px',
    right: '16px',
    width: '280px',
    maxHeight: '70vh',
    background: '#0d1b35',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    zIndex: 600,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Crimson Text', Georgia, serif",
    fontWeight: '600',
    letterSpacing: '0.02em',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 4px',
  },
  panelEmpty: {
    padding: '20px 16px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    fontFamily: "'Crimson Text', Georgia, serif",
    lineHeight: 1.6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  panelList: {
    listStyle: 'none',
    margin: 0,
    padding: '8px 0',
    overflowY: 'auto',
    flex: 1,
  },
  panelItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 16px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
    fontFamily: "'Crimson Text', Georgia, serif",
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'color 0.15s',
  },
}
