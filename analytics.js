(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  let measurementId = null;
  let analyticsReady = false;
  const pendingEvents = [];

  window.dettyTrack = function (eventName, parameters) {
    if (!measurementId || !analyticsReady) {
      pendingEvents.push({ eventName, parameters: parameters || {} });
      return false;
    }
    window.gtag("event", eventName, parameters || {});
    return true;
  };

  window.dettyGetAnalyticsClientId = function () {
    return new Promise(resolve => {
      if (!measurementId || !analyticsReady) return resolve(null);
      window.gtag("get", measurementId, "client_id", value => resolve(value || null));
      window.setTimeout(() => resolve(null), 1200);
    });
  };

  fetch("/api/analytics/config", { credentials: "same-origin" })
    .then(response => response.ok ? response.json() : null)
    .then(config => {
      const id = config && config.measurementId;
      if (!id || !/^G-[A-Z0-9]+$/.test(id)) return;
      measurementId = id;
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
      script.onload = () => {
        window.gtag("js", new Date());
        window.gtag("config", id, {
          send_page_view: true,
          page_title: document.title,
          page_location: window.location.href
        });
        analyticsReady = true;
        pendingEvents.splice(0).forEach(event =>
          window.gtag("event", event.eventName, event.parameters)
        );
        const ticketCards = Array.from(document.querySelectorAll(".price-card"));
        if (ticketCards.length) {
          window.gtag("event", "view_item_list", {
            item_list_name: "Detty Dezemba 2026 ticket prices page",
            currency: "KES",
            items: ticketCards.map(card => {
              const name = card.querySelector("h2")?.textContent?.trim() || "Festival ticket";
              const priceText = card.querySelector("strong")?.textContent || "";
              const price = Number(priceText.replace(/[^0-9]/g, "")) || undefined;
              return {
                item_id: name,
                item_name: name,
                ...(price ? { price } : {}),
                quantity: 1
              };
            })
          });
        }
      };
      script.onerror = () => console.error("Detty Dezemba analytics library could not load.");
      document.head.appendChild(script);
    })
    .catch(error => console.warn("Analytics configuration unavailable:", error));
})();