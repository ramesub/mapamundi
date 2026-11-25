import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import countriesEs from '../data/countries-es.json'

const TOTAL_COUNTRIES = 195

export async function exportMapPDF(
  svgElement: SVGSVGElement,
  visited: Set<string>
): Promise<void> {
  // Capturar el SVG como imagen de alta resolución
  const canvas = await html2canvas(svgElement as unknown as HTMLElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#1a2744',
    width: svgElement.clientWidth,
    height: svgElement.clientHeight,
  })

  const imgData = canvas.toDataURL('image/png', 1.0)

  // Crear PDF A4 horizontal
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = pdf.internal.pageSize.getWidth()   // 297mm
  const pageH = pdf.internal.pageSize.getHeight()  // 210mm

  // Fondo oscuro
  pdf.setFillColor(26, 39, 68)
  pdf.rect(0, 0, pageW, pageH, 'F')

  // --- Cabecera ---
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('Mapamundi en Moto', pageW / 2, 14, { align: 'center' })

  // Fecha
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

  // Contador
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

  // --- Mapa ---
  const mapY = 30
  const mapH = pageH - mapY - 10
  const mapW = Math.min(pageW - 20, (mapH * canvas.width) / canvas.height)
  const mapX = (pageW - mapW) / 2

  pdf.addImage(imgData, 'PNG', mapX, mapY, mapW, mapH)

  // Borde del mapa
  pdf.setDrawColor(255, 255, 255)
  pdf.setLineWidth(0.2)
  pdf.setGState(pdf.GState({ opacity: 0.2 }))
  pdf.rect(mapX, mapY, mapW, mapH)
  pdf.setGState(pdf.GState({ opacity: 1 }))

  // --- Lista de países visitados en página 2 (si hay alguno) ---
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

    // 3 columnas
    const cols = 3
    const colW = (pageW - 40) / cols
    const lineH = 7
    const startY = 32

    pdf.setTextColor(220, 220, 220)
    pdf.setFontSize(9)

    names.forEach((name, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = 20 + col * colW
      const y = startY + row * lineH

      if (y < pageH - 15) {
        // Punto decorativo arena
        pdf.setFillColor(212, 169, 106)
        pdf.circle(x + 1.5, y - 1, 1, 'F')
        pdf.setTextColor(220, 220, 220)
        pdf.text(name, x + 6, y)
      }
    })

    // Pie de página
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text(`Generado el ${dateStr} · Mapamundi en Moto`, pageW / 2, pageH - 6, { align: 'center' })
  }

  pdf.save(`mapamundi-moto-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`)
}
