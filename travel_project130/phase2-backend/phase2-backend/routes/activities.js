const express = require("express");
const router = express.Router();
const { searchActivities } = require("../controllers/activitiesController");

router.get("/search", searchActivities);

module.exports = router;