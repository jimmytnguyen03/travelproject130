const bookingApi = require("../config/bookingApi");
const activities = require("../data/activities.json");
const { matchesPriceFilter, getPriceLabel } = require("../utils/priceFilters");

// Map common destination names to Booking attraction location IDs
const DESTINATION_IDS = {
  london: "eyJ1ZmkiOi0yNjAxODg5fQ==",
  lon: "eyJ1ZmkiOi0yNjAxODg5fQ==",
  mumbai: "eyJ1ZmkiOi0yMDkyMTc0fQ==",
  bom: "eyJ1ZmkiOi0yMDkyMTc0fQ==",
};

async function search({ destination, priceFilter, startDate, endDate }) {
  const normalizedDestination = String(destination || "").trim().toLowerCase();
  const attractionId = DESTINATION_IDS[normalizedDestination];

  try {
    if (attractionId) {
      const response = await bookingApi.get("/attraction/searchAttractions", {
        params: {
          id: attractionId,
          startDate,
          endDate,
          sortBy: "trending",
          page: 1,
          currency_code: "USD",
          languagecode: "en-us",
        },
      });

      const products = response.data?.data?.products || [];

      let results = products.map((item) => {
        const price =
          Number(
            item.representativePrice?.publicAmount ??
            item.representativePrice?.chargeAmount ??
            0
          ) || 0;

        return {
          activityId: item.id,
          name: item.name || "Unknown Activity",
          category:
            item.__typename === "AttractionsProduct"
              ? "Attraction"
              : "Activity",
          price,
          currency: item.representativePrice?.currency || "USD",
          priceLabel: getPriceLabel(price),
        };
      });

      if (priceFilter) {
        results = results.filter((item) =>
          matchesPriceFilter(item.price, priceFilter)
        );
      }

      if (results.length > 0) {
        return results;
      }
    }
  } catch (error) {
    console.error(
      "Booking API activities fallback:",
      error.response?.data || error.message
    );
  }

  // Local fallback
  return activities
    .filter((item) =>
      item.location.toLowerCase().includes(normalizedDestination)
    )
    .filter((item) => matchesPriceFilter(item.price, priceFilter))
    .map((item) => ({
      activityId: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      currency: item.currency || "USD",
      priceLabel: getPriceLabel(item.price),
    }));
}

module.exports = { search };