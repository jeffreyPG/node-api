#!/bin/sh
docker-compose exec mongo-middleware sh
mongo
config = {_id: "rs0",members: [{ _id: 0, host: "mongo-middleware:27017" },{ _id: 1, host: "mongo-node-1:27017" },{ _id: 2, host: "mongo-node-2:27017" }]};
rs.initiate(config)
