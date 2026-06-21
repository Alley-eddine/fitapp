export type NotificationStatus = "granted" | "denied" | "unsupported";

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window
  );
}

export function notificationPermission(): NotificationStatus {
  if (!supported()) return "unsupported";
  return Notification.permission === "granted" ? "granted" : "denied";
}

/** Register the service worker and request notification permission. */
export async function enableNotifications(): Promise<NotificationStatus> {
  if (!supported()) return "unsupported";
  await navigator.serviceWorker.register("/sw.js");
  const permission = await Notification.requestPermission();
  return permission === "granted" ? "granted" : "denied";
}

/** Show a local notification through the service worker (no server needed). */
export async function showTestNotification(): Promise<void> {
  if (!supported()) throw new Error("Notifications non supportées par ce navigateur");
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification("FitCoach AI", {
    body: "Tes notifications sont activées 🎉",
    icon: "/icon.svg",
    badge: "/icon.svg",
  });
}
