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


// POST /api/v1/bookings
router.post("/bookings", async (req, res) => {
  try {
    console.log("Incoming booking body:", req.body);

    // Create or find demo tenant for Phase 3
    let tenant = await Tenant.findOne({
      where: { domain: "agenta.local" }
    });

    if (!tenant) {
      tenant = await Tenant.create({
        name: "TravelEase Alpha",
        domain: "agenta.local",
      });
    }

    // Create or find demo user for Phase 3
    let user = await User.findOne({
      where: { email: "john.doe@example.com" }
    });

    if (!user) {
      const passwordHash = await bcrypt.hash("CMPE-131@2026", 10);

      user = await User.create({
        name: "John Doe",
        email: "john.doe@example.com",
        passwordHash,
        tenantId: tenant.id,
      });
    }

    const flightReservations = req.body.flight_reservations || req.body.flightReservations || [];
    const hotelReservations = req.body.hotel_reservations || req.body.hotelReservations || [];

    const flightTotal = flightReservations.reduce((sum, flight) => {
      return sum + Number(
        flight.Total_Price ||
        flight.totalPrice ||
        flight.price ||
        flight.Price ||
        flight.Total_Amount ||
        0
      );
    }, 0);

    const hotelTotal = hotelReservations.reduce((sum, hotel) => {
      return sum + Number(
        hotel.Total_Price ||
        hotel.totalPrice ||
        hotel.price ||
        hotel.Price ||
        hotel.Total_Amount ||
        0
      );
    }, 0);

    const totalAmount =
      Number(req.body.totalAmount) ||
      Number(req.body.totalPrice) ||
      Number(req.body.Total_Amount) ||
      Number(req.body.total) ||
      flightTotal + hotelTotal ||
      1;

    const bookingPayload = {
      ...req.body,

      userId: user.id,
      tenantId: tenant.id,
      totalAmount,

      status: req.body.status || "confirmed",
      startDate: req.body.startDate || req.body.Start_Date,
      endDate: req.body.endDate || req.body.End_Date,
    };

    const booking = await Booking.create(bookingPayload);

    return res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Booking create error:", error);

    return res.status(500).json({
      message: "Failed to create booking",
      error: error.message,
    });
  }
});

// POST /api/v1/bookings
router.post("/bookings", async (req, res) => {
  try {
    console.log("Incoming booking body:", req.body);

    const requestedUserId = req.body.userId || req.body.User_Id || req.body.User_ID || 1;
    const requestedTenantId = req.body.tenantId || req.body.Agent_Id || req.body.agentId || 1;

    // Use requested IDs if they exist, otherwise fall back to the first real DB records
    let tenant = await Tenant.findByPk(requestedTenantId);
    if (!tenant) {
      tenant = await Tenant.findOne();
    }

    let user = await User.findByPk(requestedUserId);
    if (!user) {
      user = await User.findOne();
    }

    if (!tenant) {
      return res.status(500).json({
        message: "Failed to create booking",
        error: "No tenant exists in the database. Seed or create a tenant first."
      });
    }

    if (!user) {
      return res.status(500).json({
        message: "Failed to create booking",
        error: "No user exists in the database. Seed or create a user first."
      });
    }

    const flightReservations = req.body.flight_reservations || req.body.flightReservations || [];
    const hotelReservations = req.body.hotel_reservations || req.body.hotelReservations || [];

    const flightTotal = flightReservations.reduce((sum, flight) => {
      return sum + Number(
        flight.Total_Price ||
        flight.totalPrice ||
        flight.price ||
        flight.Price ||
        0
      );
    }, 0);

    const hotelTotal = hotelReservations.reduce((sum, hotel) => {
      return sum + Number(
        hotel.Total_Price ||
        hotel.totalPrice ||
        hotel.price ||
        hotel.Price ||
        0
      );
    }, 0);

    const totalAmount =
      Number(req.body.totalAmount) ||
      Number(req.body.totalPrice) ||
      Number(req.body.Total_Amount) ||
      Number(req.body.total) ||
      flightTotal + hotelTotal ||
      1;

    const bookingPayload = {
      ...req.body,

      // Use real database IDs to avoid foreign key errors
      userId: user.id,
      tenantId: tenant.id,

      totalAmount,
      status: req.body.status || "confirmed",
      startDate: req.body.startDate || req.body.Start_Date,
      endDate: req.body.endDate || req.body.End_Date,
    };

    const booking = await Booking.create(bookingPayload);

    return res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Booking create error:", error);

    return res.status(500).json({
      message: "Failed to create booking",
      error: error.message,
    });
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