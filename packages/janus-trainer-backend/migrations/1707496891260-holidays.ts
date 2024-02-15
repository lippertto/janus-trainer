import { MigrationInterface, QueryRunner } from "typeorm";

export class Holidays1707496891260 implements MigrationInterface {
    name = 'Holidays1707496891260'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "holiday" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "start" date NOT NULL, "end" date NOT NULL, CONSTRAINT "PK_3e7492c25f80418a7aad0aec053" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "holiday"`);
    }

}
