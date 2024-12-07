#!/usr/bin/env bash

corepack enable
yarn install
yarn build
yarn start:prod
