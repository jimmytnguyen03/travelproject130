const express = require("express");
const router = express.Router();
const { searchFlights } = require("../controllers/flightsController");

router.get("/search", searchFlights);

module.exports = router;