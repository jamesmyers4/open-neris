/*
  Warnings:

  - You are about to drop the column `incidentDisplacedCauses` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `incidentDisplacedNumber` on the `Incident` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "internalIdMode" TEXT NOT NULL DEFAULT 'YEAR_SEQUENTIAL',
ADD COLUMN     "internalIdTemplate" TEXT;

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN "incidentDisplacedCauses",
DROP COLUMN "incidentDisplacedNumber",
ADD COLUMN     "timeIncidentClear" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DepartmentIdCounter" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DepartmentIdCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentDisplacement" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "causes" TEXT[],

    CONSTRAINT "IncidentDisplacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentIdCounter_departmentId_year_key" ON "DepartmentIdCounter"("departmentId", "year");

-- CreateIndex
CREATE INDEX "IncidentDisplacement_incidentId_idx" ON "IncidentDisplacement"("incidentId");

-- AddForeignKey
ALTER TABLE "DepartmentIdCounter" ADD CONSTRAINT "DepartmentIdCounter_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentDisplacement" ADD CONSTRAINT "IncidentDisplacement_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
