const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

const MAX_ALTERNATIVES = 3;

/**
 * @param {number} srcLat
 * @param {number} srcLng
 * @param {number} dstLat
 * @param {number} dstLng
 * @param {number} alternatives 
 * @returns {Promise<OSRMResponse>}
 */
export async function fetchOSRMRoutes(
  srcLat,
  srcLng,
  dstLat,
  dstLng,
  alternatives = MAX_ALTERNATIVES
) {
  const coords = `${srcLng},${srcLat};${dstLng},${dstLat}`;

  const url = new URL(
    `/route/v1/driving/${coords}`,
    OSRM_BASE_URL
  );

  url.searchParams.set("alternatives", alternatives);
  url.searchParams.set("steps", "true");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("annotations", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 0 }, 
  });

  if (!res.ok) {
    throw new Error(
      `OSRM request failed: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();

  if (data.code !== "Ok") {
    throw new Error(`OSRM error: ${data.code} — ${data.message ?? ""}`);
  }

  return data;
}

/**
 * @param {OSRMResponse} osrmData
 * @returns {ParsedRoute[]}
 */
export function parseOSRMRoutes(osrmData) {
  if (!osrmData?.routes?.length) return [];

  return osrmData.routes.map((route, index) => {
    const coords = route.geometry?.coordinates ?? [];

    const checkpoints = coords
      .filter((_, i) => i % Math.max(1, Math.floor(coords.length / 20)) === 0)
      .map(([lng, lat]) => ({ lat, lng }));

    const steps = route.legs.flatMap((leg) =>
      leg.steps.map((step) => ({
        instruction: step.maneuver?.instruction ?? step.name ?? "",
        distance: step.distance,   
        duration: step.duration,   
        type: step.maneuver?.type ?? "straight",
        coordinates:
          step.geometry?.coordinates?.map(([lng, lat]) => ({ lat, lng })) ??
          [],
      }))
    );

    return {
      index,
      distance: (route.distance / 1000).toFixed(2),           
      duration: Math.round(route.duration / 60),               
      geometry: route.geometry,                                 
      steps,
      legs: route.legs,
    };
  });
}

export async function getRoutes(srcLat, srcLng, dstLat, dstLng) {
  const raw = await fetchOSRMRoutes(srcLat, srcLng, dstLat, dstLng);
  return parseOSRMRoutes(raw);
}