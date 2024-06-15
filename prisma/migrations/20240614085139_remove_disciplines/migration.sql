/*
  Warnings:

  - You are about to drop the column `disciplineId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the `Discipline` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_disciplineId_fkey";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "disciplineId";

-- DropTable
DROP TABLE "Discipline";
