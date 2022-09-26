const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Organization extends Model {}
  Organization.init(
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
      baselineyear: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      targetyear: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      reduction: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      tname: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      tdescription: {
        type: DataTypes.STRING(200),
        allowNull: true
      }
    },
    {
      modelName: "Organization",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_organization_dim",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  return Organization;
};
