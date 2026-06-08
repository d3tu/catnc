import PDFDocument from "pdfkit"

import { createWriteStream } from "node:fs"
import { mkdir, stat, readFile, readdir } from "node:fs/promises"
import { dirname, resolve, extname, basename } from "node:path"

import gen from "./gen"

async function* genAll(inputDir: string) {
  const absoluteDir = resolve(inputDir)
  const entries = await readdir(absoluteDir, { recursive: true, withFileTypes: true, })

  const files = []

  for (const entry of entries) {
    if (entry.isFile() && extname(entry.name).toLowerCase() === ".cnc") {
      const path = resolve(entry.parentPath, entry.name)

      files.push({ path, time: (await stat(path)).ctimeMs })
    }
  }

  files.sort((a, b) => a.time - b.time)

  for (const { path } of files) {
    yield { name: basename(path), ...gen(await readFile(path)) }
  }
}

export interface Options {
  rows: number
  cols: number
  gap: number
  labelHeight: number
  pagePadding: number
  strokeWidth: number
}

export async function save(inputDir: string, outFile: string, options: Options) {
  const { rows, cols, gap, pagePadding, labelHeight, strokeWidth } = options

  const outPath = resolve(outFile)

  await mkdir(dirname(outPath), { recursive: true }).catch(() => { })

  const doc = new PDFDocument({ margin: 0, autoFirstPage: true })
  const writeStream = createWriteStream(outPath)

  doc.pipe(writeStream)

  const perPage = rows * cols
  const pageWidth = doc.page.width
  const pageHeight = doc.page.height
  const cellWidth = (pageWidth - (pagePadding * 2) - (cols - 1) * gap) / cols
  const cellHeight = (pageHeight - (pagePadding * 2) - (rows * labelHeight) - (2 * rows - 1) * gap) / rows

  let slot = 0

  for await (const { name, path, bounds } of genAll(inputDir)) {
    const { minX, minY, maxX, maxY } = bounds

    const width = maxX - minX || 1
    const height = maxY - minY || 1

    const scale = Math.min(cellWidth / width, cellHeight / height)

    const pos = slot % perPage
    const col = pos % cols
    const row = Math.floor(pos / cols)

    if (slot > 0 && pos === 0) {
      doc.addPage({ margin: 0 })
    }

    const x = pagePadding + col * (cellWidth + gap)
    const y = pagePadding + row * (cellHeight + gap * 2 + labelHeight)

    doc
      .save()
      .translate(x + cellWidth / 2, y + cellHeight / 2)
      .scale(scale)
      .translate(-(minX + width / 2), -(minY + height / 2))
      .path(path)
      .lineWidth(strokeWidth / Math.max(scale, Math.sqrt(scale)))
      .lineJoin("round")
      .lineCap("round")
      .stroke()
      .restore()

    doc
      .fillColor("#777")
      .font("Courier")
      .fontSize(labelHeight)
      .text(name, x, y + cellHeight + gap, { width: cellWidth, height: labelHeight, align: "center", ellipsis: true })

    ++slot
  }

  doc.end()

  return new Promise((ok, err) => {
    writeStream.on("finish", ok)
    writeStream.on("error", err)
  })
}