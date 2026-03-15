self.addEventListener('install', function() {
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', function(event) {
  console.log('Push event alındı:', event)

  event.waitUntil(
    (event.data ? event.data.json() : Promise.resolve({ title: 'Bildirim', body: 'Yeni bildirim' }))
      .then(function(data) {
        return self.registration.showNotification(data.title || 'TAMGA', {
          body: data.body || '',
          icon: '/icon-192.png',
          badge: '/icon-72.png',
          tag: data.tag || 'tamga-notification',
          data: { url: data.url || '/dashboard' },
          requireInteraction: true,
          vibrate: [200, 100, 200]
        })
      })
      .catch(function(err) {
        console.error('Push showNotification hatası:', err)
        return self.registration.showNotification('Bildirim', { body: 'Yeni bildirim', icon: '/icon-192.png' })
      })
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
