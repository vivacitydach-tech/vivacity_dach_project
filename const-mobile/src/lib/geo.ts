export type GeoCoords = {
  latitude: number
  longitude: number
}

/** Best-effort GPS fix; returns null if denied, unavailable, or timed out. */
export function getCurrentPosition(timeoutMs = 10000): Promise<GeoCoords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}

/** Calculate distance between two coordinates in meters using Haversine formula */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/** Verifies if the device is within the project site geofence radius (default 300m) */
export function verifySiteGeofence(
  current: GeoCoords,
  site: GeoCoords,
  radiusMeters = 300
): { isInside: boolean; distanceMeters: number } {
  const distance = calculateDistanceMeters(
    current.latitude,
    current.longitude,
    site.latitude,
    site.longitude
  );
  return {
    isInside: distance <= radiusMeters,
    distanceMeters: distance,
  };
}
