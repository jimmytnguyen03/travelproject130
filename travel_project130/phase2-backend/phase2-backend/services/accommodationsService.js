const accommodations = require("../data/accommodations.json");

async function search({ destination, nights, budget }) {
  let results = accommodations
    .filter(() => destination.toLowerCase() === "lon" || destination.toLowerCase() === "london")
    .map((item) => ({
      accommodationId: item.id,
      name: item.name,
      location: item.location,
      nightlyPrice: item.pricePerNight,
      nights,
      totalPrice: item.pricePerNight * nights,
      currency: "USD",
    }));

  if (budget !== undefined) {
    const max = Number(budget);
    results = results.filter((item) => item.totalPrice <= max);
  }

  return results;
}

module.exports = { search };