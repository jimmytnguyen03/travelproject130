function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const diffMs = end - start;
  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : null;
}

module.exports = { calculateNights };