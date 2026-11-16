
const pricesInCents = {
  Regular: 770,
  VIP: 3848,
  VVIP: 7695
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("PayPal credentials are missing");
    }

    const tickets = req.body?.tickets;

    if (
      !Array.isArray(tickets) ||
      tickets.length < 1 ||
      tickets.length > 3
    ) {
      return res.status(400).json({
        error: "Invalid ticket selection"
      });
    }

    const seen = new Set();

    for (const ticket of tickets) {
      if (
        !ticket ||
        !Object.prototype.hasOwnProperty.call(
          pricesInCents,
          ticket.type
        ) ||
        !Number.isInteger(ticket.quantity) ||
        ticket.quantity < 1 ||
        ticket.quantity > 10 ||
        seen.has(ticket.type)
      ) {
        return res.status(400).json({
          error: "Invalid ticket selection"
        });
      }

      seen.add(ticket.type);
    }

    const totalCents = tickets.reduce(
      (sum, ticket) =>
        sum + pricesInCents[ticket.type] * ticket.quantity,
      0
    );

    const amount = (totalCents / 100).toFixed(2);

    const description = tickets.map(ticket =>
      `${ticket.quantity} x ${ticket.type}`
    ).join(", ");

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
            description: `Detty Dezemba Festival - ${description}`,
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
      console.error("PayPal order error:", order);
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
