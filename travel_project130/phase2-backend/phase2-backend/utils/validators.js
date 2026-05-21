function isValidPositiveInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

function validateBudget(budget) {
  if (budget === undefined) return null;

  const value = Number(budget);

  if (!Number.isFinite(value)) {
    return "Budget must be a number";
  }
  if (value <= 0) {
    return "Please enter a budget greater than $0";
  }
  if (value > 100000) {
    return "Budget must be less than or equal to $100,000";
  }

  return null;
}

function validateFlightSearch(query) {
  const { destination, departDate, returnDate, travelers, budget } = query;

  if (!destination || !departDate || !returnDate || !travelers) {
    return "destination, departDate, returnDate, and travelers are required";
  }

  if (!isValidPositiveInteger(travelers)) {
    return "travelers must be a positive integer";
  }

  return validateBudget(budget);
}

function validateAccommodationSearch(query) {
  const { destination, checkIn, checkOut, guests, budget } = query;

  if (!destination || !checkIn || !checkOut || !guests) {
    return "destination, checkIn, checkOut, and guests are required";
  }

  if (!isValidPositiveInteger(guests)) {
    return "guests must be a positive integer";
  }

  return validateBudget(budget);
}

function validateActivitySearch(query) {
  const { destination, priceFilter } = query;
  const allowed = ["free", "under25", "25to75", "75plus"];

  if (!destination) {
    return "destination is required";
  }

  if (priceFilter && !allowed.includes(priceFilter)) {
    return "priceFilter must be one of: free, under25, 25to75, 75plus";
  }

  return null;
}

module.exports = {
  validateBudget,
  validateFlightSearch,
  validateAccommodationSearch,
  validateActivitySearch,
};