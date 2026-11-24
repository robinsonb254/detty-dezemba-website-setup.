import { createHash } from "node:crypto";

function fallbackClientId(seed) {
  const digest = createHash("sha256").update(String(seed || "detty-dezemba")).digest("hex");
  const numeric = BigInt("0x" + digest.slice(0, 15)).toString().slice(0, 18);
  return "555." + numeric;
}

export async function sendGa4Purchase({
  transactionId, value, currency, items = [], clientIdSeed, analyticsClientId
}) {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret || !transactionId || !Number.isFinite(Number(value))) {
    return { sent: false, reason: "GA4 Measurement Protocol is not configured." };
  }

  const clientId = /^\d{1,20}\.\d{1,20}$/.test(String(analyticsClientId || ""))
    ? String(analyticsClientId)
    : fallbackClientId(clientIdSeed || transactionId);

  const safeItems = Array.isArray(items) ? items.slice(0, 20).map(item => ({
    item_id: String(item.item_id || item.item_name || "festival-ticket").slice(0, 100),
    item_name: String(item.item_name || item.item_id || "Festival ticket").slice(0, 100),
    quantity: Math.max(1, Math.min(20, Number(item.quantity) || 1)),
    ...(Number.isFinite(Number(item.price)) ? { price: Number(item.price) } : {})
  })) : [];

  try {
    const response = await fetch(
      "https://www.google-analytics.com/mp/collect?measurement_id=" +
        encodeURIComponent(measurementId) + "&api_secret=" + encodeURIComponent(apiSecret),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          events: [{
            name: "purchase",
            params: {
              transaction_id: String(transactionId).slice(0, 100),
              value: Number(value),
              currency: String(currency || "KES").toUpperCase(),
              engagement_time_msec: 1,
              ...(safeItems.length ? { items: safeItems } : {})
            }
          }]
        })
      }
    );
    if (!response.ok) {
      console.error("GA4 purchase event failed:", response.status, await response.text());
      return { sent: false, reason: "GA4 Measurement Protocol request failed." };
    }
    return { sent: true };
  } catch (error) {
    console.error("GA4 purchase event transport error:", error);
    return { sent: false, reason: "GA4 Measurement Protocol request failed." };
  }
}