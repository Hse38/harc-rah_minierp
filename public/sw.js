self.addEventListener('install', function() {
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', function(event) {
  console.log('SW push event alındı!')

  let title = 'Bildirim'
  let body = 'Yeni bildirim'
  let actions = undefined
  let notifData = undefined
  let icon = '/icon.svg'
  let badge = '/icon.svg'

  event.waitUntil(
    (async function() {
      if (event.data) {
        try {
          const payload = await event.data.json()
          title = payload.title || title
          body = payload.body || body
          actions = payload.actions
          notifData = payload.data || { url: payload.url || '/dashboard' }
          icon = payload.icon || icon
          badge = payload.badge || badge
        } catch (_) {
          body = await event.data.text()
        }
      }
      return self.registration.showNotification(title, {
        body,
        icon,
        badge,
        actions,
        data: notifData
      })
      .then(function() {
        console.log('showNotification tamamlandı')
      })
      .catch(function(e) {
        console.error('showNotification HATA:', e)
      })
    })()
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  const expenseId = event.notification.data?.expenseId
  event.waitUntil(
    (async function() {
      if (event.action === 'approve' && expenseId) {
        try {
          const res = await fetch(`/api/quick-approve?id=${encodeURIComponent(expenseId)}`, { credentials: 'include' })
          if (!res.ok) throw new Error('quick-approve failed')
        } catch (_) {
          // session yoksa veya hata varsa sayfayı aç
          if (clients.openWindow) return clients.openWindow(url)
        }
      }

      const clientList = await clients.matchAll({ type: 'window' })
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })()
  )
})
