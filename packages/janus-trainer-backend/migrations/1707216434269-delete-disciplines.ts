import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteDisciplines1707216434269 implements MigrationInterface {
    name = 'DeleteDisciplines1707216434269'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "training" RENAME COLUMN "discipline" TO "disciplineId"`);
        await queryRunner.query(`ALTER TABLE "discipline" ADD "deletedDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "training" DROP COLUMN "disciplineId"`);
        await queryRunner.query(`ALTER TABLE "training" ADD "disciplineId" integer`);
        await queryRunner.query(`ALTER TABLE "training" ADD CONSTRAINT "FK_196bb1cfbf779647774b85bdb8d" FOREIGN KEY ("disciplineId") REFERENCES "discipline"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "training" DROP CONSTRAINT "FK_196bb1cfbf779647774b85bdb8d"`);
        await queryRunner.query(`ALTER TABLE "training" DROP COLUMN "disciplineId"`);
        await queryRunner.query(`ALTER TABLE "training" ADD "disciplineId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "discipline" DROP COLUMN "deletedDate"`);
        await queryRunner.query(`ALTER TABLE "training" RENAME COLUMN "disciplineId" TO "discipline"`);
    }

}
