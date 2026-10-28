// DummyJSON prices are treated as USD in this demo. This is a fixed demo rate,
// not a live exchange rate. Replace it with a trusted rate source for production.
const DEMO_USD_TO_INR = 84;

export function formatINR(usdPrice) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(usdPrice || 0) * DEMO_USD_TO_INR);
}

export function getINRValue(usdPrice) {
  return Number(usdPrice || 0) * DEMO_USD_TO_INR;
}
