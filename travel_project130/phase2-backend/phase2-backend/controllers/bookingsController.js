// Bookings controller — protected by requireAuth middleware on every route.
// Maps to Phase 1 AC 4.2 ("bookings stored with tenant_id, never visible across
// tenants"), TC-07 (cross-tenant isolation)

const { Booking, Flight, Accommodation } = require("../models");
const { calculateNights } = require("../utils/dateUtils");

// POST /api/bookings
// Creates a new booking owned by the authenticated user, scoped to their tenant.
async function create(req, res) {
  try {
    // 1. Read selection from the client. Note what we DO read: just IDs and dates.
    //    We never read totalAmount, userId, or tenantId from the body
    const { flightId, accommodationId, startDate, endDate } = req.body || {};

    // 2. KEYSTONE: pull userId and tenantId from req.user, which was set by the
    //    requireAuth middleware after verifying the JWT signature. Because these
    //    come from a token WE signed, a user from Tenant A cannot insert a booking
    //    row tagged Tenant B even if they try. Tenant isolation is structural.
    const { userId, tenantId } = req.user;

    // 3. Validate dates. Both are required so the booking has a clear stay window.
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }

    // 4. Require at least one travel item.
    if (!flightId && !accommodationId) {
      return res.status(400).json({ message: "At least one of flightId or accommodationId is required" });
    }

    // 5. Compute number of nights. Guards against negative or zero-night bookings.
    const nights = calculateNights(startDate, endDate);
    if (!nights) {
      return res.status(400).json({ message: "endDate must be after startDate" });
    }

    // 6. Server-side cost lookup for the flight. If the client sent a fake flightId
    //    we return 400 instead of silently charging $0.
    let flightCost = 0;
    if (flightId) {
      const flight = await Flight.findByPk(flightId);
      if (!flight) {
        return res.status(400).json({ message: `Unknown flightId: ${flightId}` });
      }
      flightCost = Number(flight.price);
    }

    // 7. Same pattern for accommodations: pricePerNight × nights. Done on the
    //    server so the client cannot tamper with the total.
    let accommodationCost = 0;
    if (accommodationId) {
      const accommodation = await Accommodation.findByPk(accommodationId);
      if (!accommodation) {
        return res.status(400).json({ message: `Unknown accommodationId: ${accommodationId}` });
      }
      accommodationCost = Number(accommodation.pricePerNight) * nights;
    }

    // 8. The authoritative total. This is the breakdown number that satisfies
    //    Phase 1 AC 1.3 (card displays flight cost, accommodation cost, combined total).
    const totalAmount = flightCost + accommodationCost;

    // 9. Create the booking row. Note tenantId and userId come from the JWT
    //    (step 2), not the body. Default status "Pending" matches the
    //    Pending → Confirmed → Cancelled lifecycle required by Spec §3.3.
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

    // 10. 201 Created with the persisted row.
    return res.status(201).json({ booking });
  } catch (err) {
    console.error("Create booking error:", err);
    return res.status(500).json({ message: "Failed to create booking" });
  }
}

// =============================================================================
// GET /api/bookings
// Lists bookings owned by the authenticated user, within their tenant.
// This is the endpoint that proves TC-07 — log in as Tenant B and the response
// contains zero of Tenant A's bookings.
// =============================================================================
async function list(req, res) {
  try {
    const { tenantId, userId } = req.user;

    // Filter by BOTH tenantId and userId. tenantId enforces multi-tenant isolation;
    // userId scopes results to "your bookings" within that tenant.
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

// =============================================================================
// GET /api/bookings/:id
// Fetches one booking by ID, scoped to the requesting user's tenant.
// =============================================================================
async function getById(req, res) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    // Filter by BOTH id AND tenantId. If a Tenant B user tries to guess a Tenant A
    // booking ID in the URL (the TC-07 attack), this query returns null because
    // the row's tenantId won't match — they get 404, never the actual data.
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

// =============================================================================
// PATCH /api/bookings/:id/cancel
// Transitions a booking to the "Cancelled" status. Implements the Cancelled leg
// of the Pending → Confirmed → Cancelled lifecycle from Spec §3.3.
// =============================================================================
async function cancel(req, res) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    // Same tenant-scoped lookup as getById — you can only cancel bookings that
    // belong to your own tenant. 404 for everything else.
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
