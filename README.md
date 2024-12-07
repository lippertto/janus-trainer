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

## Bugs

- Account with name "Luca ​Leppert" could not be created. Need a proper error message.
- Current IBAN is used in payments, not the one that was used for the actual
  payment. This should be fixed, e.g., by using historized ibans.

## Features

- Make courses disabled. (Also in the UI.)
- Allow users to choose their own courses (Michael Busch)
- Auto-Approve
- Playwright test: enter -> approve -> compensate.
- Playwright test: duplicates
- Warning if training limits have been reached
- include tour for new users: https://github.com/elrumordelaluz/reactour
- Rename to JOTA Janus Online Training Abrechnung

## Tech update

- Join payments and compensation api routes (and domain objects) into /payments/{id}/compensations
- Run API tests in CI

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

## Database

I chose RDS because of the (time-limited) free tier that aws offers.

The database is publicly accessible via 5432 because I did not want to integrate CI with RDS authentication and
the required VPC connectivity setup.

## Special view for trainers

I use a different views for the enter-route, because I assume that trainers are much more likely to be on mobile.
The office will always use a PC, so a table view is better suited for them.

# Deployment

The deployment is handled via cloudformation. This will take care of the infrastructure setup and the deployment
of the lambda function. (Make sure to update the Parameter JanusTrainerAppImage)

## Database

The database is shared by both instances and is created manually. To create it, execute:

```shell
aws cloudformation update-stack \
  --region eu-north-1 \
  --stack-name janus-trainer-db \
  --template-body file://cloudformation-db.yaml \
  --parameter ParameterKey=DbPassword,ParameterValue=$DB_PASSWORD
```

## Rest of the deployment

```shell
aws cloudformation update-stack \
  --region eu-north-1 \
  --stack-name janus-trainer-test \
  --capabilities CAPABILITY_NAMED_IAM \
  --template-body file://cloudformation.yaml \
  --parameters ParameterKey=JanusEnvironment,ParameterValue=test \
               ParameterKey=JanusDomain,ParameterValue=janus-test.lippert.dev \
               ParameterKey=JanusTrainerAppImage,ParameterValue=9129018580.dkr.ecr.eu-north-1.amazonaws.com/janus-trainer-frontend:9101395816 \
               ParameterKey=JanusDomainCertificateArn,ParameterValue=arn:aws:acm:us-east-1:930650061532:certificate/5d02e171-7f89-4349-b6bf-2f52414864b5 \
               ParameterKey=PostgresConnectionUrl,ParameterValue=postgres://${PG_USER}:${PG_PASSWORD}@${PG_HOST}/bwquglhx\?connection_limit=1
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
