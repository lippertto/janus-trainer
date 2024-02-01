# NPM scripts

- `start:dev` Build the software and start it via the serverless framework
- `test:e2e` Run the end-to-end tests

Drop all tables from postgres

```sql
BEGIN TRANSACTION;
DROP TABLE IF EXISTS "given_training";
DROP TABLE IF EXISTS "training";
DROP TABLE IF EXISTS "trainer";
DROP TABLE IF EXISTS "user";

DROP TABLE IF EXISTS "migrations";
COMMIT;
```
