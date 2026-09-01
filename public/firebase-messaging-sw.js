importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "AIzaSyBAbk_9ohBTw1VADsxyRrzOrRBC6cpa2lM",
  authDomain: "erp-konveksi.firebaseapp.com",
  projectId: "erp-konveksi",
  storageBucket: "erp-konveksi.firebasestorage.app",
  messagingSenderId: "977535659546",
  appId: "1:977535659546:web:feba2497c60c33ab47eba3",
  measurementId: "G-GV31272PHH",
})

const messaging = firebase.messaging()

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notificationTitle || payload.data.title || "ERP Konveksi"
  const notificationOptions = {
    body: payload.notificationBody || payload.data.body || "",
    icon: payload.data.icon || "/icon-192.png",
    data: { url: payload.data.url || "/dashboard" },
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data.url || "/dashboard"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
