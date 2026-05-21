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

function normalizeDate(dateValue) {
  if (!dateValue) return dateValue;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
    const [month, day, year] = dateValue.split("/");
    return `${year}-${month}-${day}`;
  }

  return dateValue;
}

function normalizeDestination(query) {
  return (
    query.destination ||
    query.dest_name ||
    query.destName ||
    query.arrivalAirport ||
    query.to ||
    "LON"
  );
}

// Helper: convert frontend date formats if needed
function normalizeDate(dateValue) {
  if (!dateValue) return dateValue;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
    const [month, day, year] = dateValue.split("/");
    return `${year}-${month}-${day}`;
  }

  return dateValue;
}

// GET /api/v1/flights/search
router.get("/flights/search", async (req, res) => {
  try {
    const origin =
      req.query.origin ||
      req.query.from ||
      req.query.departureAirport ||
      "SFO";

    const destination =
      req.query.destination ||
      req.query.dest_name ||
      req.query.to ||
      req.query.arrivalAirport ||
      "LON";

    const departDate = normalizeDate(
      req.query.departDate ||
      req.query.depart_date ||
      req.query.departureDate ||
      req.query.start_date ||
      "2026-06-10"
    );

    const returnDate = normalizeDate(
      req.query.returnDate ||
      req.query.return_date ||
      req.query.end_date ||
      "2026-06-17"
    );

    const travelers =
      req.query.travelers ||
      req.query.adults ||
      req.query.passengers ||
      1;

    const budget = req.query.budget;

    console.log("Phase 3 flight search params:", {
      origin,
      destination,
      departDate,
      returnDate,
      travelers,
      budget,
      rawQuery: req.query,
    });

    let results = await flightsService.search({
      origin,
      destination,
      departDate,
      returnDate,
      travelers,
      budget,
    });

    // Fallback data for Phase 3 UI demo if external API/sample service returns empty
    if (!results || results.length === 0) {
      results = [
        {
          id: "FL001",
          flightId: "FL001",
          airline: "Budget Air",
          departureAirport: origin,
          arrivalAirport: destination,
          departDate,
          returnDate,
          travelers: Number(travelers),
          price: 620,
          currency: "USD",
        },
        {
          id: "FL002",
          flightId: "FL002",
          airline: "Student Sky",
          departureAirport: origin,
          arrivalAirport: destination,
          departDate,
          returnDate,
          travelers: Number(travelers),
          price: 710,
          currency: "USD",
        },
        {
          id: "FL003",
          flightId: "FL003",
          airline: "Demo Atlantic",
          departureAirport: origin,
          arrivalAirport: destination,
          departDate,
          returnDate,
          travelers: Number(travelers),
          price: 840,
          currency: "USD",
        },
      ];
    }

    return res.json({
  data: results,
  results,
  count: results.length,
  message: results.length ? "Flights found" : "No flights found",
});
  } catch (error) {
    console.error("Phase 3 flights adapter error:", error);

    return res.status(500).json({
      message: "Failed to fetch flights",
    });
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
  data: results,
  results,
  count: results.length,
  message: results.length ? "Hotels found" : "No hotels found",
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