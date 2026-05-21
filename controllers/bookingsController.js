const { Booking, Flight, Accommodation } = require("../models");
const { calculateNights } = require("../utils/dateUtils");

async function create(req, res) {
  try {
    const { flightId, accommodationId, startDate, endDate } = req.body || {};
    const { userId, tenantId } = req.user;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }

    if (!flightId && !accommodationId) {
      return res.status(400).json({ message: "At least one of flightId or accommodationId is required" });
    }

    const nights = calculateNights(startDate, endDate);
    if (!nights) {
      return res.status(400).json({ message: "endDate must be after startDate" });
    }

    let flightCost = 0;
    if (flightId) {
      const flight = await Flight.findByPk(flightId);
      if (!flight) {
        return res.status(400).json({ message: `Unknown flightId: ${flightId}` });
      }
      flightCost = Number(flight.price);
    }

    let accommodationCost = 0;
    if (accommodationId) {
      const accommodation = await Accommodation.findByPk(accommodationId);
      if (!accommodation) {
        return res.status(400).json({ message: `Unknown accommodationId: ${accommodationId}` });
      }
      accommodationCost = Number(accommodation.pricePerNight) * nights;
    }

    const totalAmount = flightCost + accommodationCost;

    const booking = await Booking.create({
      tenantId,
      userId,
      flightId: flightId || null,
      accommodationId: accommodationId || null,
      totalAmount,
      startDate,
      endDate,
      status: "Pending",
    });

    return res.status(201).json({ booking });
  } catch (err) {
    console.error("Create booking error:", err);
    return res.status(500).json({ message: "Failed to create booking" });
  }
}

async function list(req, res) {
  try {
    const { tenantId, userId } = req.user;

    const bookings = await Booking.findAll({
      where: { tenantId, userId },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ results: bookings, count: bookings.length });
  } catch (err) {
    console.error("List bookings error:", err);
    return res.status(500).json({ message: "Failed to list bookings" });
  }
}

async function getById(req, res) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const booking = await Booking.findOne({ where: { id, tenantId } });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({ booking });
  } catch (err) {
    console.error("Get booking error:", err);
    return res.status(500).json({ message: "Failed to fetch booking" });
  }
}

async function cancel(req, res) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const booking = await Booking.findOne({ where: { id, tenantId } });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.status = "Cancelled";
    await booking.save();

    return res.status(200).json({ booking });
  } catch (err) {
    console.error("Cancel booking error:", err);
    return res.status(500).json({ message: "Failed to cancel booking" });
  }
}

module.exports = { create, list, getById, cancel };
