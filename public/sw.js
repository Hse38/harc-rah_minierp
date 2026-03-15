self.addEventListener('install', function() {
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', function(event) {
  console.log('Push event alındı:', event)

  let title = 'Bildirim'
  let body = 'Yeni bildirim'

  event.waitUntil(
    (async function() {
      if (event.data) {
        try {
          const data = await event.data.json()
          title = data.title || title
          body = data.body || body
        } catch (_) {
          body = await event.data.text()
        }
      }
      return self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png'
      })
    })()
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
