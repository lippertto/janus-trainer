/*
  Warnings:

  - You are about to drop the column `compensationGroup` on the `CompensationValue` table. All the data in the column will be lost.
  - You are about to drop the column `compensationGroups` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompensationValue" DROP COLUMN "compensationGroup";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "compensationGroups";

-- DropEnum
DROP TYPE "CompensationGroup";
