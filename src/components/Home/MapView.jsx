"use client";

import { useEffect, useRef, useState } from "react";
import { FiNavigation, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { MdMyLocation } from "react-icons/md";
import "leaflet/dist/leaflet.css";

const SCORE_COLOR = (s) =>
  s >= 80 ? "#39D353" : s >= 50 ? "#FFC857" : "#FF4D4D";

export default function MapView({
  routes = [],
  selectedRoute = 0,
  onRouteSelect,
  userLocation = null,
  destination = null,
  className = "",
}) {
  const mapRef = useRef(null);

  // Leaflet instances
  const mapInstanceRef = useRef(null);
  const polylinesRef = useRef([]);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const [ready, setReady] = useState(false);

  // =========================
  // INITIALIZE MAP
  // =========================
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mapRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      // Already initialized
      if (mapInstanceRef.current) return;

      const Lmod = await import("leaflet");
      const L = Lmod.default ?? Lmod;

      // HOT RELOAD FIX
      // Remove existing leaflet container id if present
      if (mapRef.current && mapRef.current._leaflet_id) {
        mapRef.current._leaflet_id = null;
      }

      // Fix marker icons
      delete L.Icon.Default.prototype._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: userLocation
          ? [userLocation.lat, userLocation.lng]
          : [22.7196, 75.8577],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      // Dark map layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
        }
      ).addTo(map);

      // Attribution
      L.control
        .attribution({ prefix: false })
        .addAttribution(
          '© <a href="https://www.openstreetmap.org">OSM</a> | CartoDB'
        )
        .addTo(map);

      if (!isMounted) {
        map.remove();
        return;
      }

      mapInstanceRef.current = map;

      setReady(true);
    };

    initMap();

    return () => {
      isMounted = false;

      // Remove polylines
      polylinesRef.current.forEach((p) => {
        try {
          p.remove();
        } catch {}
      });

      polylinesRef.current = [];

      // Remove markers
      try {
        userMarkerRef.current?.remove();
      } catch {}

      try {
        destMarkerRef.current?.remove();
      } catch {}

      userMarkerRef.current = null;
      destMarkerRef.current = null;

      // Remove map safely
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {}

        mapInstanceRef.current = null;
      }

      // REMOVE LEAFLET ID
      if (mapRef.current && mapRef.current._leaflet_id) {
        mapRef.current._leaflet_id = null;
      }

      setReady(false);
    };
  }, []);

  // =========================
  // DRAW ROUTES
  // =========================
  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;

    const drawRoutes = async () => {
      const Lmod = await import("leaflet");
      const L = Lmod.default ?? Lmod;

      const map = mapInstanceRef.current;

      if (!map) return;

      // Remove old routes
      polylinesRef.current.forEach((p) => {
        try {
          p.remove();
        } catch {}
      });

      polylinesRef.current = [];

      const allLayers = [];

      routes.forEach((route, idx) => {
        let coords = [];

        // GeoJSON format
        if (route.geometry?.coordinates?.length) {
          coords = route.geometry.coordinates.map(([lng, lat]) => [
            lat,
            lng,
          ]);
        }

        // Fallback checkpoints
        else if (route.checkpoints?.length) {
          coords = route.checkpoints.map((c) => [c.lat, c.lng]);
        }

        if (!coords.length) return;

        const isSelected = idx === selectedRoute;
        const color = SCORE_COLOR(route.score ?? 50);

        // Glow effect
        const glow = L.polyline(coords, {
          color,
          weight: isSelected ? 18 : 0,
          opacity: 0.12,
          interactive: false,
        }).addTo(map);

        // Main route line
        const line = L.polyline(coords, {
          color,
          weight: isSelected ? 5 : 2.5,
          opacity: isSelected ? 1 : 0.4,
          dashArray: isSelected ? null : "8 6",
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        // Click route
        line.on("click", () => {
          onRouteSelect?.(idx);
        });

        // Tooltip
        line.bindTooltip(
          `
            <strong style="font-family:Poppins,sans-serif">
              Route ${idx + 1}
            </strong>
            <br/>
            Score: <strong>${route.score ?? "—"}/100</strong>
            <br/>
            ${route.distance ?? "—"} km · ${route.duration ?? "—"} min
          `,
          {
            sticky: true,
          }
        );

        polylinesRef.current.push(glow, line);

        allLayers.push(line);
      });

      // Fit bounds
      if (allLayers.length) {
        try {
          const group = L.featureGroup(allLayers);

          if (group.getLayers().length) {
            map.fitBounds(group.getBounds().pad(0.15));
          }
        } catch {}
      }
    };

    drawRoutes();
  }, [ready, routes, selectedRoute, onRouteSelect]);

  // =========================
  // USER MARKER
  // =========================
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !userLocation) return;

    const drawUser = async () => {
      const Lmod = await import("leaflet");
      const L = Lmod.default ?? Lmod;

      userMarkerRef.current?.remove();

      userMarkerRef.current = L.marker(
        [userLocation.lat, userLocation.lng],
        {
          icon: L.divIcon({
            className: "",
            html: `
              <div
                style="
                  width:16px;
                  height:16px;
                  border-radius:50%;
                  background:#00D1FF;
                  border:2.5px solid #fff;
                  box-shadow:
                    0 0 0 5px rgba(0,209,255,.2),
                    0 0 14px #00D1FF;
                "
              ></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
          zIndexOffset: 1000,
        }
      )
        .addTo(mapInstanceRef.current)
        .bindPopup("<strong>You are here</strong>");

      // Auto center if no routes
      if (!routes.length) {
        mapInstanceRef.current.setView(
          [userLocation.lat, userLocation.lng],
          15
        );
      }
    };

    drawUser();
  }, [ready, userLocation, routes.length]);

  // =========================
  // DESTINATION MARKER
  // =========================
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !destination) return;

    const drawDestination = async () => {
      const Lmod = await import("leaflet");
      const L = Lmod.default ?? Lmod;

      destMarkerRef.current?.remove();

      destMarkerRef.current = L.marker(
        [destination.lat, destination.lng],
        {
          icon: L.divIcon({
            className: "",
            html: `
              <div
                style="
                  width:18px;
                  height:18px;
                  border-radius:50%;
                  background:#39D353;
                  border:2.5px solid #fff;
                  box-shadow:0 0 14px #39D353;
                "
              ></div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }
      )
        .addTo(mapInstanceRef.current)
        .bindPopup(
          `<strong>${destination.label ?? "Destination"}</strong>`
        );
    };

    drawDestination();
  }, [ready, destination]);

  // =========================
  // CONTROLS
  // =========================
  const zoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const zoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const centerUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [userLocation.lat, userLocation.lng],
        16
      );
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-white/10 ${className}`}
      style={{
        height: 420,
        background: "#0a1628",
      }}
    >
      {/* MAP */}
      <div ref={mapRef} className="w-full h-full" />

      {/* LOADER */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1628]">
          <div className="flex flex-col items-center gap-3 text-white/30">
            <FiNavigation size={32} className="animate-spin" />

            <span className="text-xs font-medium tracking-widest uppercase font-[Inter,sans-serif]">
              Loading map…
            </span>
          </div>
        </div>
      )}

      {/* LIVE BADGE */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#081120]/85 backdrop-blur border border-[#00D1FF]/20 text-[11px] font-medium text-white/60 font-[Inter,sans-serif]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#39D353] shadow-[0_0_6px_#39D353] animate-pulse" />

        LIVE MAP — OSM
      </div>

      {/* CONTROLS */}
      <div className="absolute right-3 bottom-8 z-[1000] flex flex-col gap-1.5">
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#081120]/85 backdrop-blur border border-white/10 text-white/70 hover:border-[#00D1FF]/50 hover:text-[#00D1FF] transition-all"
        >
          <FiZoomIn size={15} />
        </button>

        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#081120]/85 backdrop-blur border border-white/10 text-white/70 hover:border-[#00D1FF]/50 hover:text-[#00D1FF] transition-all"
        >
          <FiZoomOut size={15} />
        </button>

        {userLocation && (
          <button
            onClick={centerUser}
            className="w-8 h-8 flex items-center justify-center rounded-lg mt-1 bg-[#081120]/85 backdrop-blur border border-[#00D1FF]/30 text-[#00D1FF] hover:bg-[#00D1FF]/10 transition-all"
          >
            <MdMyLocation size={15} />
          </button>
        )}
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-2 left-3 z-[1000] text-[9px] text-white/20 font-[Inter,sans-serif]">
        © OpenStreetMap · OSRM · CartoDB
      </div>
    </div>
  );
}