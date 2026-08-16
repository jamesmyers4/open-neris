import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import { parse } from 'csv-parse/sync'

const VENDOR_DIR = process.env.NERIS_FRAMEWORK_DIR || 'vendor/neris-framework'
const OUT_DIR = join(process.env.NERIS_OUT_DIR || 'lib/neris/generated')

type Row = Record<string, string>

function toPascalCase(name: string) {
  return name.split('_').filter(Boolean).map(p => p[0].toUpperCase() + p.slice(1)).join('')
}

function loadCsv(path: string): Row[] {
  const text = readFileSync(path, 'utf-8').replace(/^\uFEFF/, '')
  return parse(text, { columns: (h: string[]) => h.map(c => c.trim().toLowerCase()), skip_empty_lines: true, relax_column_count: true, relax_quotes: true }) as Row[]
}

function isActive(r: Row) {
  return (r.active ?? 'TRUE').trim().toUpperCase() !== 'FALSE'
}

function classify(name: string, rows: Row[]) {
  if (rows.length === 0) return null
  const header = Object.keys(rows[0])
  const live = rows.filter(isActive)
  if (header.includes('value_1')) return { name, kind: 'lookup' as const, values: [] as string[], rows: live }
  const valueKey = header.includes('value') ? 'value' : header.includes('name') ? 'name' : null
  if (valueKey) {
    const values = [...new Set(live.map(r => r[valueKey]?.trim()).filter((v): v is string => Boolean(v)))]
    return { name, kind: (values.length <= 20 ? 'enum' : 'lookup') as 'enum' | 'lookup', values, rows: live }
  }
  return null
}

function generate() {
  const dirs = [join(VENDOR_DIR, 'core_schemas/value_sets/csv'), join(VENDOR_DIR, 'secondary_schemas/value_sets/csv')]
  mkdirSync(OUT_DIR, { recursive: true })
  const enumLines: string[] = []
  const lookupManifest: { name: string; file: string; rowCount: number }[] = []
  const seen = new Set<string>()
  let skipped: string[] = []
  let duplicates: string[] = []
  for (const dir of dirs) {
    let files: string[] = []
    try { files = readdirSync(dir) } catch { continue }
    for (const file of files) {
      if (!file.endsWith('.csv')) continue
      const name = basename(file, '.csv')
      if (seen.has(name)) { duplicates.push(file); continue }
      seen.add(name)
      const rows = loadCsv(join(dir, file))
      const result = classify(name, rows)
      if (!result) { skipped.push(file); continue }
      if (result.kind === 'enum') {
        const constName = toPascalCase(name)
        enumLines.push(`export const ${constName} = ${JSON.stringify(result.values)} as const`)
        enumLines.push(`export type ${constName} = typeof ${constName}[number]`)
      } else {
        const outFile = join(OUT_DIR, `${name}.json`)
        writeFileSync(outFile, JSON.stringify(result.rows, null, 2))
        lookupManifest.push({ name, file: `${name}.json`, rowCount: result.rows.length })
      }
    }
  }
  writeFileSync(join(OUT_DIR, 'enums.ts'), enumLines.join('\n\n') + '\n')
  writeFileSync(join(OUT_DIR, 'lookup-manifest.json'), JSON.stringify(lookupManifest, null, 2))
  console.log(`generated ${enumLines.length / 2} enums`)
  console.log(`generated ${lookupManifest.length} lookup tables`)
  console.log(`skipped ${skipped.length} files:`, skipped)
  console.log(`deduplicated ${duplicates.length} files shared between core and secondary schemas`)
}

generate()
