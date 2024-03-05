import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestdataTrainings9699882920073 implements MigrationInterface {
  name = 'TestdataTrainings9699882920073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "user"("id", "createdAt", "iban", "name")
      VALUES
      ('502c79bc-e051-70f5-048c-5619e49e2383', NOW(),'DE63120300001036097903', 'Test-User Admin'),
      ('80ac598c-e0b1-7040-5e0e-6fd257a53699', NOW(), 'DE32500105177418626161', 'Test-User Trainer');
      `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "user" WHERE id IN ('502c79bc-e051-70f5-048c-5619e49e2383', '80ac598c-e0b1-7040-5e0e-6fd257a53699');`,
    );
  }
}
