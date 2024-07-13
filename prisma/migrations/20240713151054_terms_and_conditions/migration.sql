-- AlterTable
ALTER TABLE "CompensationValue" ALTER COLUMN "compensationGroup" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMPTZ,
ADD COLUMN     "termsAcceptedVersion" TEXT;
