require("dotenv").config();

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger");

const { sequelize } = require("./models");
const flightsRoutes = require("./routes/flights");
const accommodationsRoutes = require("./routes/accommodations");
const activitiesRoutes = require("./routes/activities");
const tripsRoutes = require("./routes/trips");
const authRoutes = require("./routes/auth");
const bookingsRoutes = require("./routes/bookings");
const tenantsRoutes = require("./routes/tenants");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Phase 2 Search API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/flights", flightsRoutes);
app.use("/api/accommodations", accommodationsRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/tenants", tenantsRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");
    await sequelize.sync();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Swagger docs on http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();