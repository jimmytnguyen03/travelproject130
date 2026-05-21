const bookingApi = require("../config/bookingApi");
const localFlights = require("../data/flights.json");

const airportMap = {
  london: "LHR.AIRPORT",
  lon: "LHR.AIRPORT",
  lhr: "LHR.AIRPORT",

  "new york": "JFK.AIRPORT",
  nyc: "JFK.AIRPORT",
  jfk: "JFK.AIRPORT",

  paris: "CDG.AIRPORT",
  par: "CDG.AIRPORT",
  cdg: "CDG.AIRPORT",

  tokyo: "NRT.AIRPORT",
  tyo: "NRT.AIRPORT",
  nrt: "NRT.AIRPORT",

  delhi: "DEL.AIRPORT",
  del: "DEL.AIRPORT",

  mumbai: "BOM.AIRPORT",
  bom: "BOM.AIRPORT",

  "san francisco": "SFO.AIRPORT",
  sfo: "SFO.AIRPORT",
};

function toMoneyUnits(value) {
  if (!value) return null;
  const units = Number(value.units || 0);
  const nanos = Number(value.nanos || 0) / 1_000_000_000;
  return Number((units + nanos).toFixed(2));
}

function mapOffer(offer, travelers) {
  return {
    flightId: offer.token || `BK-${Math.random().toString(36).slice(2, 8)}`,
    airline:
      offer.segments?.[0]?.legs?.[0]?.carriersData?.[0]?.name ||
      offer.segments?.[0]?.legs?.[0]?.carrierInfo?.marketingCarrier ||
      "Unknown Airline",
    departureAirport:
      offer.segments?.[0]?.departureAirport?.code ||
      offer.segments?.[0]?.legs?.[0]?.departureAirportCode ||
      "",
    arrivalAirport:
      offer.segments?.[0]?.arrivalAirport?.code ||
      offer.segments?.[0]?.legs?.[0]?.arrivalAirportCode ||
      "",
    departDate:
      offer.segments?.[0]?.departureTime?.split("T")[0] ||
      offer.segments?.[0]?.legs?.[0]?.departureTime?.split("T")[0] ||
      "",
    returnDate:
      offer.segments?.[1]?.departureTime?.split("T")[0] ||
      offer.segments?.[1]?.legs?.[0]?.departureTime?.split("T")[0] ||
      "",
    travelers,
    price: toMoneyUnits(offer.priceBreakdown?.total),
    currency: offer.priceBreakdown?.total?.currencyCode || "AED",
  };
}

async function search({ destination, departDate, returnDate, travelers, budget }) {
  try {
    const normalizedDestination = String(destination || "").trim().toLowerCase();
    const toId = airportMap[normalizedDestination];

    if (!toId) {
      throw new Error(`No Booking airport mapping found for destination: ${destination}`);
    }

    const response = await bookingApi.get("/flights/searchFlights", {
      params: {
        fromId: "BOM.AIRPORT",
        toId,
        departDate,
        returnDate,
        stops: "none",
        pageNo: 1,
        adults: Number(travelers) || 1,
        children: "",
        sort: "BEST",
        cabinClass: "ECONOMY",
        currency_code: "AED",
      },
    });

    const offers = response.data?.data?.flightOffers || [];
    let results = offers.slice(0, 10).map((offer) =>
      mapOffer(offer, Number(travelers) || 1)
    );

    if (budget !== undefined) {
      const max = Number(budget);
      results = results.filter(
        (flight) => flight.price !== null && flight.price <= max
      );
    }

    return results;
  } catch (error) {
    console.log("Booking API flights fallback:", error.response?.data || error.message);

    let results = localFlights
      .filter(
        (flight) =>
          (
            String(flight.arrivalAirport || "").toLowerCase() ===
              String(destination || "").toLowerCase() ||
            String(flight.arrivalAirport || "").toUpperCase() ===
              String(destination || "").toUpperCase()
          ) &&
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
}

module.exports = { search };