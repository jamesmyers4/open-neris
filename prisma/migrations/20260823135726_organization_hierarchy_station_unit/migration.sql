-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "address1" TEXT,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "fdType" TEXT,
ADD COLUMN     "mailingAddress1" TEXT,
ADD COLUMN     "mailingAddress2" TEXT,
ADD COLUMN     "mailingCity" TEXT,
ADD COLUMN     "mailingState" TEXT,
ADD COLUMN     "mailingZip" TEXT,
ADD COLUMN     "parentDepartmentId" TEXT,
ADD COLUMN     "staffActiveCiviliansCareerFt" INTEGER,
ADD COLUMN     "staffActiveCiviliansCareerPt" INTEGER,
ADD COLUMN     "staffActiveCiviliansVolunteer" INTEGER,
ADD COLUMN     "staffActiveEmsOnlyCareerFt" INTEGER,
ADD COLUMN     "staffActiveEmsOnlyCareerPt" INTEGER,
ADD COLUMN     "staffActiveEmsOnlyVolunteer" INTEGER,
ADD COLUMN     "staffActiveFfCareerFt" INTEGER,
ADD COLUMN     "staffActiveFfCareerPt" INTEGER,
ADD COLUMN     "staffActiveFfVolunteer" INTEGER,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zip" TEXT;

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT,
    "nerisStationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "capabilityType" TEXT,
    "nerisUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Station_departmentId_idx" ON "Station"("departmentId");

-- CreateIndex
CREATE INDEX "Unit_stationId_idx" ON "Unit"("stationId");

-- CreateIndex
CREATE INDEX "Department_parentDepartmentId_idx" ON "Department"("parentDepartmentId");

-- CreateIndex
CREATE INDEX "IncidentUnitResponse_unitIdLinked_idx" ON "IncidentUnitResponse"("unitIdLinked");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentUnitResponse" ADD CONSTRAINT "IncidentUnitResponse_unitIdLinked_fkey" FOREIGN KEY ("unitIdLinked") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
