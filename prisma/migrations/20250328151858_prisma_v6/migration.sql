-- AlterTable
ALTER TABLE "_CompensationClassToUserInDb" ADD CONSTRAINT "_CompensationClassToUserInDb_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CompensationClassToUserInDb_AB_unique";

-- AlterTable
ALTER TABLE "_CourseToUserInDb" ADD CONSTRAINT "_CourseToUserInDb_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CourseToUserInDb_AB_unique";
