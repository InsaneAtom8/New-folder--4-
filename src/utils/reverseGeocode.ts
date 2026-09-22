const geocodeCache = new Map<string, string>();

/**
 * Perform reverse geocoding via OpenStreetMap Nominatim API
 * Includes caching and fallback to coordinates formatting if fetch fails
 */
export async function getStreetNameFromCoords(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`,
      {
        headers: {
          'User-Agent': 'PotholeVision-AI/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address;
      if (addr) {
        const road = addr.road || addr.street || addr.highway || addr.suburb || addr.neighbourhood || addr.city_district;
        const city = addr.city || addr.town || addr.village || addr.county;
        if (road && city) {
          const result = `${road}, ${city}`;
          geocodeCache.set(cacheKey, result);
          return result;
        } else if (road) {
          geocodeCache.set(cacheKey, road);
          return road;
        } else if (data.display_name) {
          const parts = data.display_name.split(',');
          const shortName = parts.slice(0, 2).join(',').trim();
          geocodeCache.set(cacheKey, shortName);
          return shortName;
        }
      }
    }
  } catch (err) {
    // Network or CORS error or timeout
  }

  const fallback = `Loc: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}
