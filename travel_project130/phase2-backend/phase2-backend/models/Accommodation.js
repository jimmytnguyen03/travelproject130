const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Accommodation = sequelize.define("Accommodation", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pricePerNight: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

module.exports = Accommodation;
