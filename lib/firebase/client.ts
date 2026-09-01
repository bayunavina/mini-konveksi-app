"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getMessaging, isSupported, type Messaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyBAbk_9ohBTw1VADsxyRrzOrRBC6cpa2lM",
  authDomain: "erp-konveksi.firebaseapp.com",
  projectId: "erp-konveksi",
  storageBucket: "erp-konveksi.firebasestorage.app",
  messagingSenderId: "977535659546",
  appId: "1:977535659546:web:feba2497c60c33ab47eba3",
  measurementId: "G-GV31272PHH",
}

export const VAPID_PUBLIC_KEY = "BHKSNozSn9LrPtBTMB4ddod-WdSAZKU9Xla-lkqj_DKguvknru1tnlY-sfDntqZPtAdHVzoi9XYFSzKAHJmdsDU"

export function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig)
  }
  return getApp()
}

let messagingInstance: Messaging | null = null

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (!(await isSupported())) {
    return null
  }
  if (!messagingInstance) {
    const app = getFirebaseApp()
    messagingInstance = getMessaging(app)
  }
  return messagingInstance
}
