const prices = {
  Regular: "7.70",
  VIP: "38.47",
  VVIP: "76.95"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("PayPal credentials are missing");
    }

    const ticketType = req.body?.ticketType;
    const quantity = Number(req.body?.quantity);

    if (
      !prices[ticketType] ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return res.status(400).json({ error: "Invalid ticket selection" });
    }

    const auth = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(
      "https://api-m.paypal.com/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error("PayPal authentication failed");
    }

    const amount = (
      Number(prices[ticketType]) * quantity
    ).toFixed(2);

    const orderResponse = await fetch(
      "https://api-m.paypal.com/v2/checkout/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            description: `Detty Dezemba Festival - ${ticketType} ticket`,
            amount: {
              currency_code: "USD",
              value: amount
            }
          }]
        })
      }
    );

    const order = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error("Could not create PayPal order");
    }

    return res.status(200).json({
      id: order.id,
      orderID: order.id
    });

  } catch (error) {
    console.error("PayPal error:", error.message);
    return res.status(500).json({
      error: "Unable to start PayPal checkout"
    });
  }
}
