import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import countriesEs from '../data/countries-es.json'

interface WorldMapProps {
  visited: Set<string>
  onCountryClick: (isoNum: string, name: string) => void
}

const COLORS = {
  background: '#1a2744',
  ocean: '#0d1b35',
  country: '#2d4a7a',
  countryHover: '#3d5f9a',
  border: 'rgba(255,255,255,0.25)',
  borderHover: 'rgba(255,255,255,0.7)',
  visitedFill: '#D4A96A',
  labelDefault: 'rgba(255,255,255,0.7)',
  labelVisited: '#3d2200',
}

type CountryFeature = GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, { name: string }>

export default function WorldMap({ visited, onCountryClick }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [hoveredIso, setHoveredIso] = useState<string | null>(null)
  const [topoData, setTopoData] = useState<CountryFeature[] | null>(null)
  const projectionRef = useRef<d3.GeoProjection | null>(null)
  const pathRef = useRef<d3.GeoPath | null>(null)

  // Cargar datos GeoJSON
  useEffect(() => {
    import('world-atlas/countries-110m.json').then((module) => {
      const topo = module.default as unknown as Topology<{ countries: GeometryCollection }>
      const countries = feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection
      setTopoData(countries.features as CountryFeature[])
    })
  }, [])

  const getName = useCallback((isoNum: string): string => {
    return (countriesEs as Record<string, string>)[isoNum] ?? ''
  }, [])

  // Renderizar mapa
  useEffect(() => {
    if (!topoData || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth || window.innerWidth
    const height = svgRef.current.clientHeight || window.innerHeight

    svg.selectAll('*').remove()

    const projection = d3.geoNaturalEarth1()
      .fitSize([width, height], { type: 'Sphere' } as GeoJSON.GeoJsonObject)
    projectionRef.current = projection

    const path = d3.geoPath(projection)
    pathRef.current = path

    // Fondo océano
    svg.append('path')
      .datum({ type: 'Sphere' } as GeoJSON.GeoJsonObject)
      .attr('d', path as unknown as string)
      .attr('fill', COLORS.ocean)

    // Patrón de rayas diagonales para países visitados
    const defs = svg.append('defs')
    defs.append('pattern')
      .attr('id', 'visited-hatch')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8)
      .attr('height', 8)
      .attr('patternTransform', 'rotate(45)')
      .append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', 8)
      .attr('stroke', 'rgba(0,0,0,0.18)')
      .attr('stroke-width', 3)

    // Grupo de países
    const g = svg.append('g').attr('class', 'countries')

    topoData.forEach((feature) => {
      const isoNum = String(feature.id ?? '').padStart(3, '0')
      const name = getName(isoNum)
      const isVisited = visited.has(isoNum)
      const centroid = path.centroid(feature)

      // Path del país
      const countryPath = g.append('path')
        .datum(feature)
        .attr('d', path as unknown as string)
        .attr('fill', isVisited ? COLORS.visitedFill : COLORS.country)
        .attr('stroke', COLORS.border)
        .attr('stroke-width', 0.5)
        .attr('cursor', 'pointer')
        .attr('data-iso', isoNum)
        .style('transition', 'fill 0.2s ease')

      if (isVisited) {
        // Overlay de rayas sobre el color arena
        g.append('path')
          .datum(feature)
          .attr('d', path as unknown as string)
          .attr('fill', 'url(#visited-hatch)')
          .attr('pointer-events', 'none')
          .attr('data-hatch', isoNum)
      }

      // Etiqueta del país (solo si tiene centroide válido y nombre)
      if (name && !isNaN(centroid[0]) && !isNaN(centroid[1])) {
        const bounds = path.bounds(feature)
        const bboxWidth = bounds[1][0] - bounds[0][0]
        const bboxHeight = bounds[1][1] - bounds[0][1]
        const minDim = Math.min(bboxWidth, bboxHeight)

        // Mostrar etiqueta solo si el país tiene cierto tamaño
        const showLabel = minDim > 18 || bboxWidth > 30

        if (showLabel) {
          g.append('text')
            .attr('class', 'country-label')
            .attr('x', centroid[0])
            .attr('y', centroid[1])
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', isVisited ? COLORS.labelVisited : COLORS.labelDefault)
            .attr('font-size', '9px')
            .attr('font-family', "'Crimson Text', 'Georgia', serif")
            .attr('font-weight', isVisited ? '700' : '400')
            .attr('pointer-events', 'none')
            .attr('data-label', isoNum)
            .style('transition', 'transform 0.15s ease, font-size 0.15s ease')
            .text(name)
        }
      }

      // Eventos hover
      countryPath
        .on('mouseenter', function (event: MouseEvent) {
          setHoveredIso(isoNum)
          d3.select(this)
            .attr('fill', isVisited ? '#e8b97a' : COLORS.countryHover)
            .attr('stroke', COLORS.borderHover)
            .attr('stroke-width', 1)
            .raise()

          // Zoom de etiqueta
          svg.select(`[data-label="${isoNum}"]`)
            .attr('font-size', '13px')
            .attr('font-weight', '600')
            .attr('fill', isVisited ? COLORS.labelVisited : '#fff')

          // Tooltip para países pequeños
          if (tooltipRef.current && name) {
            tooltipRef.current.textContent = name
            tooltipRef.current.style.display = 'block'
            tooltipRef.current.style.left = `${event.clientX + 12}px`
            tooltipRef.current.style.top = `${event.clientY - 28}px`
          }
        })
        .on('mousemove', function (event: MouseEvent) {
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${event.clientX + 12}px`
            tooltipRef.current.style.top = `${event.clientY - 28}px`
          }
        })
        .on('mouseleave', function () {
          setHoveredIso(null)
          d3.select(this)
            .attr('fill', isVisited ? COLORS.visitedFill : COLORS.country)
            .attr('stroke', COLORS.border)
            .attr('stroke-width', 0.5)

          svg.select(`[data-label="${isoNum}"]`)
            .attr('font-size', '9px')
            .attr('font-weight', isVisited ? '700' : '400')
            .attr('fill', isVisited ? COLORS.labelVisited : COLORS.labelDefault)

          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none'
          }
        })
        .on('click', function () {
          if (name) onCountryClick(isoNum, name)
        })
    })

    // Graticule (líneas de latitud/longitud)
    const graticule = d3.geoGraticule()()
    svg.append('path')
      .datum(graticule)
      .attr('d', path as unknown as string)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.05)')
      .attr('stroke-width', 0.4)

    // Borde del globo
    svg.append('path')
      .datum({ type: 'Sphere' } as GeoJSON.GeoJsonObject)
      .attr('d', path as unknown as string)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.15)')
      .attr('stroke-width', 0.8)

  }, [topoData, visited, getName, onCountryClick])

  // Redimensionar al cambiar tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      if (!topoData || !svgRef.current) return
      const svg = d3.select(svgRef.current)
      const width = svgRef.current.clientWidth
      const height = svgRef.current.clientHeight
      const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' } as GeoJSON.GeoJsonObject)
      const path = d3.geoPath(projection)
      svg.selectAll('path').attr('d', (d) => path(d as GeoJSON.GeoJsonObject) ?? '')
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [topoData])

  return (
    <>
      <svg
        ref={svgRef}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
          background: COLORS.background,
        }}
      />
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          display: 'none',
          background: 'rgba(10,20,50,0.92)',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: "'Crimson Text', Georgia, serif",
          letterSpacing: '0.03em',
          pointerEvents: 'none',
          zIndex: 1000,
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      />
    </>
  )
}
