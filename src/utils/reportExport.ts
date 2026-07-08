import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { exportToCsv } from '@/utils/format'

export interface ReportTableSection {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatGeneratedAt(locale: string): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CM' : 'en-CM', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())
}

function buildReportDocumentHtml(options: {
  title: string
  subtitle?: string
  locale: string
  sections: ReportTableSection[]
}): string {
  const { title, subtitle, locale, sections } = options
  const generatedLabel = locale === 'fr' ? 'Généré le' : 'Generated on'
  const generated = formatGeneratedAt(locale)

  const sectionHtml = sections
    .map(
      (section) => `
    <section style="margin-bottom:20px;">
      <h2 style="font-size:13px;margin:0 0 8px;color:#1e3a5f;">${escapeHtml(section.title)}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr>${section.headers.map((h) => `<th style="border:1px solid #ccc;padding:6px 8px;background:#eef2f7;text-align:left;">${escapeHtml(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${section.rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td style="border:1px solid #ccc;padding:6px 8px;">${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`
            )
            .join('')}
        </tbody>
      </table>
    </section>`
    )
    .join('')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:Calibri,Arial,sans-serif;color:#111;padding:24px;">
  <h1 style="font-size:18px;margin:0 0 4px;">${escapeHtml(title)}</h1>
  ${subtitle ? `<p style="color:#555;font-size:12px;margin:0 0 4px;">${escapeHtml(subtitle)}</p>` : ''}
  <p style="color:#555;font-size:11px;margin:0 0 20px;">${generatedLabel} ${escapeHtml(generated)}</p>
  ${sectionHtml}
</body>
</html>`
}

/** Combined sections into one CSV file (section title row + header + data). */
export function exportReportCsv(sections: ReportTableSection[], filename: string): void {
  const lines: string[] = []
  for (const section of sections) {
    if (section.rows.length === 0) continue
    lines.push(`"${section.title.replace(/"/g, '""')}"`)
    lines.push(section.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','))
    for (const row of section.rows) {
      lines.push(
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
    }
    lines.push('')
  }
  if (lines.length === 0) return
  downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), filename)
}

/** Single flat table CSV (first section only, or use exportReportCsv for multi). */
export function exportSingleTableCsv(
  rows: Record<string, unknown>[],
  filename: string,
  columns: { key: string; header: string }[]
): void {
  exportToCsv(rows, filename, columns as { key: keyof Record<string, unknown>; header: string }[])
}

export function exportReportWord(options: {
  title: string
  subtitle?: string
  locale: string
  sections: ReportTableSection[]
  filename: string
}): void {
  const html = buildReportDocumentHtml(options)
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  })
  const name = options.filename.endsWith('.doc') ? options.filename : `${options.filename}.doc`
  downloadBlob(blob, name)
}

export function exportReportPdf(options: {
  title: string
  subtitle?: string
  locale: string
  sections: ReportTableSection[]
  filename: string
}): void {
  const { title, subtitle, locale, sections, filename } = options
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const generatedLabel = locale === 'fr' ? 'Généré le' : 'Generated on'
  const generated = formatGeneratedAt(locale)

  let startY = 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(title, 14, startY)
  startY += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (subtitle) {
    doc.text(subtitle, 14, startY)
    startY += 5
  }
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`${generatedLabel} ${generated}`, 14, startY)
  doc.setTextColor(0)
  startY += 8

  for (const section of sections) {
    if (section.rows.length === 0) continue

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(section.title, 14, startY)
    startY += 4

    autoTable(doc, {
      startY,
      head: [section.headers],
      body: section.rows.map((row) => row.map((cell) => String(cell ?? ''))),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255 },
      theme: 'grid',
    })

    startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    if (startY > 270) {
      doc.addPage()
      startY = 16
    }
  }

  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  doc.save(name)
}

export { exportToCsv }
