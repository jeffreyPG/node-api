# Simuwatt Node API

## Prerequisites
  * node `v10.20.1`
  * npm `v6.14.4` or yarn `v1.22.4`
  * mongodb `v4.2.1`
  * docker `v19.03.0`
  * python `v3.7.4`

## Install node modules
```bash
  $npm install
```
## Install docker compose
Link to install docker compose in multiple environments (https://docs.docker.com/compose/install/#prerequisites)

## Running Node Application
```bash
  $docker-compose up
```
`Note: Before running docker-compose make sure there is no process running on port 27017 and 80.`

## Updating Equipment Schemas

We use nexus.js to autogenerate the graphql schema for equipment. More information here https://nexus.js.org

1. Enable the feature flag to make schemas in `config/features/index.json`
2. Connect the node api to a mongo database that has the equipment schema changes (can be local or remote)
3. Restart the api
4. Validate changes


## Common Issues
Problem: no such file or directory Error: ENOENT: no such file or directory, open '/some/path/privatekey.pem'
Solution: use the script to generate a PEM file to sign JWT tokens:
`./keygen.sh`

Problem: Local node-api container cannot connect the a local mongodb container
```
MongoNetworkError: connect ECONNREFUSED 172.18.0.2:27017]
```
or
```
winston-mongodb: error initialising logger { MongoNetworkError: failed to connect to server [mongo-middleware:27017] on first connect [MongoNetworkError: connect ECONNREFUSED 172.18.0.2:27017]
```
Solution: Restart only the node-api container, keeping the mongo container running: `docker-compose restart node-api`

## Realm DB Loader
`docker-compose run node-api node ./app/integrations/realm/loader.js`

## Seeding Projects
To seed private projects, run:
```bash
cd scripts
node seed-private-projects.js
```

This will seed `myLibraryMeasures.json`.


To seed public projects, run:
```bash
cd scripts
node seed-static-measures.js
```

This will seed `measures.json`. `measures.json` should be generated in the [prescriptive-projects repository](https://github.com/simuwatt/prescriptive-projects), using the `prep-import.sh` script.

Note: I have not successfully seeded public projects, some debugging is required.


## Handle line Ending issue on windows
git config --global core.autocrlf input
git clone node-api again
