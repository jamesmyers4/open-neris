-- AlterTable
ALTER TABLE "IncidentHazardChemical" ALTER COLUMN "amountEstUnits" DROP NOT NULL,
ALTER COLUMN "physicalState" DROP NOT NULL,
ALTER COLUMN "releaseInto" DROP NOT NULL,
ALTER COLUMN "releaseCause" DROP NOT NULL;
