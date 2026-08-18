-- AlterTable
ALTER TABLE "IncidentFire" ALTER COLUMN "fireWaterSupply" DROP NOT NULL,
ALTER COLUMN "structureArrivalConditions" DROP NOT NULL,
ALTER COLUMN "structureDamage" DROP NOT NULL,
ALTER COLUMN "structureRoomOfOrigin" DROP NOT NULL,
ALTER COLUMN "structureFireCause" DROP NOT NULL,
ALTER COLUMN "outsideFireCause" DROP NOT NULL;
