import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisciplines1706806791591 implements MigrationInterface {
  name = 'AddDisciplines1706806791591';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "discipline" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_139512aefbb11a5b2fa92696828" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "discipline"`);
  }
}
