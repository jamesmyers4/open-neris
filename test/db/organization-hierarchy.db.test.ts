import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestIncident, createTestStation, createTestUnit } from '@/test/helpers/db-fixtures'

// Session 4 (FUTURE-PLAN.md): app-only Department hierarchy plus the local
// Station/Unit reference tables, and the new real FK from
// IncidentUnitResponse.unitIdLinked to Unit. This file covers the schema
// behaviors that session added, following the existing
// cross-department-boundary.db.test.ts / cascade-deletes.db.test.ts patterns
// for real-Postgres assertions rather than mocked-Prisma ones.
describe('Organization schema (Testcontainers Postgres)', () => {
  let db: TestDatabase

  beforeAll(async () => {
    db = await startTestDatabase()
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  describe('Department self-referential hierarchy', () => {
    it('a district department\'s query scope includes its descendants', async () => {
      const district = await createTestDepartment(db.prisma, { name: 'District HQ' })
      const childOne = await createTestDepartment(db.prisma, { name: 'Leaf One', parentDepartmentId: district.id })
      const childTwo = await createTestDepartment(db.prisma, { name: 'Leaf Two', parentDepartmentId: district.id })

      const withChildren = await db.prisma.department.findUniqueOrThrow({
        where: { id: district.id },
        include: { children: true }
      })

      expect(withChildren.children.map(c => c.id).sort()).toEqual([childOne.id, childTwo.id].sort())
    })

    it('a leaf department\'s query scope does not include its siblings or parent', async () => {
      const district = await createTestDepartment(db.prisma, { name: 'District HQ' })
      const leaf = await createTestDepartment(db.prisma, { name: 'Leaf', parentDepartmentId: district.id })
      const sibling = await createTestDepartment(db.prisma, { name: 'Sibling', parentDepartmentId: district.id })

      const withRelations = await db.prisma.department.findUniqueOrThrow({
        where: { id: leaf.id },
        include: { children: true, parent: true }
      })

      expect(withRelations.children).toEqual([])
      expect(withRelations.parent?.id).toBe(district.id)
      expect(withRelations.parent?.id).not.toBe(sibling.id)
    })

    it('deleting a parent department orphans (does not delete) its children', async () => {
      const district = await createTestDepartment(db.prisma)
      const child = await createTestDepartment(db.prisma, { parentDepartmentId: district.id })

      await db.prisma.department.delete({ where: { id: district.id } })

      const survivingChild = await db.prisma.department.findUniqueOrThrow({ where: { id: child.id } })
      expect(survivingChild.parentDepartmentId).toBeNull()
    })

    it('a leaf department (no parent set) has a null parent and empty children', async () => {
      const solo = await createTestDepartment(db.prisma)

      const loaded = await db.prisma.department.findUniqueOrThrow({
        where: { id: solo.id },
        include: { children: true, parent: true }
      })

      expect(loaded.parentDepartmentId).toBeNull()
      expect(loaded.parent).toBeNull()
      expect(loaded.children).toEqual([])
    })
  })

  describe('Station and Unit reference tables', () => {
    it('a Unit is reachable from its Department through Station, and cascades on Station delete', async () => {
      const department = await createTestDepartment(db.prisma)
      const station = await createTestStation(db.prisma, department.id, { label: 'Station 7' })
      const unit = await createTestUnit(db.prisma, station.id, { designation: 'ENGINE 7', capabilityType: 'ENGINE_STRUCT' })

      const departmentWithStations = await db.prisma.department.findUniqueOrThrow({
        where: { id: department.id },
        include: { stations: { include: { units: true } } }
      })
      expect(departmentWithStations.stations).toHaveLength(1)
      expect(departmentWithStations.stations[0].units.map(u => u.id)).toEqual([unit.id])

      await db.prisma.station.delete({ where: { id: station.id } })

      expect(await db.prisma.unit.findUnique({ where: { id: unit.id } })).toBeNull()
    })

    it('deleting a Department cascades to its Stations and, transitively, their Units', async () => {
      const department = await createTestDepartment(db.prisma)
      const station = await createTestStation(db.prisma, department.id)
      const unit = await createTestUnit(db.prisma, station.id)

      await db.prisma.department.delete({ where: { id: department.id } })

      expect(await db.prisma.station.findUnique({ where: { id: station.id } })).toBeNull()
      expect(await db.prisma.unit.findUnique({ where: { id: unit.id } })).toBeNull()
    })
  })

  describe('IncidentUnitResponse.unitIdLinked as a real FK to Unit', () => {
    it('rejects creating a unit response row against a nonexistent Unit id', async () => {
      const department = await createTestDepartment(db.prisma)
      const user = await createTestUser(db.prisma, department.id)
      const incident = await createTestIncident(db.prisma, department.id, user.id)

      await expect(
        db.prisma.incidentUnitResponse.create({ data: { incidentId: incident.id, unitIdLinked: 'not-a-real-unit-id' } })
      ).rejects.toMatchObject({ code: 'P2003' })
    })

    it('blocks deleting a Unit that a historical IncidentUnitResponse row still references (onDelete: Restrict)', async () => {
      const department = await createTestDepartment(db.prisma)
      const user = await createTestUser(db.prisma, department.id)
      const incident = await createTestIncident(db.prisma, department.id, user.id)
      const station = await createTestStation(db.prisma, department.id)
      const unit = await createTestUnit(db.prisma, station.id)
      await db.prisma.incidentUnitResponse.create({ data: { incidentId: incident.id, unitIdLinked: unit.id } })

      await expect(db.prisma.unit.delete({ where: { id: unit.id } })).rejects.toMatchObject({ code: 'P2003' })

      expect(await db.prisma.unit.findUnique({ where: { id: unit.id } })).not.toBeNull()
    })

    it('allows deleting a Unit with no referencing IncidentUnitResponse rows', async () => {
      const department = await createTestDepartment(db.prisma)
      const station = await createTestStation(db.prisma, department.id)
      const unit = await createTestUnit(db.prisma, station.id)

      await db.prisma.unit.delete({ where: { id: unit.id } })

      expect(await db.prisma.unit.findUnique({ where: { id: unit.id } })).toBeNull()
    })
  })
})
