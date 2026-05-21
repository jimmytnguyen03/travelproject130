const bookingApi = require("../config/bookingApi");
const accommodations = require("../data/accommodations.json");

async function getDestinationId(cityName) {
  const response = await bookingApi.get("/hotels/searchDestination", {
    params: {
      query: cityName,
      languagecode: "en-us",
    },
  });

  const results =
    response.data?.data ||
    response.data?.result ||
    response.data ||
    [];

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`No hotel destination found for ${cityName}`);
  }

  const best = results[0];

  return {
    destId: best.dest_id || best.destId || best.id,
    searchType: best.search_type || best.searchType || "CITY",
  };
}

async function search({ destination, checkIn, checkOut, guests, budget }) {
  const nights = getNights(checkIn, checkOut);

  try {
    const { destId, searchType } = await getDestinationId(destination);

    const response = await bookingApi.get("/hotels/searchHotels", {
      params: {
        dest_id: destId,
        search_type: searchType,
        arrival_date: checkIn,
        departure_date: checkOut,
        adults: Number(guests) || 1,
        room_qty: 1,
        page_number: 1,
        units: "metric",
        temperature_unit: "c",
        languagecode: "en-us",
        currency_code: "USD",
      },
    });

    const hotels =
      response.data?.data?.hotels ||
      response.data?.result ||
      response.data?.data ||
      [];

    let results = hotels.map((item, index) => {
      const property = item.property || item.hotel || item;

      const nightlyPrice =
        Number(
          property.priceBreakdown?.grossPrice?.value ??
          property.price?.lead?.amount ??
          property.min_total_price ??
          property.price ??
          0
        ) || 0;

      return {
        accommodationId: property.id || `ACC${index + 1}`,
        name: property.name || "Unknown Stay",
        location:
          property.wishlistName ||
          property.accessibilityLabel ||
          property.city ||
          destination,
        nightlyPrice,
        nights,
        totalPrice: nightlyPrice * nights,
        currency:
          property.priceBreakdown?.grossPrice?.currency ||
          property.currency ||
          "USD",
      };
    });

    if (budget !== undefined) {
      const max = Number(budget);
      results = results.filter((item) => item.totalPrice <= max);
    }

    if (results.length > 0) {
      return results;
    }
  } catch (error) {
    console.error("Booking API accommodations error message:", error.message);
    console.error("Booking API accommodations error code:", error.code);
    console.error("Booking API accommodations response:", error.response?.data);
  }

  let fallback = accommodations
    .filter((item) =>
      item.location.toLowerCase().includes(String(destination).toLowerCase())
    )
    .map((item) => {
      const nightlyPrice = Number(
        item.nightlyPrice ?? item.pricePerNight ?? item.price ?? 0
      );

      return {
        accommodationId: item.id,
        name: item.name,
        location: item.location,
        nightlyPrice,
        nights,
        totalPrice: nightlyPrice * nights,
        currency: item.currency || "USD",
      };
    });

  if (budget !== undefined) {
    const max = Number(budget);
    fallback = fallback.filter((item) => item.totalPrice <= max);
  }

  return fallback;
}

function getNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

module.exports = { search };