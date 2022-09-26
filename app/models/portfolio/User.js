const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {}
  User.init(
    {
      // attributes
      _id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      username: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      created: {
        type: DataTypes.DATE,
        allowNull: true
      },
      updated: {
        type: DataTypes.DATE,
        allowNull: true
      },
      simuwattRole: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      license: {
        type: DataTypes.STRING(200),
        allowNull: true
      }
    },
    {
      modelName: "User",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_users",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
    }
  );

  User.associate = function(models) {
    User.hasMany(models.UserOrg, {
      foreignKey: "_sdc_source_key__id",
      sourceKey: "_id",
      as: "userOrg"
    });
  };

  return User;
};
