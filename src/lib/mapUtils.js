const EARTH_RADIUS_KM = 6371;

export { EARTH_RADIUS_KM };

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @param {Array<{lat:number, lng:number}>} coords
 */
export function routeLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(
      coords[i - 1].lat, coords[i - 1].lng,
      coords[i].lat,     coords[i].lng
    );
  }
  return total;
}

/**
 * @param {{lat:number,lng:number}} point
 * @param {Array<{lat:number,lng:number}>} routeCoords
 * @param {number} radiusKm
 */
export function isPointNearRoute(point, routeCoords, radiusKm = 0.15) {
  return routeCoords.some(
    (c) => haversineDistance(point.lat, point.lng, c.lat, c.lng) <= radiusKm
  );
}

/**
 * @param {Array<{lat:number,lng:number}>} coords
 * @param {number} maxPoints 
 */
export function sampleRoute(coords, maxPoints = 100) {
  if (coords.length <= maxPoints) return coords;
  const step = Math.ceil(coords.length / maxPoints);
  return coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
}

/**
 * @param {object} geojson
 */
export function geojsonToLatLng(geojson) {
  if (!geojson?.coordinates) return [];
  return geojson.coordinates.map(([lng, lat]) => ({ lat, lng }));
}

export function toLeafletLatLngs(coords) {
  return coords.map(({ lat, lng }) => [lat, lng]);
}


/**
 * @param {Array<{lat:number,lng:number}>} coords
 * @returns {{ minLat, maxLat, minLng, maxLng, center }}
 */
export function boundingBox(coords) {
  if (!coords.length)
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0, center: { lat: 0, lng: 0 } };

  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    minLat, maxLat, minLng, maxLng,
    center: {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    },
  };
}

export function bearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function bearingToLabel(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function routeProgress(currentLat, currentLng, routeCoords) {
  let closestIdx = 0;
  let minDist = Infinity;

  routeCoords.forEach((c, i) => {
    const d = haversineDistance(currentLat, currentLng, c.lat, c.lng);
    if (d < minDist) { minDist = d; closestIdx = i; }
  });

  const remaining = routeLength(routeCoords.slice(closestIdx));
  const traveled  = routeLength(routeCoords.slice(0, closestIdx + 1));
  const total     = traveled + remaining;

  return {
    closestIdx,
    distanceToRoute: minDist,      
    remainingKm: remaining,
    traveledKm: traveled,
    progressPct: total > 0 ? Math.round((traveled / total) * 100) : 0,
  };
}

export function buildOverpassQuery(lat, lng, radiusKm = 0.3) {
  const r = radiusKm * 1000; // metres
  return `
    [out:json][timeout:25];
    (
      node["highway"="street_lamp"](around:${r},${lat},${lng});
      node["public_transport"="stop_position"](around:${r},${lat},${lng});
      node["amenity"~"hospital|police|pharmacy|school|bank"](around:${r},${lat},${lng});
      node["barrier"](around:${r},${lat},${lng});
    );
    out body;
  `.trim();
}

export function parseOverpassResponse(data) {
  const counts = { lamps: 0, stops: 0, amenities: 0, barriers: 0 };

  (data?.elements ?? []).forEach((el) => {
    if (el.tags?.highway === "street_lamp")                      counts.lamps++;
    else if (el.tags?.public_transport === "stop_position")      counts.stops++;
    else if (el.tags?.amenity)                                   counts.amenities++;
    else if (el.tags?.barrier)                                   counts.barriers++;
  });

  return counts;
}