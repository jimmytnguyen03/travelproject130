const accommodationsService = require("../services/accommodationsService");
const { validateAccommodationSearch } = require("../utils/validators");
const { calculateNights } = require("../utils/dateUtils");

async function searchAccommodations(req, res) {
  try {
    const error = validateAccommodationSearch(req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { destination, checkIn, checkOut, budget } = req.query;
    const nights = calculateNights(checkIn, checkOut);

    if (!nights) {
      return res.status(400).json({ message: "checkOut must be after checkIn" });
    }

    const results = await accommodationsService.search({
      destination,
      nights,
      budget,
    });

    return res.status(200).json({
      results,
      count: results.length,
      message: results.length ? "Accommodations found" : "No accommodations found",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to search accommodations" });
  }
}

module.exports = { searchAccommodations };