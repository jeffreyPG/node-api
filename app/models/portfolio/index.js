const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');

// Define sequelize connection

const sequelize = new Sequelize(
    process.env.POSTGRES_DATABASE,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
{
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres'
});
  

const db = {};

// Import models
fs
    .readdirSync(__dirname)
    .filter(file => {
        return (file.indexOf('.') > 0) && (file !== 'index.js');
    })
    .forEach(file => {
        const model = sequelize.import(path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});


module.exports = Object.assign({}, {
    sequelize,
    Sequelize,
}, db);