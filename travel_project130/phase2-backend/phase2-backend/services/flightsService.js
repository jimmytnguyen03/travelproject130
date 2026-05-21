const flights = require("../data/flights.json");

async function search({ destination, departDate, returnDate, travelers, budget }) {
  let results = flights
    .filter(
      (flight) =>
        flight.arrivalAirport.toLowerCase() === destination.toLowerCase() &&
        flight.departDate === departDate &&
        flight.returnDate === returnDate
    )
    .map((flight) => ({
      flightId: flight.id,
      airline: flight.airline,
      departureAirport: flight.departureAirport,
      arrivalAirport: flight.arrivalAirport,
      departDate: flight.departDate,
      returnDate: flight.returnDate,
      travelers,
      price: flight.price,
      currency: "USD",
    }));

  if (budget !== undefined) {
    const max = Number(budget);
    results = results.filter((flight) => flight.price <= max);
  }

  return results;
}

module.exports = { search };