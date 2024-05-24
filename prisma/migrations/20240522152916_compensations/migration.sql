-- CreateTable
CREATE TABLE "CompensationValue" (
    "id" SERIAL NOT NULL,
    "cents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "CompensationValue_pkey" PRIMARY KEY ("id")
);
