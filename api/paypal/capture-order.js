
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderID, buyer, tickets } = req.body || {};

    if (!orderID || typeof orderID !== "string") {
      return res.status(400).json({ error: "Missing PayPal order ID" });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const resendKey = process.env.RESEND_API_KEY;

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

    const payment =
      capture.purchase_units?.[0]?.payments?.captures?.[0];

    if (
      capture.status !== "COMPLETED" ||
      payment?.status !== "COMPLETED"
    ) {
      return res.status(400).json({
        error: "Payment has not been completed"
      });
    }

    const transactionID = payment.id;
    const amount = payment.amount?.value;
    const currency = payment.amount?.currency_code;

    let emailSent = false;

    // Send notification only when buyer and ticket details are supplied.
    if (
      resendKey &&
      buyer?.name &&
      buyer?.email &&
      buyer?.phone &&
      Array.isArray(tickets) &&
      tickets.length > 0
    ) {
      const allowedPrices = {
        Regular: 7.70,
        VIP: 38.48,
        VVIP: 76.95
      };

      const validTickets = tickets.every(ticket =>
        allowedPrices[ticket.type] &&
        Number.isInteger(ticket.quantity) &&
        ticket.quantity >= 1 &&
        ticket.quantity <= 10
      );

      if (!validTickets || currency !== "USD") {
        return res.status(200).json({
          success: true,
          status: "COMPLETED",
          orderID: capture.id,
          transactionID,
          amount,
          currency,
          emailSent: false,
          message: "Payment confirmed, but ticket details need checking."
        });
      }

      const expectedTotal = tickets.reduce(
        (sum, ticket) =>
          sum + allowedPrices[ticket.type] * ticket.quantity,
        0
      );

      const actualCents = Math.round(Number(amount) * 100);
      const expectedCents = Math.round(expectedTotal * 100);

      if (actualCents === expectedCents) {
        const ticketLines = tickets.map(ticket =>
          `${ticket.quantity} x ${ticket.type}`
        ).join(", ");

        const escapeHtml = value =>
          String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
          })[char]);

        const emailResponse = await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "Detty Dezemba Tickets <tickets@dettydezembaticketsexp.shop>",
              to: ["detty.dezembatickets@gmail.com"],
              subject: `Ticket payment received - ${transactionID}`,
              html: `
                <h2>Detty Dezemba Festival - Payment Notification</h2>
                <p><strong>Buyer:</strong> ${escapeHtml(buyer.name)}</p>
                <p><strong>Email:</strong> ${escapeHtml(buyer.email)}</p>
                <p><strong>Phone:</strong> ${escapeHtml(buyer.phone)}</p>
                <p><strong>Tickets:</strong> ${escapeHtml(ticketLines)}</p>
                <p><strong>Amount paid:</strong> ${escapeHtml(amount)} ${escapeHtml(currency)}</p>
                <p><strong>PayPal transaction reference:</strong> ${escapeHtml(transactionID)}</p>
                <p><strong>Payment status:</strong> COMPLETED</p>
              `,
              text: `
Detty Dezemba Festival - Payment Notification

Buyer: ${buyer.name}
Email: ${buyer.email}
Phone: ${buyer.phone}
Tickets: ${ticketLines}
Amount paid: ${amount} ${currency}
PayPal transaction reference: ${transactionID}
Payment status: COMPLETED
              `
            })
          }
        );

        if (emailResponse.ok) {
          emailSent = true;
        } else {
          console.error(
            "Resend email error:",
            await emailResponse.text()
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      status: "COMPLETED",
      orderID: capture.id,
      transactionID,
      amount,
      currency,
      emailSent,
      message: "Payment successfully confirmed."
    });

  } catch (error) {
    console.error("PayPal capture error:", error.message);

    return res.status(500).json({
      error: "Unable to verify payment"
    });
  }
}

