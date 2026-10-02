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
