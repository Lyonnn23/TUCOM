// Service Worker for Push Notifications - TÜcom
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "TÜcom", body: "Hay novedades en los precios de bencina" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // use defaults
  }

  const payloadData = data.data || {};
  const stationId = payloadData.station_id || payloadData.stationId;
  const lat = payloadData.lat;
  const lng = payloadData.lng;
  const stationName = payloadData.station_name || payloadData.stationName;

  const actions = [];
  if (lat && lng) {
    actions.push({ action: "directions", title: "Cómo llegar" });
  }
  if (stationId) {
    actions.push({ action: "view_station", title: "Ver estación" });
  }
  if (actions.length === 0) {
    actions.push({ action: "open", title: "Ver precios" });
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    image: data.image,
    vibrate: [120, 60, 120],
    tag: payloadData.tag || (stationId ? `station-${stationId}` : "tucom-alert"),
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
    data: { ...payloadData, stationName, stationId, lat, lng },
    actions,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;

  let targetUrl = "/";
  if (action === "directions" && data.lat && data.lng) {
    targetUrl = `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}&travelmode=driving`;
  } else if (action === "view_station" && data.stationId) {
    targetUrl = `/station/${data.stationId}`;
  } else if (data.stationId) {
    targetUrl = `/station/${data.stationId}`;
  } else {
    targetUrl = "/alertas";
  }

  event.waitUntil(
    (async () => {
      const isExternal = targetUrl.startsWith("http");
      if (isExternal) {
        return self.clients.openWindow(targetUrl);
      }
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          await client.focus();
          if ("navigate" in client) {
            try { await client.navigate(targetUrl); } catch { /* noop */ }
          }
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })()
  );
});
