/*
  Warnings:

  - You are about to drop the column `disciplineId` on the `Training` table. All the data in the column will be lost.
  - You are about to drop the column `group` on the `Training` table. All the data in the column will be lost.
  - You are about to alter the column `compensationCents` on the `Training` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `participantCount` on the `Training` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - Added the required column `courseId` to the `Training` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- DropForeignKey
ALTER TABLE "Training" DROP CONSTRAINT "Training_disciplineId_fkey";

-- AlterTable
ALTER TABLE "Training" DROP COLUMN "disciplineId",
DROP COLUMN "group",
ADD COLUMN     "courseId" INTEGER NOT NULL,
ALTER COLUMN "compensationCents" SET DATA TYPE INTEGER,
ALTER COLUMN "participantCount" SET DATA TYPE INTEGER;

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "disciplineId" INTEGER NOT NULL,
    "weekdays" "DayOfWeek"[],
    "startHour" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompensationValueToCourse" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CourseToUserInDb" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CompensationValueToCourse_AB_unique" ON "_CompensationValueToCourse"("A", "B");

-- CreateIndex
CREATE INDEX "_CompensationValueToCourse_B_index" ON "_CompensationValueToCourse"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CourseToUserInDb_AB_unique" ON "_CourseToUserInDb"("A", "B");

-- CreateIndex
CREATE INDEX "_CourseToUserInDb_B_index" ON "_CourseToUserInDb"("B");

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompensationValueToCourse" ADD CONSTRAINT "_CompensationValueToCourse_A_fkey" FOREIGN KEY ("A") REFERENCES "CompensationValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompensationValueToCourse" ADD CONSTRAINT "_CompensationValueToCourse_B_fkey" FOREIGN KEY ("B") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToUserInDb" ADD CONSTRAINT "_CourseToUserInDb_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToUserInDb" ADD CONSTRAINT "_CourseToUserInDb_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
