import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerSW } from "virtual:pwa-register";
import { UPDATE_CHECK_MS, checkForUpdatesWhileOpen, registerAppUpdates } from "@/app-updates";

vi.mock("virtual:pwa-register", () => ({ registerSW: vi.fn() }));

let visibility: DocumentVisibilityState = "visible";
let stop = () => {};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
  visibility = "visible";
});

function watch(update = vi.fn(async () => undefined as unknown as ServiceWorkerRegistration)) {
  stop = checkForUpdatesWhileOpen({ update });
  return update;
}

const switchTo = (state: DocumentVisibilityState) => {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("checkForUpdatesWhileOpen", () => {
  it("checks for a new version when the app comes back on screen", () => {
    const update = watch();
    switchTo("hidden");
    expect(update).not.toHaveBeenCalled();
    switchTo("visible");
    expect(update).toHaveBeenCalledOnce();
  });

  it("checks every hour while the app stays open", () => {
    const update = watch();
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(update).toHaveBeenCalledOnce();
  });

  it("skips the hourly check while the app is in the background", () => {
    visibility = "hidden";
    const update = watch();
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(update).not.toHaveBeenCalled();
  });

  it("stops checking once stopped", () => {
    const update = watch();
    stop();
    switchTo("visible");
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(update).not.toHaveBeenCalled();
  });

  it("ignores a failed check, such as when offline", async () => {
    const update = watch(vi.fn(() => Promise.reject(new Error("offline"))));
    switchTo("visible");
    await Promise.resolve();
    expect(update).toHaveBeenCalledOnce();
  });
});

describe("registerAppUpdates", () => {
  type Options = NonNullable<Parameters<typeof registerSW>[0]>;
  const registered = () => vi.mocked(registerSW).mock.calls.at(-1)![0] as Options;

  it("starts checking for updates once the service worker is registered", () => {
    registerAppUpdates();
    const update = vi.fn(async () => undefined as unknown as ServiceWorkerRegistration);
    registered().onRegisteredSW!("/sw.js", { update } as unknown as ServiceWorkerRegistration);
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(update).toHaveBeenCalledOnce();
  });

  it("does nothing more when the browser gives no registration", () => {
    registerAppUpdates();
    expect(() => registered().onRegisteredSW!("/sw.js", undefined)).not.toThrow();
  });
});
