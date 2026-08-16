-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'OFFICER', 'CHIEF', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'SENT', 'CONFIRMED', 'ERROR');

-- CreateEnum
CREATE TYPE "NerisEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "SubmissionTrigger" AS ENUM ('APPROVAL_AUTO', 'SCHEDULED_SWEEP', 'MANUAL_RESEND');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nerisFdId" TEXT,
    "nerisVendorClientId" TEXT,
    "nerisVendorSecretCipher" TEXT,
    "nerisEnvironment" "NerisEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "nerisIncidentId" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "alarmTime" TIMESTAMP(3) NOT NULL,
    "specialModifiers" TEXT[],
    "incidentPointLat" DOUBLE PRECISION,
    "incidentPointLng" DOUBLE PRECISION,
    "incidentPeoplePresent" BOOLEAN,
    "incidentDisplacedNumber" INTEGER,
    "incidentDisplacedCauses" TEXT[],
    "incidentRescueAnimal" INTEGER,
    "incidentNoActionReason" TEXT,
    "aidDirection" TEXT,
    "aidType" TEXT,
    "aidDepartmentNames" TEXT[],
    "aidNonFdTypes" TEXT[],
    "narrativeImpediment" TEXT,
    "narrativeOutcome" TEXT,
    "dispatchTimeCallCreate" TIMESTAMP(3),
    "dispatchTimeCallAnswer" TIMESTAMP(3),
    "dispatchTimeCallArrival" TIMESTAMP(3),
    "dispatchAutomaticAlarm" BOOLEAN,
    "dispatchFinalDisposition" TEXT,
    "dispatchDeterminateCode" TEXT,
    "dispatchIncidentCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentType" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "value1" TEXT NOT NULL,
    "value2" TEXT,
    "value3" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IncidentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentActionTaken" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "value1" TEXT NOT NULL,
    "value2" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IncidentActionTaken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentDispatchComment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentDispatchComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentLocation" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "streetAddressComplete" TEXT NOT NULL,
    "city" TEXT,
    "county" TEXT,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "place" TEXT,
    "useType" TEXT,
    "useSubtype" TEXT,
    "useVacancy" TEXT,
    "civicLocationCipher" JSONB,

    CONSTRAINT "IncidentLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentExposure" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "exposureType" TEXT NOT NULL,
    "exposureItem" TEXT NOT NULL,
    "exposureDamage" TEXT,
    "exposurePeoplePresent" BOOLEAN,
    "exposureDisplacedNumber" INTEGER,
    "exposureDisplacedCauses" TEXT[],

    CONSTRAINT "IncidentExposure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentFire" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "fireSuppressionAppliance" TEXT[],
    "fireWaterSupply" TEXT NOT NULL,
    "fireInvestigationNeed" TEXT NOT NULL,
    "fireInvestigationType" TEXT[],
    "structureArrivalConditions" TEXT NOT NULL,
    "structureProgressionConditions" BOOLEAN,
    "structureDamage" TEXT NOT NULL,
    "structureFloorOfOrigin" INTEGER,
    "structureRoomOfOrigin" TEXT NOT NULL,
    "structureFireCause" TEXT NOT NULL,
    "outsideFireCause" TEXT NOT NULL,
    "outsideFireAcresBurned" DOUBLE PRECISION,

    CONSTRAINT "IncidentFire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentMedical" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "patientCareReport" TEXT,
    "patientEvaluationCare" TEXT NOT NULL,
    "patientImprovedStatus" TEXT NOT NULL,
    "medicalDisposition" TEXT NOT NULL,

    CONSTRAINT "IncidentMedical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentHazsit" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "hazsitDisposition" TEXT NOT NULL,
    "hazsitEvacuated" INTEGER,

    CONSTRAINT "IncidentHazsit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentHazardChemical" (
    "id" TEXT NOT NULL,
    "hazsitId" TEXT NOT NULL,
    "dotClass" TEXT NOT NULL,
    "chemicalName" TEXT,
    "releaseOccurred" BOOLEAN,
    "amountEst" DOUBLE PRECISION,
    "amountEstUnits" TEXT NOT NULL,
    "physicalState" TEXT NOT NULL,
    "releaseInto" TEXT NOT NULL,
    "releaseCause" TEXT NOT NULL,

    CONSTRAINT "IncidentHazardChemical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentRescueFf" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "birthMonthYear" TEXT,
    "gender" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "casualtyRank" TEXT,
    "rescueType" TEXT NOT NULL,
    "primaryMode" TEXT,
    "actions" TEXT[],
    "impedimentTypes" TEXT[],
    "mayday" BOOLEAN,
    "maydayRelativeTime" TEXT,
    "ritActivated" BOOLEAN,
    "roomType" TEXT,
    "elevationType" TEXT,
    "removalPathType" TEXT,
    "fireRelativeTime" TEXT,
    "casualtyType" TEXT NOT NULL,
    "casualtyClassification" TEXT,
    "linkedUnitId" TEXT NOT NULL,
    "reportedUnitId" TEXT,
    "dutyType" TEXT,
    "casualtyCause" TEXT,
    "casualtyAction" TEXT,
    "casualtyPpe" TEXT[],
    "incidentCommand" BOOLEAN,
    "casualtyTimeline" TEXT,

    CONSTRAINT "IncidentRescueFf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentRescueNonFf" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "birthMonthYear" TEXT,
    "gender" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "rescueType" TEXT NOT NULL,
    "presenceKnown" TEXT,
    "primaryMode" TEXT,
    "actions" TEXT[],
    "impedimentTypes" TEXT[],
    "roomType" TEXT,
    "elevationType" TEXT,
    "removalPathType" TEXT,
    "fireRelativeTime" TEXT,
    "casualtyType" TEXT NOT NULL,
    "casualtyCause" TEXT,

    CONSTRAINT "IncidentRescueNonFf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentUnitResponse" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "unitIdLinked" TEXT NOT NULL,
    "unitIdReported" TEXT,
    "unitStaffingReported" INTEGER,
    "unableToDispatch" BOOLEAN,
    "responseMode" TEXT NOT NULL,
    "timeDispatch" TIMESTAMP(3),
    "timeEnrouteToScene" TIMESTAMP(3),
    "timeOnScene" TIMESTAMP(3),
    "timeCanceledEnroute" TIMESTAMP(3),
    "timeStaging" TIMESTAMP(3),
    "timeUnitClear" TIMESTAMP(3),
    "transportMode" TEXT NOT NULL,

    CONSTRAINT "IncidentUnitResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentRiskReduction" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "smokeAlarmPresence" TEXT NOT NULL,
    "smokeAlarmType" TEXT[],
    "smokeAlarmWorking" BOOLEAN,
    "smokeAlarmOperation" TEXT NOT NULL,
    "fireAlarmPresence" TEXT NOT NULL,
    "fireAlarmType" TEXT[],
    "fireAlarmOperation" TEXT NOT NULL,
    "fireSuppressionPresence" TEXT NOT NULL,
    "fireSuppressionType" TEXT[],
    "fireSuppressionOperation" TEXT NOT NULL,
    "cookingFireSuppressionPresence" TEXT NOT NULL,
    "cookingFireSuppressionType" TEXT[],

    CONSTRAINT "IncidentRiskReduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentEmergingHazard" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "elecCategory" TEXT,
    "elecType" TEXT,
    "elecSubtype" TEXT,
    "elecTarget" TEXT,
    "elecSuppress" TEXT[],
    "elecReignition" BOOLEAN,
    "elecVehicleStatus" BOOLEAN,
    "powergenHardwareType" TEXT[],
    "powergenPvIgnition" TEXT,
    "powergenPvType" TEXT,
    "csstIgnitionSource" BOOLEAN,
    "csstLightning" TEXT,
    "csstGrounded" TEXT,

    CONSTRAINT "IncidentEmergingHazard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentTacticTimestamps" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "timeCommandEstablished" TIMESTAMP(3),
    "timeSizeupCompleted" TIMESTAMP(3),
    "timeSuppressionComplete" TIMESTAMP(3),
    "timePrimarySearchBegin" TIMESTAMP(3),
    "timePrimarySearchComplete" TIMESTAMP(3),
    "timeWaterOnFire" TIMESTAMP(3),
    "timeFireUnderControl" TIMESTAMP(3),
    "timeFireKnockedDown" TIMESTAMP(3),
    "timeExtricationComplete" TIMESTAMP(3),

    CONSTRAINT "IncidentTacticTimestamps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "ReviewStatus" NOT NULL,
    "toStatus" "ReviewStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NerisSubmission" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "trigger" "SubmissionTrigger" NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NerisSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_nerisFdId_key" ON "Department"("nerisFdId");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_nerisIncidentId_key" ON "Incident"("nerisIncidentId");

-- CreateIndex
CREATE INDEX "Incident_departmentId_reviewStatus_idx" ON "Incident"("departmentId", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_departmentId_internalId_key" ON "Incident"("departmentId", "internalId");

-- CreateIndex
CREATE INDEX "IncidentType_incidentId_idx" ON "IncidentType"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentActionTaken_incidentId_idx" ON "IncidentActionTaken"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentDispatchComment_incidentId_idx" ON "IncidentDispatchComment"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentLocation_incidentId_key" ON "IncidentLocation"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentExposure_incidentId_idx" ON "IncidentExposure"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentFire_incidentId_key" ON "IncidentFire"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentMedical_incidentId_idx" ON "IncidentMedical"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentHazsit_incidentId_key" ON "IncidentHazsit"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentHazardChemical_hazsitId_idx" ON "IncidentHazardChemical"("hazsitId");

-- CreateIndex
CREATE INDEX "IncidentRescueFf_incidentId_idx" ON "IncidentRescueFf"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentRescueNonFf_incidentId_idx" ON "IncidentRescueNonFf"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentUnitResponse_incidentId_idx" ON "IncidentUnitResponse"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentRiskReduction_incidentId_key" ON "IncidentRiskReduction"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentEmergingHazard_incidentId_idx" ON "IncidentEmergingHazard"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentTacticTimestamps_incidentId_key" ON "IncidentTacticTimestamps"("incidentId");

-- CreateIndex
CREATE INDEX "ReviewEvent_incidentId_idx" ON "ReviewEvent"("incidentId");

-- CreateIndex
CREATE INDEX "NerisSubmission_incidentId_idx" ON "NerisSubmission"("incidentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentType" ADD CONSTRAINT "IncidentType_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentActionTaken" ADD CONSTRAINT "IncidentActionTaken_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentDispatchComment" ADD CONSTRAINT "IncidentDispatchComment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLocation" ADD CONSTRAINT "IncidentLocation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentExposure" ADD CONSTRAINT "IncidentExposure_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentFire" ADD CONSTRAINT "IncidentFire_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentMedical" ADD CONSTRAINT "IncidentMedical_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentHazsit" ADD CONSTRAINT "IncidentHazsit_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentHazardChemical" ADD CONSTRAINT "IncidentHazardChemical_hazsitId_fkey" FOREIGN KEY ("hazsitId") REFERENCES "IncidentHazsit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRescueFf" ADD CONSTRAINT "IncidentRescueFf_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRescueNonFf" ADD CONSTRAINT "IncidentRescueNonFf_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentUnitResponse" ADD CONSTRAINT "IncidentUnitResponse_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRiskReduction" ADD CONSTRAINT "IncidentRiskReduction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentEmergingHazard" ADD CONSTRAINT "IncidentEmergingHazard_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTacticTimestamps" ADD CONSTRAINT "IncidentTacticTimestamps_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NerisSubmission" ADD CONSTRAINT "NerisSubmission_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
