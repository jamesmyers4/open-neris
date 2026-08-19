-- AlterTable
ALTER TABLE "IncidentRescueFf" ADD COLUMN     "casualtyService" DOUBLE PRECISION,
ADD COLUMN     "gasIsolation" BOOLEAN,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "race" DROP NOT NULL,
ALTER COLUMN "casualtyType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "IncidentRescueNonFf" ADD COLUMN     "gasIsolation" BOOLEAN,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "race" DROP NOT NULL,
ALTER COLUMN "rescueType" DROP NOT NULL,
ALTER COLUMN "casualtyType" DROP NOT NULL;
