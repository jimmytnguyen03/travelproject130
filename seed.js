const bcrypt = require("bcryptjs");
const { sequelize, Tenant, User, Flight, Accommodation } = require("./models");
const flightsData = require("./data/flights.json");
const accommodationsData = require("./data/accommodations.json");

async function seed() {
  await sequelize.sync({ force: true });
  console.log("Database synced (tables dropped and recreated).");

  const tenants = await Tenant.bulkCreate([
    {
      name: "Agency A",
      domain: "agency-a.com",
      logoUrl: "https://placehold.co/200x60/0066cc/ffffff?text=Agency+A",
      themeColor: "#0066cc",
    },
    {
      name: "Agency B",
      domain: "agency-b.com",
      logoUrl: "https://placehold.co/200x60/2e7d32/ffffff?text=Agency+B",
      themeColor: "#2e7d32",
    },
    {
      name: "Agency C",
      domain: "agency-c.com",
      logoUrl: null,
      themeColor: null,
    },
  ]);
  console.log(`Inserted ${tenants.length} tenants.`);

  const passwordHash = await bcrypt.hash("password123", 10);
  const users = await User.bulkCreate([
    {
      tenantId: tenants[0].id,
      email: "violet@agency-a.com",
      passwordHash,
      name: "Violet Backpacker",
      role: "customer",
    },
    {
      tenantId: tenants[1].id,
      email: "user@agency-b.com",
      passwordHash,
      name: "Tenant B User",
      role: "customer",
    },
    {
      tenantId: tenants[2].id,
      email: "user@agency-c.com",
      passwordHash,
      name: "Tenant C User",
      role: "customer",
    },
  ]);
  console.log(`Inserted ${users.length} users.`);

  await Flight.bulkCreate(flightsData);
  console.log(`Inserted ${flightsData.length} flights.`);

  await Accommodation.bulkCreate(
    accommodationsData.map((a) => ({
      id: a.id,
      name: a.name,
      location: a.location,
      pricePerNight: a.pricePerNight,
    }))
  );
  console.log(`Inserted ${accommodationsData.length} accommodations.`);

  console.log("\nSeed complete. Default password for all users: password123");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
