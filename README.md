# Local execution
You can run the app locally (excluding the cognito login) by using the following commands:

```shell
podman-compose up -d
yarn start
```

# Frontend

# Backend

## Database

To clean the databases, you can use the following command.

```sql
BEGIN TRANSACTION;
DROP TABLE IF EXISTS "given_training";
DROP TABLE IF EXISTS "training";
DROP TABLE IF EXISTS "trainer";
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS "migrations";
COMMIT;
```

# Infrastructure

Currently, I did not want to manage the infrastructure as code. Hence, the resources were created by click-ops.

# TODOs

## Open points
* Do not refresh complete user list after changes
* Add end to end tests (for dev env)
* Find out if groups need to be autocompleted
* Find out what happens to log-in session after update. (users have to log out and in to get things working)
* Exception handling with error boundaries
* Allow to go from compensation page to validate page with specific dates+trainer
* Put secrets into actual secrets
* Run migrations in CI
* Create test environment
* Delete disciplines
* Add lerna and nx

## Refinement
* Read up on .env files best practices
* Read up on MUI's nextjs integration: https://mui.com/material-ui/guides/nextjs/
* Think about deploying the frontend with the serverless framework https://www.serverless.com/blog/serverless-nextjs
* Sort imports with eslint: https://eslint.org/docs/latest/rules/sort-imports
