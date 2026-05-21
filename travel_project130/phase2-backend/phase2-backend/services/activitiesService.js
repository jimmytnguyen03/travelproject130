const activities = require("../data/activities.json");
const { matchesPriceFilter, getPriceLabel } = require("../utils/priceFilters");

async function search({ destination, priceFilter }) {
  return activities
    .filter(() => destination.toLowerCase() === "lon" || destination.toLowerCase() === "london")
    .filter((item) => matchesPriceFilter(item.price, priceFilter))
    .map((item) => ({
      activityId: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      currency: "USD",
      priceLabel: getPriceLabel(item.price),
    }));
}

module.exports = { search };