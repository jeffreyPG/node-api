use admin
db.createUser(
  {
    user: "dbAdmin",
    pwd: process.env.MONGO_ADMIN_PASSWORD,
    roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
  }
)

use library-dev
db.createUser(
  {
    user: "buildee",
    pwd:  process.env.MONGO_PASSWORD,   // or cleartext password
    roles: [ { role: "readWrite", db: "library-dev" } ]
  }
)
