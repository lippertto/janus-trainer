import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestdataTrainings9699882920072 implements MigrationInterface {
  name = 'TestdataTrainings9699882920072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "user"("id", "createdAt", "iban", "name")
      VALUES('96628626-9cb3-4426-b6aa-033b89a183ab', NOW(), 'DE63120300001036097903', 'Tobias Lippert')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "user" WHERE id = '96628626-9cb3-4426-b6aa-033b89a183ab'`,
    );
  }
}
