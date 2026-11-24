(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  let measurementId = null;
  let analyticsReady = false;

  window.dettyTrack = function (eventName, parameters) {
    if (!measurementId || !analyticsReady) return false;
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
      };
      script.onerror = () => console.error("Detty Dezemba analytics library could not load.");
      document.head.appendChild(script);
    })
    .catch(error => console.warn("Analytics configuration unavailable:", error));
})();