import { DataSource } from 'typeorm';
import { Training } from './src/trainings/trainings.entity';

import 'dotenv/config';
import { User } from './src/users/user.entity';
import { Discipline } from './src/disciplines/discipline.entity';

/** A data source to be used for the migrations of typeorm. */
export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: 5432,
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  entities: [User, Training, Discipline],
  logging: 'all',
  migrations: ['migrations/*.ts'],
});
