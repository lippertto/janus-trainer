import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1706715759405 implements MigrationInterface {
  name = 'Initial1706715759405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" character varying NOT NULL, "iban" character varying, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "training" ("id" SERIAL NOT NULL, "discipline" character varying NOT NULL, "group" character varying NOT NULL, "date" date NOT NULL, "compensationCents" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "participantCount" integer NOT NULL, "status" character varying NOT NULL, "userId" character varying, CONSTRAINT "PK_c436c96be3adf1aa439ef471427" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "training" ADD CONSTRAINT "FK_b3a3040656df21433bb88f1e568" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "training" DROP CONSTRAINT "FK_b3a3040656df21433bb88f1e568"`,
    );
    await queryRunner.query(`DROP TABLE "training"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
