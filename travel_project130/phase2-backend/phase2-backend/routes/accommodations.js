const express = require("express");
const router = express.Router();
const { searchAccommodations } = require("../controllers/accommodationsController");

router.get("/search", searchAccommodations);

module.exports = router;