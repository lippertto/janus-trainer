# Frontend

## Deployment

Log in to aws:

```sh
aws ecr get-login-password --region eu-north-1 | podman login --username AWS --password-stdin 930650061532.dkr.ecr.eu-north-1.amazonaws.com
```

Build image and deploy to aws:

```sh
podman build -t janus-trainer-app-arm64 .
podman tag janus-trainer-app-arm64:latest 930650061532.dkr.ecr.eu-north-1.amazonaws.com/janus-trainer-app-arm64:latest
podman push 930650061532.dkr.ecr.eu-north-1.amazonaws.com/janus-trainer-app-arm64:latest
```

Deployment is done via UI.

# Backend

## Database

Clean databases

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
* Make list of disciplines editable
* Find out if groups need to be autocompleted
* Find out what happens to log-in session after update. (users have to log out and in to get things working)
* Exception handling with error boundaries
* Allow to go from compensation page to validate page with specific dates+trainer
* Use docker postgres for dev environment
* Put secrets into actual secrets
* Errors should show immediately when adding a new training
* Run migrations in CI

## Refinement
* Read up on .env files best practices
* Read up on MUI's nextjs integration: https://mui.com/material-ui/guides/nextjs/
* Think about deploying the frontend with the serverless framework https://www.serverless.com/blog/serverless-nextjs
* Sort imports with eslint: https://eslint.org/docs/latest/rules/sort-imports
* Try to make a component (master data) more server-side rendered
