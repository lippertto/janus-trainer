-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "weekday" "DayOfWeek";

UPDATE "Course" SET "weekday" = "weekdays"[1] WHERE cardinality("weekdays") != 0;