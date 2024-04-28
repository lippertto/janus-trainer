# Local execution
You can run the app locally (excluding the cognito login) by using the following commands:

```shell
podman-compose up -d
yarn start
```

# Clean database

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
* Give the lambda permission to manage cognito user pool

## Frontend
* Create a https certificate in ACM for the frontend domain
* Create an lambda function in the UI
  * Memory 256MB
  * The function must be accessible via the internet
  * Use any of the built frontend images
* Create a CloudFront distribution
  * Set origin to the lambda function
  * Add behavior for _next/static/* (caching enabled)
  * Copy the domain name of the distribution and put it into a CNAME DNS entry


# TODOs

## Tomorrow
* Test some user operations on prod
* Concept: re-added users (deactivate in Cognito?)
* Merge everything
* Setup test environment & deployment
* Re activate e2e tests

## Features
* Find out what happens to log-in session after update. (users have to log out and in to get things working)
* Allow to go from compensation page to validate page with specific dates+trainer
* Concept for management of classes
* Make compensations editable
* Put user management into Verwaltung
* Put disciplines+classes on separate Angebot page

## Tech update
* Add proper logging
* Run tests on pull requests, deploy on main
* Use lint-staged: https://github.com/lint-staged/lint-staged
* Put secrets into actual secrets
* Use column-editing mode for TrainingTable

## Refinement
* Read up on MUI's nextjs integration: https://mui.com/material-ui/guides/nextjs/
* Sort imports with eslint: https://eslint.org/docs/latest/rules/sort-imports

## Future
* Trainers can change their IBAN
