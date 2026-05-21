const accommodationsService = require("../services/accommodationsService");
const { validateAccommodationSearch } = require("../utils/validators");

async function searchAccommodations(req, res) {
  try {
    const error = validateAccommodationSearch(req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { destination, checkIn, checkOut, guests, budget } = req.query;

    const results = await accommodationsService.search({
      destination,
      checkIn,
      checkOut,
      guests,
      budget,
    });

    return res.status(200).json({
      results,
      count: results.length,
      message: results.length
        ? "Accommodations found"
        : "No accommodations found",
    });
  } catch (error) {
    console.error("Accommodations controller error:", error.message);
    return res.status(500).json({ message: "Failed to search accommodations" });
  }
}

module.exports = { searchAccommodations };