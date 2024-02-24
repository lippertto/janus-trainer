# Local execution
You can run the app locally (excluding the cognito login) by using the following commands:

```shell
podman-compose up -d
yarn start
```

# Frontend

# Backend

## Database

### Add a new entity
1. Create the new entity
2. Add the entity to `src/app.module.ts`
3. Add entity to `./datasource.ts`
4. Generate migration vs. test system with `yarn backend migration:generate:test`

### Clean database

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

Currently, I did not want to manage the infrastructure as code. Hence, most resources were created by click-ops.

## Cognito resources

Create the user pool
```shell
aws cognito-idp create-user-pool \
    --region eu-north-1 \
    --cli-input-yaml file://infrastructure/user-pool-dev.yaml

aws cognito-idp create-user-pool-client \
    --region eu-north-1 \
    --cli-input-yaml file://infrastructure/user-pool-client-dev.yaml
```

* manually create groups in user pool


# TODOs

## Open points
* Bug: Add training, leave Gruppe empty, save
* Run tests on pull requests, deploy on main
* Add end to end tests (for dev env)
* Find out what happens to log-in session after update. (users have to log out and in to get things working)
* Exception handling with error boundaries
* Allow to go from compensation page to validate page with specific dates+trainer
* Put secrets into actual secrets
* Run migrations in CI
* Create test environment
* Add lerna and nx
* Add manual cloudformation scripts for cognito (and other config)
* Concept for management of classes

## Refinement
* Read up on .env files best practices
* Read up on MUI's nextjs integration: https://mui.com/material-ui/guides/nextjs/
* Think about deploying the frontend with the serverless framework https://www.serverless.com/blog/serverless-nextjs
* Sort imports with eslint: https://eslint.org/docs/latest/rules/sort-imports

## Future
* Trainers can change their IBAN

