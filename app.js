
const prices = { Regular: 1000, VIP: 20000, VVIP: 40000, "VIP Special": 45000, "VVIP Special": 50000 };
const quantities = { Regular: 0, VIP: 0, VVIP: 0, "VIP Special": 0, "VVIP Special": 0 };

const money = n => "KSh " + n.toLocaleString("en-KE");

function updateFestivalCountdown() {
  const target = new Date("2026-12-12T14:00:00+03:00").getTime();
  const now = Date.now();
  const remaining = target - now;
  const countdown = document.getElementById("festivalCountdown");

  if (!countdown) return;

  if (remaining <= 0) {
    countdown.innerHTML = '<p class="countdown-live">FESTIVAL DAY IS HERE!</p>';
    return;
  }

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  document.getElementById("countDays").textContent = days;
  document.getElementById("countHours").textContent = String(hours).padStart(2, "0");
  document.getElementById("countMinutes").textContent = String(minutes).padStart(2, "0");
  document.getElementById("countSeconds").textContent = String(seconds).padStart(2, "0");
}

updateFestivalCountdown();
setInterval(updateFestivalCountdown, 1000);

const totalEl = document.getElementById("total");
const countEl = document.getElementById("ticketCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const dialog = document.getElementById("checkoutDialog");
const toast = document.getElementById("toast");
const paymentChoice = document.getElementById("paymentChoice");
const paypalContainer = document.getElementById("paypal-button-container");
const mpesaContainer = document.getElementById("mpesa-payment-container");
const mpesaButton = document.getElementById("mpesa-pay-button");

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
    const output = row.querySelector("output");

    if (!prices[type] || !output) return;

    output.textContent = quantities[type];
    total += quantities[type] * prices[type];
    count += quantities[type];
  });

  totalEl.textContent = money(total);
  countEl.textContent = `${count} ticket${count === 1 ? "" : "s"} selected`;
  checkoutBtn.disabled = count === 0;
}

document.querySelectorAll(".ticket-row").forEach(row => {
  const type = row.dataset.type;
  const buttons = row.querySelectorAll("button");

  if (!prices[type] || buttons.length < 2) return;

  const [minus, plus] = buttons;

  minus.addEventListener("click", () => {
    quantities[type] = Math.max(0, quantities[type] - 1);
    update();
  });

  plus.addEventListener("click", () => {
    quantities[type] = Math.min(10, quantities[type] + 1);
    update();
  });
});

function updatePaymentDisplay() {
  paypalContainer.hidden = true;
  paypalContainer.innerHTML = "";
  paypalRendered = false;

  mpesaContainer.hidden = true;

  if (paymentChoice.value === "PayPal") {
    renderPayPalButtons();
  } else if (paymentChoice.value === "M-Pesa Till") {
    mpesaContainer.hidden = false;
  } else {
    showToast("This payment method is not connected yet.");
  }
}

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
  updatePaymentDisplay();
});

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

    document.head.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => {
        paypalSdkPromise = null;
        reject(new Error("PayPal could not load."));
      };
    });

    return window.paypal;
  })();

  return paypalSdkPromise;
}

async function renderPayPalButtons() {
  if (paypalRendered) return;

  if (!selectedTickets().length) {
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
          throw new Error(result.error || "Payment confirmation failed. Contact support.");
        }

        showToast(
          result.emailSent
            ? "Payment confirmed! Booking details sent to the festival team."
            : "Payment confirmed, but email notification failed. Contact the festival team."
        );

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
        showToast(error.message || "PayPal checkout encountered an error.");
      }
    }).render("#paypal-button-container");

    paypalRendered = true;

  } catch (error) {
    console.error(error);
    paypalContainer.innerHTML = "";
    showToast(error.message || "Unable to load PayPal.");
  }
}

mpesaButton.addEventListener("click", async () => {
  const buyer = getBuyerDetails();
  if (!buyer) return;

  const tickets = selectedTickets();

  if (!tickets.length) {
    showToast("Please select at least one ticket.");
    return;
  }

  mpesaButton.disabled = true;
  mpesaButton.textContent = "Sending payment request...";

  try {
    const response = await fetch("/api/mpesa/stk-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: buyer.phone,
        tickets: tickets.map(ticket => ({
          category: ticket.type,
          quantity: ticket.quantity
        })),
        buyer
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || result.errorMessage || "M-Pesa request failed.");
    }

    showToast("M-Pesa prompt sent. Enter your PIN on your phone to pay.");
    mpesaButton.textContent = "Payment request sent";

  } catch (error) {
    showToast(error.message || "M-Pesa payment failed. Please try again.");
    mpesaButton.disabled = false;
    mpesaButton.textContent = "Pay with M-Pesa";
  }
});

paymentChoice.addEventListener("change", updatePaymentDisplay);

update();
