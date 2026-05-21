const flightsService = require("./flightsService");
const accommodationsService = require("./accommodationsService");
const activitiesService = require("./activitiesService");

function calculateNights(checkIn, checkOut) {
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const differenceInMs = endDate - startDate;
  const nights = differenceInMs / (1000 * 60 * 60 * 24);

  if (nights <= 0) {
    return null;
  }

  return nights;
}

async function getTripRecommendationsFromBudget(query) {
  const {
    destination,
    departDate,
    returnDate,
    travelers,
    guests,
    budget,
    priceFilter,
  } = query;

  if (!destination || !departDate || !returnDate || !travelers || !guests || !budget) {
    return {
      error: "destination, departDate, returnDate, travelers, guests, and budget are required",
    };
  }

  const numericBudget = Number(budget);
  const numericTravelers = Number(travelers);
  const numericGuests = Number(guests);

  if (Number.isNaN(numericBudget)) {
    return { error: "Budget must be a numeric value" };
  }

  if (numericBudget < 1 || numericBudget > 1000000) {
    return { error: "Budget must be between $1 and $1,000,000" };
  }

  if (
    Number.isNaN(numericTravelers) ||
    Number.isNaN(numericGuests) ||
    numericTravelers < 1 ||
    numericGuests < 1
  ) {
    return {
      error: "Travelers and guests must be valid numbers greater than 0",
    };
  }

  const nights = calculateNights(departDate, returnDate);

  if (!nights) {
    return {
      error: "returnDate must be after departDate",
    };
  }

  try {
    const [flights, accommodations, activities] = await Promise.all([
      flightsService.search({
        destination,
        departDate,
        returnDate,
        travelers: numericTravelers,
      }),
      accommodationsService.search({
        destination,
        checkIn: departDate,
        checkOut: returnDate,
        guests: numericGuests,
      }),
      activitiesService.search({
        destination,
        priceFilter,
      }),
    ]);

    const safeFlights = Array.isArray(flights) ? flights : [];
    const safeAccommodations = Array.isArray(accommodations) ? accommodations : [];
    const safeActivities = Array.isArray(activities) ? activities : [];

    const recommendations = [];

    for (const flight of safeFlights.slice(0, 10)) {
      for (const accommodation of safeAccommodations.slice(0, 10)) {
        const flightCost = Number(flight.price) || 0;
        const accommodationCost =
          Number(accommodation.totalPrice) ||
          (Number(accommodation.nightlyPrice) || 0) * nights;

        const activitiesSample = safeActivities.slice(0, 3);
        const activitiesCost = activitiesSample.reduce(
          (sum, activity) => sum + (Number(activity.price) || 0),
          0
        );

        const combinedTotal = flightCost + accommodationCost + activitiesCost;

        if (combinedTotal <= numericBudget) {
          recommendations.push({
            flight,
            accommodation,
            activities: activitiesSample,
            flightCost,
            accommodationCost,
            activitiesCost,
            combinedTotal,
            budget: numericBudget,
            remainingBudget: numericBudget - combinedTotal,
            travelers: numericTravelers,
            guests: numericGuests,
            currency: flight.currency || accommodation.currency || "USD",
          });
        }
      }
    }

    recommendations.sort((a, b) => a.combinedTotal - b.combinedTotal);

    if (recommendations.length === 0) {
      return {
        results: [],
        count: 0,
        message: `No trips found within $${numericBudget}.`,
      };
    }

    return {
      results: recommendations.slice(0, 10),
      count: Math.min(recommendations.length, 10),
      message: "Trips found within budget",
    };
  } catch (error) {
    console.error("Trip recommendations error:", error.response?.data || error.message);
    return {
      error: "Server error while building trip recommendations",
    };
  }
}

module.exports = {
  getTripRecommendationsFromBudget,
};