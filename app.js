
const PROMO_START="2026-11-30T00:00:00+03:00", PROMO_END="2026-12-08T00:00:00+03:00";
const promoActive=Date.now()>=Date.parse(PROMO_START)&&Date.now()<Date.parse(PROMO_END);
const regularPrices={"General Access":5000,"Duo Ticket":9000,"Priority Access IV (VIP)":20000,"One Dance VVIP":30000,"Premium Access for Two":37999,"Kese Table":200000,"Joro Table":500000,"Soco Table":1000000,"Star Boy Table":2000000};
const prices={...regularPrices,...(promoActive?{"General Access":2500,"Duo Ticket":4500,"Priority Access IV (VIP)":10000}:{})};
const quantities = Object.fromEntries(Object.keys(prices).map(type => [type, 0]));

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
setInterval(updateFestivalCountdown,1000);
function updateOfferCountdown(){const el=document.getElementById("ticketOfferCountdown");if(!el)return;const banner=el.closest(".ticket-offer-banner"),st=Date.parse("2026-11-30T00:00:00+03:00"),en=Date.parse("2026-12-08T00:00:00+03:00"),now=Date.now();if(now<st){if(banner)banner.style.display="none";el.textContent="Offer starts soon";if(!window.__dettyOfferStartReload){window.__dettyOfferStartReload=setTimeout(()=>window.location.reload(),st-now+250);}return;}if(now>=en){banner?.remove();if(promoActive)window.location.reload();return;}if(banner)banner.style.display="";const ms=en-now,d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);el.textContent=d+"d "+String(h).padStart(2,"0")+"h "+String(m).padStart(2,"0")+"m "+String(s).padStart(2,"0")+"s";}
updateOfferCountdown();setInterval(updateOfferCountdown,1000);

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
let mpesaRequestSent = false;

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
  document.querySelectorAll('.ticket-row[data-type]').forEach(row=>{const type=row.dataset.type,el=row.querySelector(':scope > strong');if(!el||!regularPrices[type])return;el.innerHTML=promoActive&&prices[type]!==regularPrices[type]?'<span class="ticket-old-price">'+money(regularPrices[type])+'</span><span class="ticket-offer-price">'+money(prices[type])+'</span>':money(prices[type]);});
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
  countEl.textContent = `${count} item${count === 1 ? "" : "s"} selected`;
  checkoutBtn.disabled = count === 0;
}

document.querySelectorAll(".ticket-row").forEach(row => {
  const type = row.dataset.type;
  const buttons = row.querySelectorAll("button");

  if (!prices[type] || buttons.length < 2) return;

  const [minus, plus] = buttons;

  minus.addEventListener("click", () => {
    const previousQuantity = quantities[type];
    quantities[type] = Math.max(0, quantities[type] - 1);
    if (previousQuantity > quantities[type] && window.dettyTrack) {
      window.dettyTrack("remove_from_cart", {
        currency: "KES", value: prices[type],
        items: [{ item_id: type, item_name: type, price: prices[type], quantity: 1 }]
      });
    }
    update();
  });

  plus.addEventListener("click", () => {
    quantities[type] += 1;
    if (window.dettyTrack) {
      window.dettyTrack("add_to_cart", {
        item_list_name: "Detty Dezemba 2026 tickets",
        currency: "KES", value: prices[type],
        items: [{ item_id: type, item_name: type, price: prices[type], quantity: 1 }]
      });
    }
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
  if (mpesaRequestSent) return;
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
  if (window.dettyTrack) {
    window.dettyTrack("begin_checkout", {
      currency: "KES", value: total,
      items: tickets.map(ticket => ({
        item_id: ticket.type, item_name: ticket.type,
        price: prices[ticket.type], quantity: ticket.quantity
      }))
    });
  }
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
            tickets: currentTickets,
            analyticsClientId: window.dettyGetAnalyticsClientId
              ? await window.dettyGetAnalyticsClientId()
              : null
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
    showToast("Please select at least one ticket or table package.");
    return;
  }

  const mpesaTotal = tickets.reduce(
    (sum, ticket) => sum + prices[ticket.type] * ticket.quantity,
    0
  );
  if (mpesaTotal > 250000) {
    showToast("M-Pesa supports up to KSh 250,000 per transaction. Choose PayPal for this order.");
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

    // Keep checkout visible while the buyer enters the PIN and Safaricom processes payment.
    // An accepted STK request is not proof that payment has completed.
    mpesaRequestSent = true;
    checkoutBtn.disabled = true;
    mpesaButton.disabled = true;
    mpesaButton.textContent = "M-Pesa prompt sent — check your phone";
    paymentChoice.disabled = true;

    let pendingNotice = document.getElementById("mpesa-pending-notice");
    if (!pendingNotice) {
      pendingNotice = document.createElement("p");
      pendingNotice.id = "mpesa-pending-notice";
      pendingNotice.className = "notice";
      pendingNotice.setAttribute("role", "status");
      pendingNotice.setAttribute("aria-live", "polite");
      mpesaContainer.appendChild(pendingNotice);
    }
    pendingNotice.textContent =
      result.message ||
      "Enter your M-Pesa PIN on your phone and keep this checkout open while Safaricom processes the payment. Your order is not confirmed until payment is verified.";

  } catch (error) {
    showToast(error.message || "M-Pesa payment failed. Please try again.");
    mpesaButton.disabled = false;
    mpesaButton.textContent = "Pay with M-Pesa";
  }
});

paymentChoice.addEventListener("change", () => {
  updatePaymentDisplay();
  if (window.dettyTrack) {
    window.dettyTrack("add_payment_info", {
      currency: "KES", payment_type: paymentChoice.value
    });
  }
});

update();

if (window.dettyTrack) {
  window.dettyTrack("view_item_list", {
    item_list_name: "Detty Dezemba 2026 tickets",
    currency: "KES",
    items: Object.entries(prices).map(([type, price]) => ({
      item_id: type,
      item_name: type,
      price,
      quantity: 1
    }))
  });
}


// Load the YouTube player only after a visitor chooses to play a video.
document.addEventListener("click", event => {
  const playButton = event.target.closest(".video-play[data-youtube-id]");
  if (!playButton) return;

  const videoId = playButton.dataset.youtubeId;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return;

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  iframe.title = playButton.getAttribute("aria-label") || "Festival music video";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.loading = "eager";

  playButton.replaceWith(iframe);
});
