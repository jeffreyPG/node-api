const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserOrg extends Model {}
  UserOrg.init(
    {
      // attributes
      _sdc_level_0_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true
      },
      _sdc_sequence: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      _sdc_source_key__id: {
        type: DataTypes.STRING(200),
        allowNull: true,
        primaryKey: true
      },
      _sdc_table_version: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      value: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      _sdc_batched_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      _sdc_received_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      modelName: "UserOrg",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_users_org_ids",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
    }
  );

  UserOrg.associate = function(models) {
    UserOrg.belongsTo(models.Organization, {
      foreignKey: "value",
      as: "organization"
    });
  };
  return UserOrg;
};
