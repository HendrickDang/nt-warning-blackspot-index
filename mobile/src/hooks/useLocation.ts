import * as Location from "expo-location";
import { useCallback, useState } from "react";
import type { Coordinates } from "@/types";

export type LocationStatus = "idle" | "loading" | "granted" | "denied" | "error";

/**
 * Reads the device's current GPS position for tagging a report.
 * Falls back to a "denied"/"error" status so the UI can show demo data.
 */
export function useCurrentLocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const capture = useCallback(async () => {
    setStatus("loading");
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== "granted") {
        setStatus("denied");
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const next: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      };
      setCoordinates(next);
      setStatus("granted");
      return next;
    } catch {
      setStatus("error");
      return null;
    }
  }, []);

  return { coordinates, status, capture };
}
