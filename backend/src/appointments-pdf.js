import PDFDocument from 'pdfkit'
import { fileURLToPath } from 'node:url'

const regularFont = fileURLToPath(new URL('./fonts/Arial.ttf', import.meta.url))
const boldFont = fileURLToPath(new URL('./fonts/Arial-Bold.ttf', import.meta.url))

export function createAppointmentsPdf(date, appointments) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true,
      info: { Title: `Muhammed Barber - ${date}`, Author: 'Muhammed Barber' } })
    const buffers = []
    doc.on('data', (chunk) => buffers.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)
    doc.registerFont('Regular', regularFont)
    doc.registerFont('Bold', boldFont)

    const margin = 40
    const width = doc.page.width - margin * 2
    const bottom = doc.page.height - 60
    const columns = [
      { label: 'Saat', width: 44 },
      { label: 'Müşteri', width: 120 },
      { label: 'Telefon', width: 100 },
      { label: 'Hizmet / ücret', width: 143 },
      { label: 'Not', width: width - 407 },
    ]
    const dateLabel = new Date(`${date}T12:00:00+03:00`).toLocaleDateString('tr-TR', {
      timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric',
    })
    let y

    function drawHeader() {
      doc.font('Bold').fontSize(14).fillColor('#222222').text('Muhammed Barber', margin, 40)
      doc.font('Regular').fontSize(10).fillColor('#666666')
        .text(`${dateLabel}  /  ${appointments.length} randevu`, margin, 64)
      y = 100
      let x = margin
      columns.forEach((column) => {
        doc.font('Bold').fontSize(9).fillColor('#555555').text(column.label, x, y, { lineBreak: false })
        x += column.width
      })
      y += 20
      doc.moveTo(margin, y).lineTo(margin + width, y).lineWidth(.6).strokeColor('#bdbdbd').stroke()
    }

    function wrap(value, availableWidth) {
      doc.font('Regular').fontSize(9)
      const result = []
      for (const paragraph of String(value || '-').split(/\r?\n/)) {
        let line = ''
        for (const character of paragraph) {
          if (line && doc.widthOfString(line + character) > availableWidth) {
            const space = line.lastIndexOf(' ')
            if (space > 0) {
              result.push(line.slice(0, space))
              line = line.slice(space + 1)
            } else { result.push(line); line = '' }
          }
          line += character
        }
        result.push(line.trim())
      }
      return result
    }

    drawHeader()
    const sorted = [...appointments].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
    for (const item of sorted) {
      const values = [item.time, item.customerName, item.customerPhone,
        [item.serviceName, item.servicePrice].filter(Boolean).join(' / '), item.customerNote]
      const lines = values.map((value, index) => wrap(value, columns[index].width - 10))
      const lineCount = Math.max(...lines.map((cell) => cell.length))
      let offset = 0
      while (offset < lineCount) {
        if (y + 33 > bottom) { doc.addPage(); drawHeader() }
        const count = Math.min(lineCount - offset, Math.floor((bottom - y - 20) / 13))
        // Move ordinary rows intact to the next page; split only oversized rows.
        if (offset === 0 && count < lineCount && lineCount * 13 + 20 <= bottom - 120) {
          doc.addPage(); drawHeader(); continue
        }
        let x = margin
        lines.forEach((cell, index) => {
          doc.font('Regular').fontSize(9).fillColor('#222222')
          const visibleLines = offset > 0 && index < 4 && cell.length <= offset ? [cell[0]] : cell.slice(offset, offset + count)
          visibleLines.forEach((line, lineIndex) =>
            doc.text(line, x, y + 10 + lineIndex * 13, { lineBreak: false }),
          )
          x += columns[index].width
        })
        y += count * 13 + 20
        doc.moveTo(margin, y).lineTo(margin + width, y).lineWidth(.35).strokeColor('#e0e0e0').stroke()
        offset += count
      }
    }
    if (!appointments.length) {
      doc.font('Regular').fontSize(10).fillColor('#666666').text('Bu tarihte randevu bulunmuyor.', margin, y + 20)
    }
    const range = doc.bufferedPageRange()
    for (let page = 0; page < range.count; page++) {
      doc.switchToPage(page)
      doc.font('Regular').fontSize(8).fillColor('#888888').text(`${page + 1} / ${range.count}`,
        margin, doc.page.height - 52, { width, align: 'right', lineBreak: false })
    }
    doc.end()
  })
}
