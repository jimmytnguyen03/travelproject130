const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Flight = sequelize.define("Flight", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  airline: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  departureAirport: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  arrivalAirport: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  departDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  returnDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

module.exports = Flight;
