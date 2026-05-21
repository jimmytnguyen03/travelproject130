const activitiesService = require("../services/activitiesService");
const { validateActivitySearch } = require("../utils/validators");

async function searchActivities(req, res) {
  try {
    const error = validateActivitySearch(req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { destination, priceFilter } = req.query;

    const results = await activitiesService.search({
      destination,
      priceFilter,
    });

    return res.status(200).json({
      results,
      count: results.length,
      message: results.length ? "Activities found" : "No activities found",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to search activities" });
  }
}

module.exports = { searchActivities };