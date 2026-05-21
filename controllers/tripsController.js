const { getTripRecommendationsFromBudget } = require("../services/tripService");

async function getTripRecommendations(req, res) {
  try {
    const result = await getTripRecommendationsFromBudget(req.query);

    if (result.error) {
      return res.status(400).json({
        message: result.error,
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: "Server error while getting trip recommendations",
    });
  }
}

module.exports = {
  getTripRecommendations,
};