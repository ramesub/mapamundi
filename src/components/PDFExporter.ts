import jsPDF from 'jspdf'
import countriesEs from '../data/countries-es.json'

const TOTAL_COUNTRIES = 195

async function svgToCanvas(svgElement: SVGSVGElement, scale: number): Promise<HTMLCanvasElement> {
  const width = svgElement.clientWidth || window.innerWidth
  const height = svgElement.clientHeight || window.innerHeight

  // Clone and set explicit dimensions so the browser renders at full size
  // when the SVG is loaded as a standalone image (no CSS context)
  const clone = svgElement.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }

  const svgStr = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1a2744'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)

  return canvas
}

export async function exportMapPDF(
  svgElement: SVGSVGElement,
  visited: Set<string>
): Promise<void> {
  const canvas = await svgToCanvas(svgElement, 2)
  const imgData = canvas.toDataURL('image/png', 1.0)

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  pdf.setFillColor(26, 39, 68)
  pdf.rect(0, 0, pageW, pageH, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('Mapamundi en Moto', pageW / 2, 14, { align: 'center' })

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(180, 180, 180)
  pdf.text(dateStr, pageW / 2, 20, { align: 'center' })

  const pct = ((visited.size / TOTAL_COUNTRIES) * 100).toFixed(1)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(212, 169, 106)
  pdf.text(
    `${visited.size} ${visited.size === 1 ? 'país visitado' : 'países visitados'} en moto — ${pct}% del mundo`,
    pageW / 2,
    26,
    { align: 'center' }
  )

  const mapY = 30
  const availW = pageW - 20
  const availH = pageH - mapY - 10
  const imgAspect = canvas.width / canvas.height
  const boxAspect = availW / availH
  let mapW: number, mapH: number
  if (imgAspect > boxAspect) {
    mapW = availW
    mapH = availW / imgAspect
  } else {
    mapH = availH
    mapW = availH * imgAspect
  }
  const mapX = (pageW - mapW) / 2
  const mapYFinal = mapY + (availH - mapH) / 2

  pdf.addImage(imgData, 'PNG', mapX, mapYFinal, mapW, mapH)

  pdf.setDrawColor(255, 255, 255)
  pdf.setLineWidth(0.2)
  pdf.setGState(pdf.GState({ opacity: 0.2 }))
  pdf.rect(mapX, mapYFinal, mapW, mapH)
  pdf.setGState(pdf.GState({ opacity: 1 }))

  if (visited.size > 0) {
    pdf.addPage('a4', 'landscape')
    pdf.setFillColor(26, 39, 68)
    pdf.rect(0, 0, pageW, pageH, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(212, 169, 106)
    pdf.text('Países visitados en moto', pageW / 2, 16, { align: 'center' })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(180, 180, 180)
    pdf.text(`${visited.size} de ${TOTAL_COUNTRIES} países — ${pct}% del mundo`, pageW / 2, 22, { align: 'center' })

    const names = [...visited]
      .map(iso => (countriesEs as Record<string, string>)[iso] ?? iso)
      .sort((a, b) => a.localeCompare(b, 'es'))

    const cols = 3
    const colW = (pageW - 40) / cols
    const lineH = 7
    const startY = 32

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)

    const entriesPerPage = Math.floor((pageH - 15 - startY) / lineH) * cols

    names.forEach((name, i) => {
      const posInPage = i % entriesPerPage
      const col = posInPage % cols
      const row = Math.floor(posInPage / cols)
      const x = 20 + col * colW
      const y = startY + row * lineH

      if (i > 0 && posInPage === 0) {
        pdf.addPage('a4', 'landscape')
        pdf.setFillColor(26, 39, 68)
        pdf.rect(0, 0, pageW, pageH, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(14)
        pdf.setTextColor(212, 169, 106)
        pdf.text('Países visitados en moto', pageW / 2, 16, { align: 'center' })
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(180, 180, 180)
        pdf.text(`${visited.size} de ${TOTAL_COUNTRIES} países — ${pct}% del mundo`, pageW / 2, 22, { align: 'center' })
        pdf.setFontSize(9)
      }

      pdf.setFillColor(212, 169, 106)
      pdf.circle(x + 1.5, y - 1, 1, 'F')
      pdf.setTextColor(220, 220, 220)
      pdf.text(name, x + 6, y)
    })

    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text(`Generado el ${dateStr} · Mapamundi en Moto`, pageW / 2, pageH - 6, { align: 'center' })
  }

  pdf.save(`mapamundi-moto-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`)
}
