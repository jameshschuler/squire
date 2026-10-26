import { registerSW } from "virtual:pwa-register";

export const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function registerAppUpdates(): void {
  registerSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        checkForUpdatesWhileOpen(registration);
      }
    },
  });
}

export function checkForUpdatesWhileOpen(registration: Pick<ServiceWorkerRegistration, "update">): () => void {
  const check = () => {
    if (document.visibilityState === "visible") {
      registration.update().catch(() => undefined);
    }
  };
  document.addEventListener("visibilitychange", check);
  const timer = setInterval(check, UPDATE_CHECK_MS);
  return () => {
    document.removeEventListener("visibilitychange", check);
    clearInterval(timer);
  };
}
