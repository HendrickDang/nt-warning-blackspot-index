import Constants from "expo-constants";

/**
 * Candidate base URLs for the field-reports API
 * (see connectivity-dashboard1/server).
 *
 * The app probes these in order at startup and uses the first one that
 * answers /api/health, so it works across environments:
 *
 *   1. EXPO_PUBLIC_API_URL       — explicit override (baked into a build)
 *   2. the Expo dev-server host  — automatic in Expo Go on a phone
 *   3. http://localhost:8787     — `adb reverse tcp:8787 tcp:8787` over USB
 *   4. http://127.0.0.1:8787     — same, as a literal loopback
 *
 * The USB (adb reverse) entry matters on locked-down networks (e.g. campus
 * Wi-Fi with client isolation) where the phone cannot reach the PC directly.
 */
const DEFAULT_PORT = 8787;

type ExpoLike = {
  expoConfig?: { hostUri?: string };
  manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  manifest?: { debuggerHost?: string };
};

function inferDevHost(): string | null {
  const constants = Constants as unknown as ExpoLike;
  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoGo?.debuggerHost ??
    constants.manifest?.debuggerHost ??
    null;

  if (typeof hostUri !== "string" || hostUri.length === 0) return null;
  const host = hostUri.split(":")[0];
  return host || null;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function buildCandidates(): string[] {
  const list: string[] = [];

  // EXPO_PUBLIC_API_URL may contain several comma-separated base URLs; they are
  // tried in order. e.g. "http://localhost:8787,http://192.168.1.20:8787".
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (typeof override === "string" && override.length > 0) {
    override
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map(stripTrailingSlash)
      .forEach((url) => list.push(url));
  }

  const devHost = inferDevHost();
  if (devHost) list.push(`http://${devHost}:${DEFAULT_PORT}`);

  list.push(`http://localhost:${DEFAULT_PORT}`);
  list.push(`http://127.0.0.1:${DEFAULT_PORT}`);

  return Array.from(new Set(list));
}

export const API_BASE_CANDIDATES: readonly string[] = buildCandidates();

/** Primary base URL (first candidate); the store may switch to a fallback. */
export const API_BASE_URL: string = API_BASE_CANDIDATES[0];
