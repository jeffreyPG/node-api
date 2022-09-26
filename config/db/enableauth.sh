#!/bin/sh
MONGO_PRIMARY=${MONGO_PRIMARY:=mongo-middleware}
MONGO_DATABASE=${MONGO_DATABASE:=library-dev}
MONGO_ADMIN_USER=${MONGO_ADMIN_USER}
MONGO_ADMIN_PASSWORD=${MONGO_ADMIN_PASSWORD}
MONGO_USER=${MONGO_USER}
MONGO_PASSWORD=${MONGO_PASSWORD}

docker-compose exec mongo-middleware mongo "mongodb://$MONGO_PRIMARY:27017/admin?replicaSet=rs0" --eval "db.createUser({user:'dbAdmin',pwd:'',roles:[{role:'userAdminAnyDatabase',db:'admin'},{role:'backup',db:'admin'},{role:'clusterMonitor',db:'admin'},'readWriteAnyDatabase']})"
docker-compose exec mongo-middleware mongo "mongodb://$MONGO_PRIMARY:27017/$MONGO_DATABASE?replicaSet=rs0" --eval "use library-dev db.createUser({user:'buildee',pwd:'',roles:[{role:'readWrite',db:''}]})"

