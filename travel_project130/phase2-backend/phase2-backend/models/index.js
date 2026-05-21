const sequelize = require("../config/database");
const Tenant = require("./Tenant");
const User = require("./User");
const Flight = require("./Flight");
const Accommodation = require("./Accommodation");
const Booking = require("./Booking");

Tenant.hasMany(User, { foreignKey: "tenantId", onDelete: "CASCADE" });
User.belongsTo(Tenant, { foreignKey: "tenantId" });

Tenant.hasMany(Booking, { foreignKey: "tenantId", onDelete: "CASCADE" });
Booking.belongsTo(Tenant, { foreignKey: "tenantId" });

User.hasMany(Booking, { foreignKey: "userId", onDelete: "CASCADE" });
Booking.belongsTo(User, { foreignKey: "userId" });

Flight.hasMany(Booking, { foreignKey: "flightId" });
Booking.belongsTo(Flight, { foreignKey: "flightId" });

Accommodation.hasMany(Booking, { foreignKey: "accommodationId" });
Booking.belongsTo(Accommodation, { foreignKey: "accommodationId" });

module.exports = {
  sequelize,
  Tenant,
  User,
  Flight,
  Accommodation,
  Booking,
};
