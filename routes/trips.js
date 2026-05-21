const express = require("express");
const router = express.Router();
const { getTripRecommendations } = require("../controllers/tripsController");

router.get("/recommendations", getTripRecommendations);

module.exports = router;