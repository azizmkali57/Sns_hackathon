"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AlertPopup    from "@/components/Home/AlertPopup";
import MapView       from "@/components/Home/MapView";
import SOSButton     from "@/components/Home/SOSButton";
import RouteSelector from "@/components/Home/RouteSelector";
import { FiShield, FiAlertTriangle, FiUsers, FiPhoneCall } from "react-icons/fi";

const BASE_STATS = [
  { key: "safety",    label: "Safety Score",     sub: "Best route",     color: "#39D353", Icon: FiShield        },
  { key: "incidents", label: "Incidents Nearby",  sub: "Within 500m",   color: "#FFC857", Icon: FiAlertTriangle },
  { key: "users",     label: "Active Users",      sub: "In your area",  color: "#00D1FF", Icon: FiUsers         },
  { key: "sos",       label: "SOS Ready",         sub: "Twilio linked", color: "#39D353", Icon: FiPhoneCall     },
];

export default function DashboardPage() {
  const router = useRouter();

  const [mapRoutes,    setMapRoutes]    = useState([]);
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [destination,  setDestination]  = useState(null);
  const [routeDocId,   setRouteDocId]   = useState(null);
  const [explanation,  setExplanation]  = useState("");
  const [alerts,       setAlerts]       = useState([]);
  const [stats,        setStats]        = useState({
    safety: "—", incidents: "—", users: "142", sos: "ON",
  });

  const handleRouteSelect = useCallback((route, idx, allRoutes, docId, srcCoords, dstCoords) => {
    setSelectedIdx(idx);
    setMapRoutes(allRoutes ?? []);               // ✅ full routes with geometry
    if (docId)     setRouteDocId(docId);
    if (srcCoords) setUserLocation({ lat: srcCoords.lat, lng: srcCoords.lng }); // ✅ source pin
    if (dstCoords) setDestination({ lat: dstCoords.lat, lng: dstCoords.lng, label: route?.name ?? "Destination" }); // ✅ dest pin
    if (route) {
      setStats((p) => ({ ...p, safety: `${route.score ?? "—"}/100`, incidents: `${route.incidentCount ?? "—"}` }));
      setExplanation(route.explanation ?? "");
    }
  }, []);

  const handleStartNavigation = useCallback(async (docId, idx, srcCoords, dstCoords) => {
    try {
      const res  = await fetch("/api/navigation/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: docId, selectedRouteIndex: idx, startLat: srcCoords?.lat, startLng: srcCoords?.lng, guardianContacts: [] }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Could not start navigation");

      sessionStorage.setItem("snr_session_id",  data.data.sessionId);
      sessionStorage.setItem("snr_route_id",    docId);
      sessionStorage.setItem("snr_route_idx",   String(idx));
      sessionStorage.setItem("snr_routes",      JSON.stringify(mapRoutes)); // ✅ with geometry
      sessionStorage.setItem("snr_destination", JSON.stringify(destination));
      sessionStorage.setItem("snr_src_coords",  JSON.stringify(srcCoords));

      router.push("/navigate");
    } catch (err) {
      setAlerts((a) => [...a, { id: Date.now(), type: "danger", title: "Navigation Error", message: err.message }]);
    }
  }, [destination, mapRoutes, router]);

  const handleSOS = useCallback(async () => {
    if (!userLocation) return;
    try {
      await fetch("/api/sos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: userLocation.lat, lng: userLocation.lng }),
      });
      setAlerts((a) => [...a, { id: Date.now(), type: "danger", title: "SOS Triggered", message: "Emergency contacts notified." }]);
    } catch (_) {}
  }, [userLocation]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .d{min-height:100vh;background:#081120;padding-top:110px;font-family:'Inter',sans-serif;color:#F5F7FA;position:relative}
        .d::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 800px 600px at 10% 20%,rgba(57,211,83,.05) 0%,transparent 70%),radial-gradient(ellipse 600px 400px at 90% 80%,rgba(0,209,255,.04) 0%,transparent 70%);pointer-events:none;z-index:0}
        .di{max-width:1280px;margin:0 auto;padding:0 24px 60px;position:relative;z-index:1}
        .dt{font-family:'Poppins',sans-serif;font-size:28px;font-weight:800;color:#F5F7FA;letter-spacing:-.02em}
        .dt span{background:linear-gradient(90deg,#39D353,#00D1FF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .ds{font-size:13.5px;color:rgba(245,247,250,.4);margin-top:4px}
        .dsr{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0 28px}
        .dsc{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:18px;display:flex;align-items:center;gap:14px;transition:all .2s}
        .dsc:hover{border-color:var(--c);background:rgba(255,255,255,.05)}
        .dsi{width:44px;height:44px;border-radius:10px;background:var(--bg);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .dsv{font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;color:var(--c);line-height:1;margin-bottom:2px}
        .dsl{font-size:12px;color:rgba(245,247,250,.5)}
        .dss{font-size:10px;color:rgba(245,247,250,.28);margin-top:1px}
        .dg{display:grid;grid-template-columns:1fr 400px;gap:20px}
        .dtt{font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;color:rgba(245,247,250,.35);letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px}
        .dai{background:rgba(0,209,255,.04);border:1px solid rgba(0,209,255,.12);border-radius:14px;padding:16px;margin-top:16px}
        .dab{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:rgba(0,209,255,.1);border:1px solid rgba(0,209,255,.25);border-radius:20px;font-size:9.5px;font-weight:700;color:#00D1FF;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
        .dat{font-size:12.5px;color:rgba(245,247,250,.55);line-height:1.65}
        .dsp{background:rgba(255,77,77,.05);border:1px solid rgba(255,77,77,.15);border-radius:16px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;margin-top:16px}
        .dsp-t{font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;color:rgba(245,247,250,.6);margin-bottom:12px}
        @media(max-width:1100px){.dg{grid-template-columns:1fr}.dsr{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.dsr{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="d">
        <div className="di">
          <div>
            <h1 className="dt">Safe<span>Route</span> Dashboard</h1>
            <p className="ds">Real-time safety analysis · Indore, Madhya Pradesh</p>
          </div>

          <div className="dsr">
            {BASE_STATS.map((s) => (
              <div key={s.key} className="dsc" style={{ "--c": s.color, "--bg": `${s.color}15`, "--bd": `${s.color}30` }}>
                <div className="dsi"><s.Icon size={20} style={{ color: s.color }} /></div>
                <div>
                  <div className="dsv">{stats[s.key]}</div>
                  <div className="dsl">{s.label}</div>
                  <div className="dss">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="dg">
            <div>
              <p className="dtt">Live Map — Route Visualization</p>
              <MapView
                routes={mapRoutes}
                selectedRoute={selectedIdx}
                onRouteSelect={(idx) => {
                  setSelectedIdx(idx);
                  if (mapRoutes[idx]) {
                    setStats((p) => ({ ...p, safety: `${mapRoutes[idx].score ?? "—"}/100`, incidents: `${mapRoutes[idx].incidentCount ?? "—"}` }));
                    setExplanation(mapRoutes[idx].explanation ?? "");
                  }
                }}
                userLocation={userLocation}
                destination={destination}
              />
              <div className="dai">
                <div className="dab">🤖 AI Explanation</div>
                <p className="dat">
                  {explanation || "Enter a source and destination to get real safety scores, route alternatives, and an AI explanation of which route is safest."}
                </p>
              </div>
            </div>

            <div>
              <p className="dtt">Find Your Route</p>
              <RouteSelector onRouteSelect={handleRouteSelect} onStartNavigation={handleStartNavigation} />
              <div className="dsp">
                <p className="dsp-t">⚡ Emergency SOS</p>
                <SOSButton onSOS={handleSOS} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertPopup alerts={alerts} onDismiss={(id) => setAlerts((a) => a.filter((x) => x.id !== id))} position="bottom-right" />
    </>
  );
}