"use client";

import { useEffect, useRef, useState } from "react";
import { FiNavigation, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { MdMyLocation } from "react-icons/md";
import "leaflet/dist/leaflet.css";

const SCORE_COLOR = (s) =>
  s >= 80 ? "#16C47F" : s >= 50 ? "#F7C948" : "#FF5A5F";

export default function MapView({
  routes = [],
  selectedRoute = 0,
  onRouteSelect,
  userLocation = null,
  destination = null,
  className = "",
}) {
  const mapRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const polylinesRef = useRef([]);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mapRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      if (mapInstanceRef.current) return;

      const Lmod = await import("leaflet");
      const L = Lmod.default ?? Lmod;

      if (mapRef.current && mapRef.current._leaflet_id) {
        mapRef.current._leaflet_id = null;
      }

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

      // Light map tile layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
        }
      ).addTo(map);

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

      polylinesRef.current.forEach((p) => {
        try { p.remove(); } catch {}
      });
      polylinesRef.current = [];

      try { userMarkerRef.current?.remove(); } catch {}
      try { destMarkerRef.current?.remove(); } catch {}

      userMarkerRef.current = null;
      destMarkerRef.current = null;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }

      if (mapRef.current && mapRef.current._leaflet_id) {
        mapRef.current._leaflet_id = null;
      }

      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;

    const drawRoutes = async () => {
      const Lmod = await import("leaflet");
      const L = Lmod.default ?? Lmod;

      const map = mapInstanceRef.current;
      if (!map) return;

      polylinesRef.current.forEach((p) => {
        try { p.remove(); } catch {}
      });
      polylinesRef.current = [];

      const allLayers = [];

      routes.forEach((route, idx) => {
        let coords = [];

        if (route.geometry?.coordinates?.length) {
          coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        } else if (route.checkpoints?.length) {
          coords = route.checkpoints.map((c) => [c.lat, c.lng]);
        }

        if (!coords.length) return;

        const isSelected = idx === selectedRoute;
        const color = SCORE_COLOR(route.score ?? 50);

        const glow = L.polyline(coords, {
          color,
          weight: isSelected ? 18 : 0,
          opacity: 0.10,
          interactive: false,
        }).addTo(map);

        const line = L.polyline(coords, {
          color,
          weight: isSelected ? 5 : 2.5,
          opacity: isSelected ? 1 : 0.4,
          dashArray: isSelected ? null : "8 6",
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        line.on("click", () => { onRouteSelect?.(idx); });

        line.bindTooltip(
          `<strong style="font-family:Poppins,sans-serif">Route ${idx + 1}</strong><br/>Score: <strong>${route.score ?? "—"}/100</strong><br/>${route.distance ?? "—"} km · ${route.duration ?? "—"} min`,
          { sticky: true }
        );

        polylinesRef.current.push(glow, line);
        allLayers.push(line);
      });

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
              <div style="
                width:16px; height:16px; border-radius:50%;
                background:#0EA5E9; border:2.5px solid #fff;
                box-shadow: 0 0 0 5px rgba(14,165,233,.2), 0 0 14px #0EA5E9;
              "></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
          zIndexOffset: 1000,
        }
      )
        .addTo(mapInstanceRef.current)
        .bindPopup("<strong>You are here</strong>");

      if (!routes.length) {
        mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15);
      }
    };

    drawUser();
  }, [ready, userLocation, routes.length]);

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
              <div style="
                width:18px; height:18px; border-radius:50%;
                background:#16C47F; border:2.5px solid #fff;
                box-shadow:0 0 14px #16C47F;
              "></div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }
      )
        .addTo(mapInstanceRef.current)
        .bindPopup(`<strong>${destination.label ?? "Destination"}</strong>`);
    };

    drawDestination();
  }, [ready, destination]);

  const zoomIn  = () => { mapInstanceRef.current?.zoomIn(); };
  const zoomOut = () => { mapInstanceRef.current?.zoomOut(); };
  const centerUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 16);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden ${className}`}
      style={{
        height: 420,
        background: "#F4F8FB",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 4px 20px rgba(15,23,42,0.08)",
      }}
    >
      <div ref={mapRef} className="w-full h-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#F4F8FB" }}>
          <div className="flex flex-col items-center gap-3" style={{ color: "#64748B" }}>
            <FiNavigation size={32} className="animate-spin" />
            <span className="text-xs font-medium tracking-widest uppercase font-[Inter,sans-serif]">
              Loading map…
            </span>
          </div>
        </div>
      )}

      {/* LIVE BADGE */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur text-[11px] font-medium font-[Inter,sans-serif]"
           style={{ background: "rgba(244,248,251,0.90)", border: "1px solid rgba(14,165,233,0.20)", color: "#64748B" }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#16C47F", boxShadow: "0 0 6px #16C47F" }} />
        LIVE MAP — OSM
      </div>

      {/* CONTROLS */}
      <div className="absolute right-3 bottom-8 z-[1000] flex flex-col gap-1.5">
        {[
          { action: zoomIn,    Icon: FiZoomIn   },
          { action: zoomOut,   Icon: FiZoomOut  },
        ].map(({ action, Icon }, i) => (
          <button
            key={i}
            onClick={action}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ background: "rgba(244,248,251,0.90)", border: "1px solid rgba(15,23,42,0.10)", color: "#64748B" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(14,165,233,0.40)"; e.currentTarget.style.color = "#0EA5E9"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.10)"; e.currentTarget.style.color = "#64748B"; }}
          >
            <Icon size={15} />
          </button>
        ))}

        {userLocation && (
          <button
            onClick={centerUser}
            className="w-8 h-8 flex items-center justify-center rounded-lg mt-1 transition-all"
            style={{ background: "rgba(244,248,251,0.90)", border: "1px solid rgba(14,165,233,0.30)", color: "#0EA5E9" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(14,165,233,0.10)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(244,248,251,0.90)"; }}
          >
            <MdMyLocation size={15} />
          </button>
        )}
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-2 left-3 z-[1000] text-[9px] font-[Inter,sans-serif]" style={{ color: "rgba(15,23,42,0.30)" }}>
        © OpenStreetMap · OSRM · CartoDB
      </div>
    </div>
  );
}