import { sendGa4Purchase } from "../../lib/ga4.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const callback = req.body?.Body?.stkCallback;

    if (!callback) {
      return res.status(400).json({ error: "Invalid callback data" });
    }

    const items = callback.CallbackMetadata?.Item || [];

    const getValue = (name) =>
      items.find((item) => item.Name === name)?.Value ?? "Not provided";

    const successful = Number(callback.ResultCode) === 0;

    const details = {
      status: successful ? "SUCCESSFUL" : "FAILED",
      result: callback.ResultDesc || "No description",
      amount: getValue("Amount"),
      mpesaReceipt: getValue("MpesaReceiptNumber"),
      phone: getValue("PhoneNumber"),
      transactionDate: getValue("TransactionDate"),
      checkoutRequestID: callback.CheckoutRequestID || "Not provided",
      merchantRequestID: callback.MerchantRequestID || "Not provided"
    };

    // Count a purchase only after Safaricom confirms success and returns a receipt.
    if (successful && details.mpesaReceipt !== "Not provided") {
      await sendGa4Purchase({
        transactionId: details.mpesaReceipt,
        value: Number(details.amount),
        currency: "KES",
        clientIdSeed: details.checkoutRequestID
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Detty Dezemba Tickets <tickets@dettydezembaticketsexp.shop>",
        to: ["detty.dezembatickets@gmail.com"],
        subject: `M-Pesa Payment ${details.status} - Detty Dezemba`,
        text:
          "DET TY DEZEMBA FESTIVAL - M-PESA PAYMENT NOTIFICATION\n\n" +
          `Status: ${details.status}\n` +
          `Amount: KSh ${details.amount}\n` +
          `M-Pesa Receipt: ${details.mpesaReceipt}\n` +
          `Customer Phone: ${details.phone}\n` +
          `Transaction Date: ${details.transactionDate}\n` +
          `Result: ${details.result}\n` +
          `Checkout Request ID: ${details.checkoutRequestID}\n` +
          `Merchant Request ID: ${details.merchantRequestID}\n\n` +
          "Verify the transaction in your M-Pesa records before admitting the customer."
      })
    });

    if (!emailResponse.ok) {
      console.error("Email notification failed:", await emailResponse.text());
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });

  } catch (error) {
    console.error("M-Pesa callback error:", error);

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });
  }
}
