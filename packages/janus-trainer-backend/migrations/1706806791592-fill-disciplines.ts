import { MigrationInterface, QueryRunner } from 'typeorm';

export class FillDisciplines1706806791592 implements MigrationInterface {
  name = 'FillDisciplines1706806791592';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO "discipline"("name") VALUES('Achtsamkeit & Mindfulness');
        INSERT INTO "discipline"("name") VALUES('Feldenkreis');
        INSERT INTO "discipline"("name") VALUES('Pilates');
        INSERT INTO "discipline"("name") VALUES('Yoga');
        INSERT INTO "discipline"("name") VALUES('Tai Chi');
        INSERT INTO "discipline"("name") VALUES('Qi Gong');
        INSERT INTO "discipline"("name") VALUES('Volleyball');
        INSERT INTO "discipline"("name") VALUES('Basketball');
        INSERT INTO "discipline"("name") VALUES('Fußball');
        INSERT INTO "discipline"("name") VALUES('Handball');
        INSERT INTO "discipline"("name") VALUES('Baseball');
        INSERT INTO "discipline"("name") VALUES('Boxen');
        INSERT INTO "discipline"("name") VALUES('Krav Maga');
        INSERT INTO "discipline"("name") VALUES('Taekwondo');
        INSERT INTO "discipline"("name") VALUES('Brazilian Jiu-Jitsu');
        INSERT INTO "discipline"("name") VALUES('Kanu');
        INSERT INTO "discipline"("name") VALUES('Rudern');
        INSERT INTO "discipline"("name") VALUES('Badminton');
        INSERT INTO "discipline"("name") VALUES('Kindersport');
        INSERT INTO "discipline"("name") VALUES('Body Fit');
        INSERT INTO "discipline"("name") VALUES('Bootcamp');
        INSERT INTO "discipline"("name") VALUES('Freestyle Langhanteltraining');
        INSERT INTO "discipline"("name") VALUES('Indoor Cycling');
        INSERT INTO "discipline"("name") VALUES('Fitness & Kondition');
        INSERT INTO "discipline"("name") VALUES('Functional Training');
        INSERT INTO "discipline"("name") VALUES('Kapow');
        INSERT INTO "discipline"("name") VALUES('Frauen Fitness');
        INSERT INTO "discipline"("name") VALUES('Gymnastik/Rostfrei/Ölkännchen');
        INSERT INTO "discipline"("name") VALUES('Ü100');
        INSERT INTO "discipline"("name") VALUES('Wirbelsäulengymnastik');
        INSERT INTO "discipline"("name") VALUES('Boule');
        INSERT INTO "discipline"("name") VALUES('Tennis');
        INSERT INTO "discipline"("name") VALUES('Tischtennis');
        INSERT INTO "discipline"("name") VALUES('Cheerleading');
        INSERT INTO "discipline"("name") VALUES('Leichtathletik');
        INSERT INTO "discipline"("name") VALUES('Laufen');
        INSERT INTO "discipline"("name") VALUES('Aquafitness');
        INSERT INTO "discipline"("name") VALUES('Schwimmen');
                `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE "discipline"`);
  }
}
