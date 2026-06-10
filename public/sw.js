self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'SmartQuary';
  const options = {
    body: data.body ?? '',
    icon: data.icon ?? '/android-chrome-192x192.png',
    badge: data.badge ?? '/favicon-32x32.png',
    tag: data.tag,
    data: { url: data.url ?? '/' },
  };
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // แจ้ง page ที่เปิดอยู่ให้ refresh bell ทันที
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'PUSH_RECEIVED' }));
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
