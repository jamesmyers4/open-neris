import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'

async function nextCounterValue(tx: Prisma.TransactionClient, departmentId: string, year: number): Promise<number> {
  const rows = await tx.$queryRaw<{ counter: number }[]>`
    INSERT INTO "DepartmentIdCounter" ("id", "departmentId", "year", "counter")
    VALUES (${randomUUID()}, ${departmentId}, ${year}, 1)
    ON CONFLICT ("departmentId", "year")
    DO UPDATE SET "counter" = "DepartmentIdCounter"."counter" + 1
    RETURNING "counter"
  `
  return rows[0].counter
}

export function applyTemplate(template: string, year: number, seq: number): string {
  return template
    .replace(/\{year\}/g, String(year))
    .replace(/\{seq:(\d+)\}/g, (_match, width: string) => String(seq).padStart(Number(width), '0'))
    .replace(/\{seq\}/g, String(seq))
}

export async function generateInternalId(
  tx: Prisma.TransactionClient,
  departmentId: string,
  mode: string,
  template: string | null,
  alarmTime: Date
): Promise<string> {
  const year = alarmTime.getUTCFullYear()

  switch (mode) {
    case 'SEQUENTIAL': {
      const seq = await nextCounterValue(tx, departmentId, 0)
      return String(seq).padStart(6, '0')
    }
    case 'CUSTOM_TEMPLATE': {
      const seq = await nextCounterValue(tx, departmentId, year)
      return applyTemplate(template ?? '{year}-{seq:6}', year, seq)
    }
    case 'MANUAL': {
      const seq = await nextCounterValue(tx, departmentId, 0)
      return `MANUAL-${String(seq).padStart(6, '0')}`
    }
    case 'YEAR_SEQUENTIAL':
    default: {
      const seq = await nextCounterValue(tx, departmentId, year)
      return `${year}-${String(seq).padStart(6, '0')}`
    }
  }
}
