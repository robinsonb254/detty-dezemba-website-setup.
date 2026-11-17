
const prices = { Regular: 1000, VIP: 5000, VVIP: 10000 };
const quantities = { Regular: 0, VIP: 0, VVIP: 0 };

const money = n => "KSh " + n.toLocaleString("en-KE");

const totalEl = document.getElementById("total");
const countEl = document.getElementById("ticketCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const dialog = document.getElementById("checkoutDialog");
const toast = document.getElementById("toast");

const paymentChoice = document.getElementById("paymentChoice");
const paypalContainer = document.getElementById("paypal-button-container");

let paypalSdkPromise = null;
let paypalRendered = false;

function showToast(message) {
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 5000);
}

function selectedTickets() {
  return Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([type, quantity]) => ({ type, quantity }));
}

function update() {
  let total = 0;
  let count = 0;

  document.querySelectorAll(".ticket-row").forEach(row => {
    const type = row.dataset.type;
    row.querySelector("output").textContent = quantities[type];
    total += quantities[type] * prices[type];
    count += quantities[type];
  });

  totalEl.textContent = money(total);
  countEl.textContent = `${count} ticket${count === 1 ? "" : "s"} selected`;
  checkoutBtn.disabled = count === 0;
}

document.querySelectorAll(".ticket-row").forEach(row => {
  const type = row.dataset.type;
  const [minus, plus] = row.querySelectorAll("button");

  minus.addEventListener("click", () => {
    quantities[type] = Math.max(0, quantities[type] - 1);
    update();
  });

  plus.addEventListener("click", () => {
    quantities[type] = Math.min(10, quantities[type] + 1);
    update();
  });
});

checkoutBtn.addEventListener("click", () => {
  const tickets = selectedTickets();

  const lines = tickets.map(ticket =>
    `${ticket.quantity} × ${ticket.type} — ${money(ticket.quantity * prices[ticket.type])}`
  );

  const total = tickets.reduce(
    (sum, ticket) => sum + ticket.quantity * prices[ticket.type],
    0
  );

  document.getElementById("orderSummary").innerHTML =
    lines.join("<br>") +
    `<hr><strong>Total: ${money(total)}</strong>`;

  dialog.showModal();
});updatePaymentDisplay();

function getBuyerDetails() {
  const name = document.getElementById("buyerName").value.trim();
  const email = document.getElementById("buyerEmail").value.trim();
  const phone = document.getElementById("buyerPhone").value.trim();

  if (!name || !email || !phone) {
    showToast("Please enter your name, email and phone number.");
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address.");
    return null;
  }

  return { name, email, phone };
}

async function loadPayPal() {
  if (window.paypal) return window.paypal;
  if (paypalSdkPromise) return paypalSdkPromise;

  paypalSdkPromise = (async () => {
    const configResponse = await fetch("/api/paypal/client-config");

    if (!configResponse.ok) {
      throw new Error("Could not load PayPal configuration.");
    }

    const config = await configResponse.json();

    if (!config.clientId) {
      throw new Error("PayPal Client ID is missing.");
    }

    const script = document.createElement("script");
    script.src =
      "https://www.paypal.com/sdk/js?client-id=" +
      encodeURIComponent(config.clientId) +
      "&currency=USD&intent=capture";

    script.onload = () => {};
    script.onerror = () => {
      paypalSdkPromise = null;
    };

    document.head.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error("PayPal could not load."));
    });

    return window.paypal;
  })();

  return paypalSdkPromise;
}

async function renderPayPalButtons() {
  if (paypalRendered) return;

  const tickets = selectedTickets();

  if (!tickets.length) {
    showToast("Please select at least one ticket.");
    return;
  }

  paypalContainer.hidden = false;
  paypalContainer.innerHTML = "Loading secure PayPal checkout...";

  try {
    const paypal = await loadPayPal();

    paypalContainer.innerHTML = "";

    paypal.Buttons({
      createOrder: async () => {
        const buyer = getBuyerDetails();
        if (!buyer) throw new Error("Please complete your buyer details.");

        const currentTickets = selectedTickets();

        const response = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickets: currentTickets })
        });

        const result = await response.json();

        if (!response.ok || !result.id) {
          throw new Error(result.error || "Could not create PayPal order.");
        }

        return result.id;
      },

      onApprove: async data => {
        const buyer = getBuyerDetails();

        if (!buyer) {
          showToast("Payment approval received, but buyer details are missing. Contact support.");
          return;
        }

        const currentTickets = selectedTickets();

        showToast("Payment approved. Confirming your payment...");

       const response = await fetch("/api/paypal/capture-order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderID: data.orderID,
    buyer,
    tickets: currentTickets
  })
});
        const result = await response.json();

        if (!response.ok || !result.success || result.status !== "COMPLETED") {
          throw new Error(result.error || "Payment confirmation failed. Please contact support before trying again.");
        }

        if (result.emailSent) {
          showToast("Payment confirmed! Your booking details have been sent to the festival team.");
        } else {
          showToast("Payment confirmed, but the email notification failed. Please contact the festival team.");
        }

        paypalContainer.innerHTML =
          `<p><strong>Payment successful!</strong></p>
           <p>PayPal reference: ${result.transactionID || result.orderID}</p>
           <p>Please keep this reference for your records.</p>`;

        paypalRendered = true;
      },

      onCancel: () => {
        showToast("Payment was cancelled. No payment was completed.");
      },

      onError: error => {
        console.error("PayPal error:", error);
        showToast(error.message || "PayPal checkout encountered an error. Please try again.");
      }
    }).render("#paypal-button-container");

    paypalRendered = true;
  } catch (error) {
    console.error(error);
    paypalContainer.innerHTML = "";
    showToast(error.message || "Unable to load PayPal. Please try again.");
  }
}
document.getElementById("mpesa-pay-button").addEventListener("click", async () => {
  const buyer = getBuyerDetails();

  if (!buyer) return;

  const tickets = selectedTickets();

  if (!tickets.length) {
    showToast("Please select at least one ticket.");
    return;
  }

  const button = document.getElementById("mpesa-pay-button");
  button.disabled = true;
  button.textContent = "Sending payment request...";

  try {
    const response = await fetch("/api/mpesa/stk-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: buyer.phone,
        tickets,
        buyer
      })
    });

    const result = await response.json();

    if (!response.ok || result.ResponseCode !== "0") {
      throw new Error(result.error || result.errorMessage || "M-Pesa request failed.");
    }

    showToast("M-Pesa prompt sent. Enter your PIN on your phone to pay.");
    button.textContent = "Payment request sent";
  } catch (error) {
    showToast(error.message || "M-Pesa payment failed. Please try again.");
    button.disabled = false;
    button.textContent = "Pay with M-Pesa";
  }
});
function updatePaymentDisplay() {
  paypalContainer.hidden = true;
  paypalContainer.innerHTML = "";
  paypalRendered = false;

  const mpesaContainer = document.getElementById("mpesa-payment-container");

  mpesaContainer.hidden = paymentChoice.value !== "M-Pesa Till";

  if (paymentChoice.value === "PayPal") {
    renderPayPalButtons();
  } else if (paymentChoice.value !== "M-Pesa Till") {
    showToast("This payment method is not connected yet.");
  }
}

paymentChoice.addEventListener("change", updatePaymentDisplay);
