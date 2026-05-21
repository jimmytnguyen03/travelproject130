const flightsService = require("../services/flightsService");
const { validateFlightSearch } = require("../utils/validators");

async function searchFlights(req, res) {
  try {
    const error = validateFlightSearch(req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { destination, departDate, returnDate, travelers, budget } = req.query;

    const results = await flightsService.search({
      destination,
      departDate,
      returnDate,
      travelers: Number(travelers),
      budget,
    });

    return res.status(200).json({
      results,
      count: results.length,
      message: results.length ? "Flights found" : "No flights found",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to search flights" });
  }
}

module.exports = { searchFlights };