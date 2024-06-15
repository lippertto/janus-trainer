/*
  Warnings:

  - You are about to drop the column `qualification` on the `CompensationValue` table. All the data in the column will be lost.
  - Added the required column `compensationGroup` to the `CompensationValue` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CompensationGroup" AS ENUM ('WITH_QUALIFICATION', 'NO_QUALIFICATION', 'LEAGUE');

-- AlterTable
ALTER TABLE "CompensationValue" DROP COLUMN "qualification",
ADD COLUMN     "compensationGroup" "CompensationGroup" NOT NULL DEFAULT 'NO_QUALIFICATION';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "compensationGroups" "CompensationGroup"[] DEFAULT ARRAY[]::"CompensationGroup"[];

-- DropEnum
DROP TYPE "Qualification";
