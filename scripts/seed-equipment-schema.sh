#!/bin/bash

DATABASE=library-dev
COLLECTION=equipmentschemas
HOST=127.0.0.1
# HOST=prdcluster
USERNAME=buildee

mongo $DATABASE --host $HOST --eval "db.$COLLECTION.drop()"
# mongo "mongodb+srv://${USERNAME}:${MONGO_PASSWORD}@${HOST}/${DATABASE}" --eval "db.$COLLECTION.drop()"

for file in static/import/equipmentschema/*.json
do
    echo "Importing equipment schemas for json file - $file"
    mongoimport -c $COLLECTION -d $DATABASE --host $HOST --file "$file"
    # mongoimport --uri "mongodb+srv://${USERNAME}:${MONGO_PASSWORD}@${HOST}/${DATABASE}" -c $COLLECTION --file "$file"
done
