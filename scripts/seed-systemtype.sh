#!/bin/bash

DATABASE=library-dev
COLLECTION=systemtypes
HOST=127.0.0.1

mongo $DATABASE --host $HOST --eval "db.$COLLECTION.drop()"

for file in static/import/systemstype/*.json
do
    echo "Importing system type for json file - $file"
    mongoimport -c $COLLECTION -d $DATABASE --host $HOST --file "$file" --jsonArray
done
