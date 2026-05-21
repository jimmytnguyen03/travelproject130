const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Tenant = sequelize.define("Tenant", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  themeColor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Tenant;
