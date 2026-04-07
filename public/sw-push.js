// Service Worker for Push Notifications
self.addEventListener("push", (event) => {
  let data = { title: "TÜcom", body: "Hay novedades en los precios de bencina" };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    // use defaults
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [{ action: "open", title: "Ver precios" }],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("/");
    })
  );
});
