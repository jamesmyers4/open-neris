import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { generateInternalId } from '@/lib/incidents/generate-internal-id'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment } from '@/test/helpers/db-fixtures'

describe('generateInternalId (Testcontainers Postgres)', () => {
  let db: TestDatabase

  beforeAll(async () => {
    db = await startTestDatabase()
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  describe('ON CONFLICT ... DO UPDATE correctness', () => {
    it('inserts at counter=1 on the first call for a (departmentId, year) pair, then increments', async () => {
      const department = await createTestDepartment(db.prisma)
      const alarmTime = new Date('2026-06-01T00:00:00Z')

      const first = await generateInternalId(db.prisma, department.id, 'YEAR_SEQUENTIAL', null, alarmTime)
      const second = await generateInternalId(db.prisma, department.id, 'YEAR_SEQUENTIAL', null, alarmTime)
      const third = await generateInternalId(db.prisma, department.id, 'YEAR_SEQUENTIAL', null, alarmTime)

      expect(first).toBe('2026-000001')
      expect(second).toBe('2026-000002')
      expect(third).toBe('2026-000003')

      const row = await db.prisma.departmentIdCounter.findUniqueOrThrow({
        where: { departmentId_year: { departmentId: department.id, year: 2026 } }
      })
      expect(row.counter).toBe(3)
    })
  })

  describe('concurrency', () => {
    it('assigns N distinct, unique sequence values to N parallel calls for the same department/year', async () => {
      const department = await createTestDepartment(db.prisma)
      const alarmTime = new Date('2026-01-01T00:00:00Z')
      const N = 20

      const ids = await Promise.all(
        Array.from({ length: N }, () => generateInternalId(db.prisma, department.id, 'YEAR_SEQUENTIAL', null, alarmTime))
      )

      expect(new Set(ids).size).toBe(N)

      const row = await db.prisma.departmentIdCounter.findUniqueOrThrow({
        where: { departmentId_year: { departmentId: department.id, year: 2026 } }
      })
      expect(row.counter).toBe(N)
    })
  })

  describe('year-bucketing per mode', () => {
    it('buckets YEAR_SEQUENTIAL by the incident alarm time year', async () => {
      const department = await createTestDepartment(db.prisma)

      await generateInternalId(db.prisma, department.id, 'YEAR_SEQUENTIAL', null, new Date('2025-12-31T00:00:00Z'))
      await generateInternalId(db.prisma, department.id, 'YEAR_SEQUENTIAL', null, new Date('2026-01-01T00:00:00Z'))

      const rows = await db.prisma.departmentIdCounter.findMany({ where: { departmentId: department.id }, orderBy: { year: 'asc' } })
      expect(rows.map(r => ({ year: r.year, counter: r.counter }))).toEqual([
        { year: 2025, counter: 1 },
        { year: 2026, counter: 1 }
      ])
    })

    it('buckets CUSTOM_TEMPLATE by the incident alarm time year', async () => {
      const department = await createTestDepartment(db.prisma)

      await generateInternalId(db.prisma, department.id, 'CUSTOM_TEMPLATE', '{year}-{seq:4}', new Date('2027-03-01T00:00:00Z'))

      const row = await db.prisma.departmentIdCounter.findUniqueOrThrow({
        where: { departmentId_year: { departmentId: department.id, year: 2027 } }
      })
      expect(row.counter).toBe(1)
    })

    it('buckets SEQUENTIAL and MANUAL both under year=0, sharing one counter, regardless of alarm time year', async () => {
      const department = await createTestDepartment(db.prisma)

      const sequentialId = await generateInternalId(db.prisma, department.id, 'SEQUENTIAL', null, new Date('2030-01-01T00:00:00Z'))
      const manualId = await generateInternalId(db.prisma, department.id, 'MANUAL', null, new Date('1999-01-01T00:00:00Z'))

      expect(sequentialId).toBe('000001')
      expect(manualId).toBe('MANUAL-000002')

      const rows = await db.prisma.departmentIdCounter.findMany({ where: { departmentId: department.id } })
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ year: 0, counter: 2 })
    })
  })

  describe('CUSTOM_TEMPLATE end-to-end', () => {
    it('generates an ID from a real Department.internalIdTemplate', async () => {
      const department = await createTestDepartment(db.prisma, { internalIdMode: 'CUSTOM_TEMPLATE', internalIdTemplate: '{year}-{seq:4}-CUSTOM' })

      const id = await generateInternalId(
        db.prisma,
        department.id,
        department.internalIdMode,
        department.internalIdTemplate,
        new Date('2026-05-01T00:00:00Z')
      )

      expect(id).toBe('2026-0001-CUSTOM')
    })
  })
})
