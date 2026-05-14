"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import MapView    from "@/components/Home/MapView";
import AlertPopup from "@/components/Home/AlertPopup";
import SOSButton  from "@/components/Home/SOSButton";
import {
  FiNavigation, FiAlertTriangle, FiCheckCircle,
  FiClock, FiMapPin, FiArrowLeft, FiChevronRight,
} from "react-icons/fi";
import { MdSpeed, MdTurnLeft, MdTurnRight, MdStraight } from "react-icons/md";

const SCORE_COLOR = (s) => s == null ? "#00D1FF" : s >= 80 ? "#39D353" : s >= 50 ? "#FFC857" : "#FF4D4D";
const SCORE_LABEL = (s) => s == null ? "—" : s >= 80 ? "Safe" : s >= 50 ? "Moderate" : "Unsafe";
const POLL_MS = 15_000;

// ─── Step icon helper ─────────────────────────────────────────────────────────
function StepIcon({ type }) {
  if (type?.includes("left"))  return <MdTurnLeft  size={16} />;
  if (type?.includes("right")) return <MdTurnRight size={16} />;
  return <MdStraight size={16} />;
}

// ─── Directions panel ─────────────────────────────────────────────────────────
function DirectionsPanel({ steps = [], activeStep = 0, onStepClick }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeStep]);

  if (!steps.length) return null;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.12em]">
          Turn-by-Turn Directions
        </p>
        <span className="text-[10px] text-white/20">{steps.length} steps</span>
      </div>

      {/* Active step highlight */}
      {steps[activeStep] && (
        <div className="px-4 py-3 bg-[#00D1FF]/06 border-b border-[#00D1FF]/15 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00D1FF]/15 border border-[#00D1FF]/30 flex items-center justify-center text-[#00D1FF] flex-shrink-0">
            <StepIcon type={steps[activeStep].type} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#F5F7FA] leading-snug">
              {steps[activeStep].instruction || "Continue straight"}
            </p>
            {steps[activeStep].distance > 0 && (
              <p className="text-[10.5px] text-[#00D1FF]/70 mt-0.5">
                {steps[activeStep].distance < 1000
                  ? `${Math.round(steps[activeStep].distance)} m`
                  : `${(steps[activeStep].distance / 1000).toFixed(1)} km`}
              </p>
            )}
          </div>
          {activeStep < steps.length - 1 && (
            <FiChevronRight size={14} className="text-white/20 flex-shrink-0" />
          )}
        </div>
      )}

      {/* Scrollable step list */}
      <div className="max-h-52 overflow-y-auto">
        {steps.map((step, i) => (
          <div
            key={i}
            ref={i === activeStep ? activeRef : null}
            onClick={() => onStepClick?.(i)}
            className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer border-b border-white/[0.04] last:border-0 transition-colors
              ${i === activeStep ? "bg-[#00D1FF]/05" : "hover:bg-white/[0.02]"}
              ${i < activeStep  ? "opacity-40" : ""}`}
          >
            {/* Step number dot */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                ${i === activeStep ? "bg-[#00D1FF] text-[#081120]" : i < activeStep ? "bg-[#39D353]/30 text-[#39D353]" : "bg-white/10 text-white/40"}`}>
                {i < activeStep ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && <div className="w-px h-3 bg-white/10" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-[12px] text-white/65 leading-snug">
                {step.instruction || "Continue"}
              </p>
              {step.distance > 0 && (
                <p className="text-[10px] text-white/25 mt-0.5">
                  {step.distance < 1000 ? `${Math.round(step.distance)} m` : `${(step.distance / 1000).toFixed(1)} km`}
                  {step.duration > 0 && ` · ${Math.round(step.duration / 60)} min`}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Navigate Page ───────────────────────────────────────────────────────
export default function NavigatePage() {
  const router = useRouter();

  // Session
  const [sessionId,    setSessionId]    = useState(null);
  const [destination,  setDestination]  = useState(null);
  const [mapRoutes,    setMapRoutes]    = useState([]);
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [activeSteps,  setActiveSteps]  = useState([]);   // steps of selected route
  const [activeStep,   setActiveStep]   = useState(0);    // current step index

  // Live tracking
  const [userLocation, setUserLocation] = useState(null);
  const [tracking,     setTracking]     = useState(null);
  const [alerts,       setAlerts]       = useState([]);
  const [elapsed,      setElapsed]      = useState(0);
  const [completed,    setCompleted]    = useState(false);
  const [started,      setStarted]      = useState(false);

  const pollRef    = useRef(null);
  const elapsedRef = useRef(null);
  const startRef   = useRef(Date.now());

  // ── Load session from sessionStorage ──────────────────────────────────────
  useEffect(() => {
    const sid    = sessionStorage.getItem("snr_session_id");
    const routes = sessionStorage.getItem("snr_routes");
    const dst    = sessionStorage.getItem("snr_destination");
    const idx    = parseInt(sessionStorage.getItem("snr_route_idx") ?? "0", 10);

    if (!sid) { router.replace("/dashboard"); return; }

    setSessionId(sid);
    setSelectedIdx(idx);

    if (dst)    { try { setDestination(JSON.parse(dst)); } catch (_) {} }
    if (routes) {
      try {
        const parsed = JSON.parse(routes);
        setMapRoutes(parsed);
        // Load steps for the selected route
        const steps = parsed[idx]?.steps ?? [];
        setActiveSteps(steps);
      } catch (_) {}
    }

    setStarted(true);
  }, [router]);

  // ── GPS polling ────────────────────────────────────────────────────────────
  const pushUpdate = useCallback(async () => {
    if (!sessionId || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;
        setUserLocation({ lat, lng });

        try {
          const res  = await fetch("/api/tracking/update", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, lat, lng }),
          });
          const data = await res.json();
          if (!data.success) return;

          setTracking(data.data);

          // Advance step based on progress
          if (data.data.progressPercent && activeSteps.length) {
            const estimatedStep = Math.floor((data.data.progressPercent / 100) * activeSteps.length);
            setActiveStep(Math.min(estimatedStep, activeSteps.length - 1));
          }

          if (data.data.alerts?.length) {
            setAlerts((prev) => [
              ...data.data.alerts.map((a, i) => ({ ...a, id: `${Date.now()}_${i}` })),
              ...prev.slice(0, 3),
            ]);
          }

          if (data.data.journeyCompleted) {
            setCompleted(true);
            clearInterval(pollRef.current);
            clearInterval(elapsedRef.current);
          }
        } catch (_) {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [sessionId, activeSteps.length]);

  useEffect(() => {
    if (!started || !sessionId) return;
    startRef.current = Date.now();
    pushUpdate();
    pollRef.current    = setInterval(pushUpdate, POLL_MS);
    elapsedRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(elapsedRef.current); };
  }, [started, sessionId, pushUpdate]);

  // ── Stop navigation ────────────────────────────────────────────────────────
  const stopNavigation = useCallback(async (reason = "cancelled") => {
    clearInterval(pollRef.current);
    clearInterval(elapsedRef.current);
    if (sessionId) {
      try {
        await fetch("/api/navigation/stop", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, reason }),
        });
      } catch (_) {}
    }
    ["snr_session_id","snr_route_id","snr_route_idx","snr_routes","snr_destination","snr_src_coords"]
      .forEach((k) => sessionStorage.removeItem(k));
    router.push("/dashboard");
  }, [sessionId, router]);

  // ── SOS ────────────────────────────────────────────────────────────────────
  const handleSOS = useCallback(async () => {
    if (!userLocation) return;
    try {
      await fetch("/api/sos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: userLocation.lat, lng: userLocation.lng, sessionId }),
      });
      setAlerts((a) => [{ id: Date.now(), type: "danger", title: "SOS Sent", message: "Emergency contacts notified via SMS & WhatsApp." }, ...a]);
    } catch (_) {}
  }, [userLocation, sessionId]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const score = tracking?.locationScore ?? null;

  // ── Arrived ────────────────────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="min-h-screen bg-[#081120] flex items-center justify-center font-[Inter,sans-serif]">
        <div className="flex flex-col items-center gap-5 text-center p-8">
          <FiCheckCircle size={56} color="#39D353" />
          <p className="text-[22px] font-bold text-[#39D353] font-[Poppins,sans-serif]">Arrived Safely!</p>
          <p className="text-[14px] text-white/50">Journey completed in {formatTime(elapsed)}.</p>
          <button onClick={() => stopNavigation("completed")}
                  className="px-8 py-3 rounded-xl bg-[#39D353]/10 border border-[#39D353] text-[#39D353] font-bold font-[Poppins,sans-serif] text-[13px] hover:bg-[#39D353]/20 transition-all">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .np{min-height:100vh;background:#081120;padding-top:110px;color:#F5F7FA;font-family:'Inter',sans-serif}
        .ni{max-width:1280px;margin:0 auto;padding:0 24px 60px}
        .ng{display:grid;grid-template-columns:1fr 360px;gap:20px}
        .ns{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px}
        .nsv{font-family:'Poppins',sans-serif;font-size:18px;font-weight:700}
        .nsl{font-size:10px;color:rgba(245,247,250,.3);text-transform:uppercase;letter-spacing:.1em}
        .npb{height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}
        .npf{height:100%;border-radius:3px;background:linear-gradient(90deg,#39D353,#00D1FF);transition:width 1s ease}
        @media(max-width:1000px){.ng{grid-template-columns:1fr}}
      `}</style>

      <div className="np">
        <div className="ni">

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-[22px] font-bold font-[Poppins,sans-serif]">Live Navigation</h1>
              <p className="text-[13px] text-white/40 mt-0.5 flex items-center gap-1.5">
                <FiMapPin size={11} /> {destination?.label ?? "Navigating…"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[13px] text-white/40">
                <FiClock size={13} /> {formatTime(elapsed)}
              </div>
              <button onClick={() => stopNavigation("cancelled")}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 hover:border-[#FF4D4D]/40 hover:text-[#FF4D4D] transition-all text-[12px] font-medium">
                <FiArrowLeft size={13} /> End Trip
              </button>
            </div>
          </div>

          {/* ── Progress bar ───────────────────────────────────────────── */}
          <div className="mb-5">
            <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
              <span>Route progress</span>
              <span>{tracking?.progressPercent ?? 0}%</span>
            </div>
            <div className="npb"><div className="npf" style={{ width: `${tracking?.progressPercent ?? 0}%` }} /></div>
          </div>

          <div className="ng">

            {/* ── Map + directions ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              <MapView
                routes={mapRoutes}
                selectedRoute={selectedIdx}
                onRouteSelect={setSelectedIdx}
                userLocation={userLocation}
                destination={destination}
              />

              {/* ✅ Turn-by-turn directions panel */}
              <DirectionsPanel
                steps={activeSteps}
                activeStep={activeStep}
                onStepClick={setActiveStep}
              />

              {/* Alert cards */}
              {alerts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {alerts.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 px-4 py-3 rounded-xl border text-[12.5px]"
                         style={{
                           background:  a.type === "danger" ? "rgba(255,77,77,0.07)"  : "rgba(255,200,87,0.07)",
                           borderColor: a.type === "danger" ? "rgba(255,77,77,0.25)"  : "rgba(255,200,87,0.25)",
                           color:       a.type === "danger" ? "#FF4D4D"               : "#FFC857",
                         }}>
                      <FiAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold font-[Poppins,sans-serif] text-[11.5px] mb-0.5">{a.title}</p>
                        <p className="text-white/50 text-[11px]">{a.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">

              {/* ✅ Area safety score ring — updates from tracking API */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                    <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle cx="32" cy="32" r="27" fill="none"
                      stroke={SCORE_COLOR(score)} strokeWidth="5"
                      strokeDasharray={`${((score ?? 0) / 100) * 169.6} 169.6`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 1s ease" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[15px] font-bold font-[Poppins,sans-serif]" style={{ color: SCORE_COLOR(score) }}>
                      {score ?? "—"}
                    </span>
                    <span className="text-[8px] text-white/30 uppercase tracking-wider">score</span>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-white/35 mb-0.5 uppercase tracking-wider">Area Safety</p>
                  <p className="text-[18px] font-bold font-[Poppins,sans-serif]" style={{ color: SCORE_COLOR(score) }}>
                    {SCORE_LABEL(score)}
                  </p>
                  <p className="text-[11px] text-white/30 mt-0.5">{destination?.label ?? "En route"}</p>
                </div>
              </div>

              {/* ✅ Live stats grid — all fed from tracking API */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: <FiMapPin size={13} />,     label: "Remaining", val: tracking ? `${tracking.remainingKm ?? "—"} km` : "—",        color: "#00D1FF" },
                  { icon: <MdSpeed size={13} />,       label: "Speed",     val: tracking ? `${tracking.speedKmh ?? 0} km/h` : "—",           color: "#39D353" },
                  { icon: <FiNavigation size={13} />,  label: "Progress",  val: tracking ? `${tracking.progressPercent ?? 0}%` : "—",         color: "#39D353" },
                  { icon: <FiAlertTriangle size={13} />,label: "Off Route", val: tracking?.isOffRoute ? "YES" : "No", color: tracking?.isOffRoute ? "#FF4D4D" : "#39D353" },
                ].map((s) => (
                  <div key={s.label} className="ns">
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <div>
                      <div className="nsl">{s.label}</div>
                      <div className="nsv" style={{ color: s.color }}>{s.val}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reroute button when off-route */}
              {tracking?.isOffRoute && (
                <button onClick={() => router.push("/dashboard")}
                        className="w-full py-3 rounded-xl bg-[#FFC857]/10 border border-[#FFC857]/30 text-[#FFC857] font-[Poppins,sans-serif] font-bold text-[12px] tracking-wide hover:bg-[#FFC857]/20 transition-all flex items-center justify-center gap-2">
                  <FiNavigation size={13} /> Reroute
                </button>
              )}

              {/* SOS */}
              <div className="bg-[#FF4D4D]/05 border border-[#FF4D4D]/15 rounded-2xl p-5 flex flex-col items-center gap-2">
                <p className="text-[12px] font-semibold text-white/50 font-[Poppins,sans-serif]">Emergency SOS</p>
                <SOSButton onSOS={handleSOS} compact={false} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertPopup alerts={alerts} onDismiss={(id) => setAlerts((a) => a.filter((x) => x.id !== id))} position="bottom-right" />
    </>
  );
}