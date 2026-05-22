const express = require("express");
const flightsService = require("./services/flightsService");
const accommodationsService = require("./services/accommodationsService");
const activitiesService = require("./services/activitiesService");
const { getTripRecommendationsFromBudget } = require("./services/tripService");
const { User, Tenant, Booking } = require("./models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const router = express.Router();

const bookingDetailsStore = new Map();

let latestBookingDetails = {
  bookingId: null,
  flightReservations: [],
  hotelReservations: [],
};

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
    const destination =
      req.query.destination ||
      req.query.dest_name ||
      req.query.destName ||
      "LON";

    const priceFilter =
      req.query.priceFilter ||
      req.query.price_filter ||
      "free";

    console.log("Phase 3 attractions search params:", {
      destination,
      priceFilter,
      rawQuery: req.query,
    });

    let results = [];

    try {
      results = await activitiesService.search({
        destination,
        priceFilter,
      });
    } catch (serviceError) {
      console.error("Activities service failed, using fallback:", serviceError.message);
      results = [];
    }

    // Fallback demo data so the Activities tab does not crash if external API fails
    if (!results || results.length === 0) {
      results = [
        {
          id: "ACT001",
          activityId: "ACT001",
          name: "Free Walking Tour",
          category: "Walking Tour",
          location: "Central London",
          price: 0,
          currency: "USD",
          priceLabel: "Free",
          duration: "2 hours",
          rating: 4.7,
        },
        {
          id: "ACT002",
          activityId: "ACT002",
          name: "British Museum Visit",
          category: "Museum",
          location: "Bloomsbury",
          price: 0,
          currency: "USD",
          priceLabel: "Free",
          duration: "Flexible",
          rating: 4.8,
        },
        {
          id: "ACT003",
          activityId: "ACT003",
          name: "London Riverside Walk",
          category: "Sightseeing",
          location: "River Thames",
          price: 0,
          currency: "USD",
          priceLabel: "Free",
          duration: "1.5 hours",
          rating: 4.6,
        },
      ];
    }

    return res.json({
      data: results,
      results,
      count: results.length,
      message: results.length ? "Attractions found" : "No attractions found",
    });
  } catch (error) {
    console.error("Phase 3 attractions adapter error:", error);

    return res.status(500).json({
      message: "Failed to fetch attractions",
      error: error.message,
    });
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

      flightReservations,
      hotelReservations,
    };

    const booking = await Booking.create(bookingPayload);

bookingDetailsStore.set(booking.id, {
  flightReservations,
  hotelReservations,
});

latestBookingDetails = {
  bookingId: booking.id,
  flightReservations,
  hotelReservations,
};

console.log("Saved booking details:", latestBookingDetails);

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

    let tenant = await Tenant.findOne({
      where: { domain: "agenta.local" }
    });

    if (!tenant) {
      tenant = await Tenant.create({
        name: "TravelEase Alpha",
        domain: "agenta.local",
      });
    }

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
        flight.Rate ||
        flight.Total_Price ||
        flight.totalPrice ||
        flight.price ||
        0
      );
    }, 0);

    const hotelTotal = hotelReservations.reduce((sum, hotel) => {
      return sum + Number(
        hotel.Rate ||
        hotel.Total_Price ||
        hotel.totalPrice ||
        hotel.price ||
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
      userId: user.id,
      tenantId: tenant.id,
      totalAmount,
      status: "Confirmed",
      startDate: req.body.startDate || req.body.Start_Date,
      endDate: req.body.endDate || req.body.End_Date,
    };

    const booking = await Booking.create(bookingPayload);

    // IMPORTANT: store reservation arrays in memory for My Trips display
    bookingDetailsStore.set(booking.id, {
      flightReservations,
      hotelReservations,
    });

    console.log("Saved booking details:", {
      bookingId: booking.id,
      flightReservations,
      hotelReservations,
    });

    return res.status(201).json({
      message: "Booking created successfully",
      booking: {
        ...booking.toJSON(),
        flightReservations,
        hotelReservations,
        flight_reservations: flightReservations,
        hotel_reservations: hotelReservations,
      },
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
    console.log("Bookings query:", req.query);

    const requestedUserId =
      req.query.userId ||
      req.query.user_id ||
      req.query.User_Id ||
      req.query.User_ID;

    const requestedTenantId =
      req.query.tenantId ||
      req.query.tenant_id ||
      req.query.agentId ||
      req.query.agent_id ||
      req.query.Agent_Id;

    const where = {};

    if (requestedUserId) {
      where.userId = requestedUserId;
    }

    if (requestedTenantId) {
      where.tenantId = requestedTenantId;
    }

    let bookings = await Booking.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    if (bookings.length === 0) {
      bookings = await Booking.findAll({
        order: [["createdAt", "DESC"]],
      });
    }

const normalizedBookings = bookings.map((booking, index) => {
  const raw = booking.toJSON();

  const storedDetails = bookingDetailsStore.get(raw.id);

  let flightReservations = storedDetails?.flightReservations || [];
  let hotelReservations = storedDetails?.hotelReservations || [];

  // Phase 3 fallback: attach latest reservation details to newest booking
  // if the database row itself does not store those arrays.
  if (
    index === 0 &&
    flightReservations.length === 0 &&
    hotelReservations.length === 0 &&
    latestBookingDetails.flightReservations.length > 0
  ) {
    flightReservations = latestBookingDetails.flightReservations;
    hotelReservations = latestBookingDetails.hotelReservations;
  }

  return {
    ...raw,

    bookingId: raw.id,
    Booking_Id: raw.id,

    userId: raw.userId,
    User_Id: raw.userId,

    agentId: raw.tenantId,
    Agent_Id: raw.tenantId,

    startDate: raw.startDate,
    Start_Date: raw.startDate,

    endDate: raw.endDate,
    End_Date: raw.endDate,

    totalAmount: raw.totalAmount,
    Total_Amount: raw.totalAmount,

    status: raw.status,

    flightReservations,
    hotelReservations,

    flight_reservations: flightReservations,
    hotel_reservations: hotelReservations,
  };
});

console.log("Returning normalized bookings:", normalizedBookings);

    return res.json({
      data: normalizedBookings,
      results: normalizedBookings,
      count: normalizedBookings.length,
      message: normalizedBookings.length ? "Bookings found" : "No bookings found",
    });
  } catch (error) {
    console.error("Failed to fetch bookings:", error);

    return res.status(500).json({
      message: "Failed to fetch bookings",
      error: error.message,
    });
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

async function handlePhase3Login(req, res) {
  try {
const body = req.body || {};

const email = req.query.email || body.email;
const password = req.query.password || body.password;
let tenantDomain = req.query.tenantDomain || body.tenantDomain;

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required",
      });
    }

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
          tenantName: tenantDomain === "agentb.local" ? "Travel Agency B" : "TravelEase Alpha",
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
        },
      ],
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
      message: "Login successful",
      token,
      User_ID: user.id,
      user: {
        id: user.id,
        User_ID: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        tenantDomain: user.Tenant.domain,
        tenantName: user.Tenant.name,
      },
    });
  } catch (error) {
    console.error("Phase 3 login failed:", error);
    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
}

// GET /api/v1/users/login
router.get("/users/login", handlePhase3Login);

// POST /api/v1/users/login
router.post("/users/login", handlePhase3Login);

module.exports = router;