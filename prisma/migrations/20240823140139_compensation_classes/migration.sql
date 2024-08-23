-- AlterTable
ALTER TABLE "CompensationValue" ADD COLUMN     "compensationClassId" INTEGER,
ALTER COLUMN "compensationGroup" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CompensationClass" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CompensationClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompensationClassToUserInDb" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CompensationClassToUserInDb_AB_unique" ON "_CompensationClassToUserInDb"("A", "B");

-- CreateIndex
CREATE INDEX "_CompensationClassToUserInDb_B_index" ON "_CompensationClassToUserInDb"("B");

-- AddForeignKey
ALTER TABLE "CompensationValue" ADD CONSTRAINT "CompensationValue_compensationClassId_fkey" FOREIGN KEY ("compensationClassId") REFERENCES "CompensationClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompensationClassToUserInDb" ADD CONSTRAINT "_CompensationClassToUserInDb_A_fkey" FOREIGN KEY ("A") REFERENCES "CompensationClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompensationClassToUserInDb" ADD CONSTRAINT "_CompensationClassToUserInDb_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
