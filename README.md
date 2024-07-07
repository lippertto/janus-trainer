# Local execution
You can run the app locally (excluding the cognito login) by using the following commands:

```shell
podman-compose up -d
yarn start:dev
```

## Execute API tests
To execute the API tests, you have to start the server with the environment variable
`DISABLE_JWT_CHECKS=1` set.

# TODO

## Next up 
* Clean up Training Table
* Add Comment field

## Bugs
* Strange behavior on approve page: drop down appears without table

## Features
* Make courses disabled. (Also in the UI.)
* Show statistics on /profile

## Tech update
* Hide password in POSTGRES_CONNECTION_URL of lambda. --> Use Secret
* Add proper logging

## Refinement
* Read up on MUI's nextjs integration: https://mui.com/material-ui/guides/nextjs/
* Sort imports with eslint: https://eslint.org/docs/latest/rules/sort-imports

# Common tasks

## Evolving the database schema
All commands should be prefixed with `yarn run dotenv -e .env.development -- ` to load the database connection values

Make changes to the schema. Push the changes to the local database with `prisma db push`.

After you are done, you can create a migration like so: `prisma migrate dev`

More information can be found in the [Prisma docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema) 

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
* Provide a domain for each environment
* Create a certificate in ACM for that domain
