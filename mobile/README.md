# Warning Blackspot — Mobile (React Native / Expo)

A native Android + iOS app ported from the `Warning_Blackspot_App_Source_Code`
web prototype: an offline-first bushfire hazard reporting concept for remote
Northern Territory communities (Wadeye).

Built with **Expo SDK 57**, **Expo Router**, TypeScript, and `react-native-svg`.

## Screens

| Screen | What it does |
| --- | --- |
| **Map** (`src/app/(tabs)/index.tsx`) | Fire-danger summary, live community map (OpenStreetMap tiles) with risk areas, Fire risk / Coverage layer toggle, "Seen a hazard?" action card. Falls back to the offline SVG map with no connectivity. |
| **Report** (`src/app/(tabs)/report.tsx`) | Hazard category, risk level, real camera photo, real GPS tag, notes, then **Send** (online) or **Save to offline queue**. |
| **Queue** (`src/app/(tabs)/queue.tsx`) | Offline storage: sync status, saved reports with queued / syncing / synced indicators, add another report. |
| **Profile** (`src/app/(tabs)/profile.tsx`) | Reporter identity, community + access info, last sync, English / Murrinh Patha language choice, and spoken instructions. |

## Offline-first behaviour

- Reports are persisted with **AsyncStorage** (`src/store/AppProvider.tsx`).
- Real device connectivity is read with **`@react-native-community/netinfo`**.
- Reports saved while offline are marked `queued`; the moment connectivity
  returns they are uploaded to the field-reports API (`syncing` → `synced`).
- A badge on the Queue tab shows how many reports are still waiting.

## Field reports → dashboard

Submitting a report uploads it to the reports API in
`connectivity-dashboard1/server`, where the **Field Reports** page and map layer
display it (with its captured GPS position).

- API base URL is resolved in `src/config.ts`:
  1. `EXPO_PUBLIC_API_URL` (set this for a standalone build),
  2. the Expo dev-server host (automatic in Expo Go on a phone),
  3. `http://localhost:8787` (emulator / web).
- Point a standalone APK at your machine with, for example:
  `EXPO_PUBLIC_API_URL=http://192.168.1.20:8787 npx expo prebuild -p android`
  (the value is baked in at build time).
- If the API is unreachable the app keeps working — reports stay queued and are
  retried on the next connectivity change.

## Native features

- **Camera** — `expo-camera` live capture, with a photo-library fallback
  (`expo-image-picker`). Attached photos are resized to 1280 px and sent with
  the report; the dashboard shows them as thumbnails and in map popups.
- **Location** — `expo-location` reads real GPS coordinates for a report and
  tags each submitted report; the Map screen's locate button centres the live
  map on your position. Falls back to demo data when permission is denied.
- **Speech** — `expo-speech` reads the safety instructions aloud from the
  Profile screen.

## Run it

Requirements: Node.js 22+ and the Expo Go app on your phone (or an emulator).

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go, or press `a` / `i` for an emulator.
Camera and GPS require a physical device (the iOS Simulator has no camera).

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

## Project layout

```
src/
  app/                # Expo Router routes
    (tabs)/           # Map, Report, Queue, Profile + shared header/tab bar
  components/         # Icon set, MapViewCard (live OSM), MapCard (offline SVG),
                      # CameraModal, TabBar, list items…
  store/AppProvider.tsx   # offline queue, upload to reports API, language
  hooks/useLocation.ts    # GPS permission + position capture
  config.ts           # reports API base URL resolution
  theme/colors.ts     # design tokens ported from the web CSS
  data/hazards.ts     # hazard categories, severities, demo risk areas
```

## Building an Android APK locally

The native project is generated (Continuous Native Generation) — never edit
`android/` by hand.

```bash
npx expo prebuild -p android
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
# -> android/app/build/outputs/apk/release/app-release.apk
```

Two Windows gotchas that this project hits:

1. Use **JDK 17** (React Native 0.86's supported version). Newer JDKs (24/25)
   break the CMake native steps with `A restricted method in java.lang.System
   has been called`.
2. Build from a **short path** (e.g. `C:\wb`). Deep paths make
   `react-native-reanimated`'s CMake object paths exceed `CMAKE_OBJECT_PATH_MAX`,
   which fails with `ninja: manifest 'build.ninja' still dirty after 100 tries`.

## Notes

- The live map uses **OpenStreetMap raster tiles** (Leaflet in a WebView), so no
  Google Maps API key is needed. When the device is offline the screen swaps to
  a decorative SVG map that needs no network.
- Demonstration data only. A production app would need verified geographic
  data, offline image storage, a secure government API, and community-reviewed
  Murrinh Patha translations and recorded audio.
