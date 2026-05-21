function matchesPriceFilter(price, filter) {
  if (!filter) return true;

  switch (filter) {
    case "free":
      return price === 0;
    case "under25":
      return price < 25;
    case "25to75":
      return price >= 25 && price <= 75;
    case "75plus":
      return price >= 75;
    default:
      return true;
  }
}

function getPriceLabel(price) {
  return price === 0 ? "Free" : `$${price}`;
}

module.exports = {
  matchesPriceFilter,
  getPriceLabel,
};