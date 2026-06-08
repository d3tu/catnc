#!/usr/bin/env node
import { parseArgs } from "node:util"
import path from "node:path"
import { save } from "./pdf"

const enum DefaultOptions {
  ROWS = 7,
  COLS = 5,
  GAP = 10,
  PAGE_PADDING = 12,
  LABEL_HEIGHT = 8,
  STROKE_WIDTH = 1
}

const HELP_MESSAGE = `
Use:
  catnc <cnc-folder> --outfile <output-pdf> [options]
Options:
  -o, --outfile        Path to the output PDF (required)
  -r, --rows           Number of rows (default: ${DefaultOptions.ROWS})
  -c, --cols           Number of columns (default: ${DefaultOptions.COLS})
  -g, --gap            Gap between items (default: ${DefaultOptions.GAP})
  -p, --page-padding   Page padding (default: ${DefaultOptions.PAGE_PADDING})
  -l, --label-height   Label height (default: ${DefaultOptions.LABEL_HEIGHT})
  -s, --stroke-width   Stroke width (default: ${DefaultOptions.STROKE_WIDTH})
`

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      outfile: { type: "string", short: "o" },
      rows: { type: "string", short: "r" },
      cols: { type: "string", short: "c" },
      gap: { type: "string", short: "g" },
      "page-padding": { type: "string", short: "p" },
      "label-height": { type: "string", short: "l" },
      "stroke-width": { type: "string", short: "s" }
    },
    allowPositionals: true
  })
  
  const inputDir = positionals[0]

  if (!inputDir || !values.outfile) {
    console.error(HELP_MESSAGE.trim())
    process.exit(1)
  }

  const rows = num(values.rows) ?? DefaultOptions.ROWS
  const cols = num(values.cols) ?? DefaultOptions.COLS
  const gap = num(values.gap) ?? DefaultOptions.GAP
  const pagePadding = num(values["page-padding"]) ?? DefaultOptions.PAGE_PADDING
  const labelHeight = num(values["label-height"]) ?? DefaultOptions.LABEL_HEIGHT
  const strokeWidth = num(values["stroke-width"]) ?? DefaultOptions.STROKE_WIDTH

  const outFile = path.resolve(values.outfile)

  try {
    await save(inputDir, outFile, { rows, cols, gap, pagePadding, labelHeight, strokeWidth })
    console.log("PDF generated: " + link(outFile, "file://" + outFile))
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

function num(value: string | undefined) {
  if (value !== undefined) {
    const n = Number(value)

    if (!isNaN(n)) {
      return n
    }
  }
}

function link(text: string, url: string) {
  return "\x1b]8;;" + url + "\x1b\\" + text + "\x1b]8;;\x1b\\"
}