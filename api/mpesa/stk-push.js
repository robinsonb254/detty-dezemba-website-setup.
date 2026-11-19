
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      MPESA_CONSUMER_KEY,
      MPESA_CONSUMER_SECRET,
      MPESA_SHORTCODE,
      MPESA_PASSKEY,
      MPESA_TILL_NUMBER
    } = process.env;

    if (
      !MPESA_CONSUMER_KEY ||
      !MPESA_CONSUMER_SECRET ||
      !MPESA_SHORTCODE ||
      !MPESA_PASSKEY ||
      !MPESA_TILL_NUMBER
    ) {
      return res.status(500).json({
        error: "M-Pesa production configuration is incomplete."
      });
    }

    const { phoneNumber, tickets } = req.body || {};

    if (!phoneNumber || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        error: "Phone number and ticket selection are required."
      });
    }

    const phone = String(phoneNumber).replace(/\D/g, "");
    const normalizedPhone =
      phone.startsWith("0") ? "254" + phone.slice(1) :
      phone.startsWith("254") ? phone :
      "";

    if (!/^254[17]\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({
        error: "Enter a valid Kenyan mobile number."
      });
    }

    const prices = {
      Regular: 1000,
      VIP: 5000,
      VVIP: 10000,
      "VIP Special": 40000,
      "VVIP Special": 50000
    };

    let amount = 0;

    for (const ticket of tickets) {
      const price = prices[ticket.category];
      const quantity = Number(ticket.quantity);

      if (
        !price ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
      ) {
        return res.status(400).json({
          error: "Invalid ticket selection."
        });
      }

      amount += price * quantity;
    }

    if (!Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({
        error: "Invalid payment amount."
      });
    }

    const auth = Buffer.from(
      `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const tokenResponse = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: { Authorization: `Basic ${auth}` }
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error("Could not authenticate with Safaricom.");
    }

    const timestamp = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).format(new Date()).replace(/\D/g, "");

    const password = Buffer.from(
      MPESA_SHORTCODE + MPESA_PASSKEY + timestamp
    ).toString("base64");

    const stkResponse = await fetch(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerBuyGoodsOnline",
          Amount: amount,
          PartyA: normalizedPhone,
          PartyB: MPESA_TILL_NUMBER,
          PhoneNumber: normalizedPhone,
          CallBackURL:
            "https://detty-dezemba-website-setup.vercel.app/api/mpesa/callback",
          AccountReference: "DETTYDEZEMBA",
          TransactionDesc: "Festival ticket payment"
        })
      }
    );

    const result = await stkResponse.json();

    if (!stkResponse.ok || result.ResponseCode !== "0") {
      return res.status(400).json({
        error: result.errorMessage ||
          result.ResponseDescription ||
          "Safaricom could not initiate the payment."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment prompt sent. Check your phone and enter your M-Pesa PIN.",
      checkoutRequestID: result.CheckoutRequestID,
      merchantRequestID: result.MerchantRequestID
    });

  } catch (error) {
    console.error("M-Pesa STK error:", error);

    return res.status(500).json({
      error: "Unable to initiate M-Pesa payment. Please try again."
    });
  }
}
