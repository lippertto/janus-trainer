-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "isCustomCourse" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "startHour" DROP NOT NULL,
ALTER COLUMN "startMinute" DROP NOT NULL,
ALTER COLUMN "durationMinutes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Training" ALTER COLUMN "participantCount" DROP NOT NULL;

-- Add custom courses
INSERT INTO "Course" ("name", "disciplineId", "isCustomCourse")
SELECT
    'Einmalzahlung ' || "D"."name", "D"."id", TRUE
FROM
    "Discipline" AS "D"
WHERE
    NOT EXISTS (
        SELECT
            *
        FROM
            "Course" AS "C"
        WHERE
            "C"."isCustomCourse" = TRUE
          AND "C"."disciplineId" = "D"."id"
    )