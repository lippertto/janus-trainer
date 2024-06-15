/*
  Warnings:

  - You are about to drop the `_CompensationValueToCourse` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Qualification" AS ENUM ('WITH_QUALIFICATION', 'NO_QUALIFICATION', 'ANY');

-- DropForeignKey
ALTER TABLE "_CompensationValueToCourse" DROP CONSTRAINT "_CompensationValueToCourse_A_fkey";

-- DropForeignKey
ALTER TABLE "_CompensationValueToCourse" DROP CONSTRAINT "_CompensationValueToCourse_B_fkey";

-- AlterTable
ALTER TABLE "CompensationValue" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "qualification" "Qualification" NOT NULL DEFAULT 'ANY';

-- DropTable
DROP TABLE "_CompensationValueToCourse";
