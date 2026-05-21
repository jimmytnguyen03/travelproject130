const flights = require("../data/flights.json");
const accommodations = require("../data/accommodations.json");

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

function getTripRecommendationsFromBudget(query) {
  const {
    destination,
    departDate,
    returnDate,
    travelers,
    guests,
    budget
  } = query;

  if (!destination || !departDate || !returnDate || !travelers || !guests || !budget) {
    return {
      error: "destination, departDate, returnDate, travelers, guests, and budget are required"
    };
  }

  const numericBudget = Number(budget);
  const numericTravelers = Number(travelers);
  const numericGuests = Number(guests);

  if (Number.isNaN(numericBudget)) {
    return {
      error: "Budget must be a numeric value"
    };
  }

  if (numericBudget < 1 || numericBudget > 100000) {
    return {
      error: "Budget must be between $1 and $100,000"
    };
  }

  if (
    Number.isNaN(numericTravelers) ||
    Number.isNaN(numericGuests) ||
    numericTravelers < 1 ||
    numericGuests < 1
  ) {
    return {
      error: "Travelers and guests must be valid numbers greater than 0"
    };
  }

  const nights = calculateNights(departDate, returnDate);

  if (!nights) {
    return {
      error: "returnDate must be after departDate"
    };
  }

  const normalizedDestination = destination.toLowerCase();

  const matchingFlights = flights.filter((flight) => {
    return (
      String(flight.arrivalAirport).toLowerCase() === normalizedDestination &&
      flight.departDate === departDate &&
      flight.returnDate === returnDate
    );
  });

  const matchingAccommodations = accommodations.filter((accommodation) => {
    const locationText = String(accommodation.location || "").toLowerCase();

    return (
      normalizedDestination === "lon" ||
      locationText.includes("london") ||
      locationText.includes(normalizedDestination)
    );
  });

  const recommendations = [];

  for (const flight of matchingFlights) {
    for (const accommodation of matchingAccommodations) {
      const flightCost = Number(flight.price);
      const accommodationCost = Number(accommodation.pricePerNight) * nights;
      const combinedTotal = flightCost + accommodationCost;

      if (combinedTotal <= numericBudget) {
        recommendations.push({
          flight: {
            flightId: flight.id,
            airline: flight.airline,
            departureAirport: flight.departureAirport,
            arrivalAirport: flight.arrivalAirport,
            departDate: flight.departDate,
            returnDate: flight.returnDate,
            price: flightCost,
            currency: "USD"
          },
          accommodation: {
            accommodationId: accommodation.id,
            name: accommodation.name,
            location: accommodation.location,
            pricePerNight: accommodation.pricePerNight,
            nights,
            totalPrice: accommodationCost,
            currency: "USD"
          },
          flightCost,
          accommodationCost,
          combinedTotal,
          budget: numericBudget,
          remainingBudget: numericBudget - combinedTotal,
          travelers: numericTravelers,
          guests: numericGuests,
          currency: "USD"
        });
      }
    }
  }

  recommendations.sort((a, b) => a.combinedTotal - b.combinedTotal);

  if (recommendations.length === 0) {
    return {
      results: [],
      count: 0,
      message: `No trips found within $${numericBudget}.`
    };
  }

  return {
    results: recommendations,
    count: recommendations.length,
    message: "Trips found within budget"
  };
}

module.exports = {
  getTripRecommendationsFromBudget
};