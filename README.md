# Local execution

You can run the app locally (excluding the cognito login) by using the following commands:

```shell
podman-compose up -d
yarn start:dev
```

## Execute API tests

To execute the API tests, you have to start the server with the environment variable
`DISABLE_JWT_CHECKS=1` set.

Then, run `yarn vitest -c api-tests/vite.config.js`

# TODO

## Next up

- Activate database backup

## Bugs

- Current IBAN is used in payments, not the one that was used for the actual
  payment. This should be fixed, e.g., by using historized ibans.

## Features

- Warning if booked time != course time
- Playwright test: enter -> approve -> compensate.
- Playwright test: duplicates
- Warning if training limits have been reached
- include tour for new users: https://github.com/elrumordelaluz/reactour

## Tech update

- Join payments and compensation api routes (and domain objects) into /payments/{id}/compensations
- Run API tests in CI
- Send logs to AWS
- Think about auditing table

# Common tasks

## Evolving the database schema

All commands should be prefixed with `yarn run dotenv -e .env.development -- ` to load the database connection values

Update the generated code: `prisma generate`

Make changes to the schema. Push the changes to the local database with `prisma db push`.

After you are done, you can create a migration like so: `prisma migrate dev`

More information can be found in
the [Prisma docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema)

# Architecture & Decisions

## Users

I used cognito to learn it, and to keep the user credentials in a secure spot, i.e., not me.

Every environment has its own user pool. The one in prod and test are managed by cloudformation, the one for dev
is managed manually.

Only users who exist in cognito and in the database may log in. When a user is deleted, it is soft-deleted in the
database and disabled in cognito.

## Environments

We have two environments in the cloud, test and prod. Because we do not use Github Environments, we cannot use manual
approval/deployment rules, and a further differentiation with a dev-environment would not make too much sense.

There is a dev-cognito which is used for local development. This instance is managed manually.

## Special view for trainers

I use a different views for the enter-route, because I assume that trainers are much more likely to be on mobile.
The office will always use a PC, so a table view is better suited for them.

# Deployment

The software is mainly intended to run on a VM. Additionally, we use the AWS service cognito to manage user logins
and as an OAuth2 provider.

## Deployment on VM

## Cloud deployment (cognito)

Deployment of test environment

```shell
aws cloudformation update-stack \
            --region eu-north-1 \
            --stack-name janus-trainer-test \
            --capabilities CAPABILITY_NAMED_IAM \
            --template-body file://cloudformation.yaml \
            --parameters ParameterKey=JanusEnvironment,ParameterValue=test \
                         ParameterKey=JanusDomain,ParameterValue=janus-test.lippert.dev
```

Deployment of prod environment

```shell
aws cloudformation update-stack \
            --region eu-north-1 \
            --stack-name janus-trainer-prod \
            --capabilities CAPABILITY_NAMED_IAM \
            --template-body file://cloudformation.yaml \
            --parameters ParameterKey=JanusEnvironment,ParameterValue=prod \
                         ParameterKey=JanusDomain,ParameterValue=jota.sc-janus.de
```

You need to take care of the following things:

- Provide a domain for each environment
- Create a certificate in ACM for that domain

# Notes

## Secrets and Parameters

I do not want to use the AWS Secrets Mechanism, e.g., for the db password.
In order to get the secrets, one would need to use an SDK (creating an explicit dependency to aws)
or to use the lambda extension for secrets. The latter would use a http call to localhost to retrieve
the secret, which is not very so 12-factor compatible.
From my point of view it is fine to keep the secrets as environment variables for now.
