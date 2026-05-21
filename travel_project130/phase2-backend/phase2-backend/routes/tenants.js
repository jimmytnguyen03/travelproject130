const express = require("express");
const router = express.Router();
const { getBranding } = require("../controllers/tenantsController");

router.get("/:domain/branding", getBranding);

module.exports = router;
