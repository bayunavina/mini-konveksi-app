"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { getMessaging, getToken, deleteToken, onMessage } from "firebase/messaging"
import { getFirebaseApp, VAPID_PUBLIC_KEY } from "@/lib/firebase/client"

const SW_PATH = "/firebase-messaging-sw.js"

export function usePushNotification(userId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window) {
      setSupported(true)
      setPermission(Notification.permission)
      checkExistingSubscription()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getRegistrationReady = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      await navigator.serviceWorker.register(SW_PATH)
      const reg = await navigator.serviceWorker.ready
      return reg
    } catch (error) {
      console.error("Error registering service worker:", error)
      return null
    }
  }, [])

  const checkExistingSubscription = useCallback(async () => {
    if (!userId || inFlightRef.current) return
    try {
      if (typeof window === "undefined" || !("Notification" in window)) return
      if (Notification.permission !== "granted") return
      const reg = await getRegistrationReady()
      if (!reg) return
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        setSubscribed(true)
      }
    } catch (error) {
      console.error("Error checking push subscription:", error)
    }
  }, [userId, getRegistrationReady])

  const requestPermission = useCallback(async () => {
    if (!userId || inFlightRef.current) return
    inFlightRef.current = true
    try {
      setLoading(true)
      if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
        console.warn("Push not supported in this browser")
        return
      }

      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== "granted") return

      const app = getFirebaseApp()
      const messaging = getMessaging(app)
      const reg = await getRegistrationReady()
      if (!reg) {
        console.error("Service worker registration failed")
        return
      }

      // In Firefox the first getToken() can abort because the service worker
      // has not taken control of the page yet. Retry once after a short delay.
      let token: string | null = null
      for (let attempt = 0; attempt < 2 && !token; attempt++) {
        try {
          token = await getToken(messaging, {
            vapidKey: VAPID_PUBLIC_KEY,
            serviceWorkerRegistration: reg,
          })
        } catch (error) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1200))
            continue
          }
          throw error
        }
      }

      if (token) {
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, token, device: "browser" }),
        })
        if (response.ok) {
          setSubscribed(true)
        } else {
          console.error("Failed to register token:", response.status)
        }
      }

      onMessage(messaging, (payload) => {
        if (payload.notification) {
          new Notification(payload.notification.title || "ERP Konveksi", {
            body: payload.notification.body || "",
            icon: payload.notification.icon || "/icon-192.png",
          })
        }
      })
    } catch (error) {
      console.error("Error requesting push permission:", error)
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [userId, getRegistrationReady])

  const unsubscribe = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
        const app = getFirebaseApp()
        const messaging = getMessaging(app)
        const reg = await getRegistrationReady()
        if (reg) {
          try {
            const token = await getToken(messaging, {
              vapidKey: VAPID_PUBLIC_KEY,
              serviceWorkerRegistration: reg,
            })
            if (token) {
              await fetch("/api/push/subscribe", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              })
            }
          } catch {
            // no active token, ignore
          }
          await deleteToken(messaging)
        }
      }
      setSubscribed(false)
    } catch (error) {
      console.error("Error unsubscribing push:", error)
    } finally {
      inFlightRef.current = false
    }
  }, [getRegistrationReady])

  return {
    supported,
    permission,
    subscribed,
    loading,
    requestPermission,
    unsubscribe,
  }
}