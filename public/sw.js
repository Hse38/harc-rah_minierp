self.addEventListener("push", function (event) {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || "Harcırah", {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    tag: data.tag || "harcirah",
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Görüntüle" },
      { action: "close", title: "Kapat" },
    ],
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  if (event.action === "open" || !event.action) {
    const url = event.notification.data?.url || "/";
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          if (clientList[i].url && "focus" in clientList[i]) {
            clientList[i].navigate(url);
            return clientList[i].focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
    );
  }
});
