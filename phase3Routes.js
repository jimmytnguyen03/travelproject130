const express = require("express");
const flightsService = require("./services/flightsService");
const accommodationsService = require("./services/accommodationsService");
const activitiesService = require("./services/activitiesService");
const { getTripRecommendationsFromBudget } = require("./services/tripService");
const { User, Tenant, Booking } = require("./models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const router = express.Router();

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-secret";
}

// GET /api/v1/flights/search
router.get("/flights/search", async (req, res) => {
  try {
    const { destination, departDate, returnDate, travelers, budget } = req.query;

    const results = await flightsService.search({
      destination,
      departDate,
      returnDate,
      travelers,
      budget,
    });

    return res.json({
      results,
      count: results.length,
      message: results.length ? "Flights found" : "No flights found",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch flights" });
  }
});

// GET /api/v1/hotels/search
router.get("/hotels/search", async (req, res) => {
  try {
    const { destination, checkIn, checkOut, guests, budget } = req.query;

    const results = await accommodationsService.search({
      destination,
      checkIn,
      checkOut,
      guests,
      budget,
    });

    return res.json({
      results,
      count: results.length,
      message: results.length ? "Hotels found" : "No hotels found",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch hotels" });
  }
});

// GET /api/v1/attractions/search
router.get("/attractions/search", async (req, res) => {
  try {
    const { destination, priceFilter } = req.query;

    const results = await activitiesService.search({
      destination,
      priceFilter,
    });

    return res.json({
      results,
      count: results.length,
      message: results.length ? "Attractions found" : "No attractions found",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch attractions" });
  }
});


//~~  GET /api/v1/users/login~~
// Changed to POST
router.get("/users/login", async (req, res) => {
  try {
const { email, password } = req.query;
let { tenantDomain } = req.query;

if (!email || !password) {
  return res.status(400).json({
    message: "email and password are required"
  });
}

if (!tenantDomain) {
  tenantDomain = "agenta.local";
}

    // Default tenant for Phase 3 testing if frontend does not send tenantDomain
    if (!tenantDomain) {
      tenantDomain = "agenta.local";
    }

    // Phase 3 demo login fallback
    if (email === "john.doe@example.com" && password === "CMPE-131@2026") {
      return res.json({
        message: "Login successful",
        token: jwt.sign(
          {
            userId: 1,
            tenantId: tenantDomain === "agentb.local" ? 2 : 1,
          },
          getJwtSecret(),
          { expiresIn: "24h" }
        ),
        User_ID: 1,
        user: {
          id: 1,
          User_ID: 1,
          email: "john.doe@example.com",
          name: "John Doe",
          tenantId: tenantDomain === "agentb.local" ? 2 : 1,
          tenantDomain,
          tenantName: tenantDomain === "agentb.local" ? "Travel Agency B" : "Travel Agency A",
        },
      });
    }


    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Tenant,
          where: { domain: tenantDomain },
          attributes: ["id", "name", "domain"],
        }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
      },
      getJwtSecret(),
      { expiresIn: "24h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        tenantDomain: user.tenantDomain,
        tenantName: user.Tenant.name,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
});

// POST /api/v1/bookings
router.post("/bookings", async (req, res) => {
  try {
    const booking = await Booking.create(req.body);
    return res.status(201).json({ booking });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create booking" });
  }
});

// GET /api/v1/bookings/by-agent-user
router.get("/bookings/by-agent-user", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const bookings = await Booking.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      results: bookings,
      count: bookings.length,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// GET /api/v1/bookings/:id
router.get("/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json({ booking });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch booking" });
  }
});

// PUT /api/v1/bookings/:id
router.put("/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await booking.update(req.body);
    return res.json({ booking });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update booking" });
  }
});

// GET /api/v1/trips/recommendations
router.get("/trips/recommendations", async (req, res) => {
  try {
    const result = await getTripRecommendationsFromBudget(req.query);

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch trip recommendations" });
  }
});

module.exports = router;