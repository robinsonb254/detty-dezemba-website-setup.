export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { orderID } = req.body || {};

    if (!orderID || typeof orderID !== "string") {
      return res.status(400).json({
        error: "Missing PayPal order ID"
      });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Payment configuration unavailable"
      });
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

    const captureResponse = await fetch(
      `https://api-m.paypal.com/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const capture = await captureResponse.json();

    if (!captureResponse.ok) {
      return res.status(400).json({
        error: "Payment capture failed"
      });
    }

    const purchaseUnit = capture.purchase_units?.[0];
    const payment = purchaseUnit?.payments?.captures?.[0];

    if (
      capture.status !== "COMPLETED" ||
      payment?.status !== "COMPLETED"
    ) {
      return res.status(400).json({
        error: "Payment has not been completed"
      });
    }

    return res.status(200).json({
      success: true,
      status: "COMPLETED",
      orderID: capture.id,
      transactionID: payment.id,
      amount: payment.amount?.value,
      currency: payment.amount?.currency_code,
      message: "Payment successfully confirmed."
    });

  } catch (error) {
    console.error("PayPal capture error:", error.message);

    return res.status(500).json({
      error: "Unable to verify payment"
    });
  }
}
