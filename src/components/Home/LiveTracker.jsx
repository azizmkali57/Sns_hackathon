"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FiNavigation, FiAlertTriangle, FiCheckCircle,
  FiMapPin, FiClock, FiZap, FiWifi, FiWifiOff,
} from "react-icons/fi";
import { MdSpeed, MdSos } from "react-icons/md";

const POLL_INTERVAL_MS = 15_000; 

const SCORE_COLOR = (s) => s == null ? "#00D1FF" : s >= 80 ? "#39D353" : s >= 50 ? "#FFC857" : "#FF4D4D";
const SCORE_LABEL = (s) => s == null ? "—" : s >= 80 ? "Safe" : s >= 50 ? "Moderate" : "Unsafe";

export default function LiveTracker({
  sessionId,             
  routeId,               
  destination = "",      
  initialScore = 0,      
  onJourneyComplete,     
  onSOS,                 
  className = "",
}) {
  const [tracking,    setTracking]    = useState(null);   
  const [alerts,      setAlerts]      = useState([]);
  const [connected,   setConnected]   = useState(false);
  const [error,       setError]       = useState(null);
  const [elapsed,     setElapsed]     = useState(0);      
  const [completed,   setCompleted]   = useState(false);

  const startTimeRef  = useRef(Date.now());
  const pollRef       = useRef(null);
  const elapsedRef    = useRef(null);

  const pushUpdate = useCallback(async () => {
    if (!navigator.geolocation || !sessionId) return;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch("/api/tracking/update", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              lat: coords.latitude,
              lng: coords.longitude,
            }),
          });

          const data = await res.json();
          if (!data.success) throw new Error(data.error);

          setTracking(data.data);
          setConnected(true);
          setError(null);

          if (data.data.alerts?.length) {
            setAlerts((prev) => [
              ...data.data.alerts.map((a, i) => ({ ...a, id: Date.now() + i })),
              ...prev.slice(0, 4),  // keep max 5
            ]);
          }

          if (data.data.journeyCompleted) {
            setCompleted(true);
            clearInterval(pollRef.current);
            clearInterval(elapsedRef.current);
            onJourneyComplete?.();
          }
        } catch (err) {
          setConnected(false);
          setError("Update failed — retrying…");
        }
      },
      () => {
        setConnected(false);
        setError("GPS unavailable — check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [sessionId, onJourneyComplete]);

  useEffect(() => {
    if (!sessionId) return;

    pushUpdate();
    pollRef.current = setInterval(pushUpdate, POLL_INTERVAL_MS);

    elapsedRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
      1000
    );

    return () => {
      clearInterval(pollRef.current);
      clearInterval(elapsedRef.current);
    };
  }, [sessionId, pushUpdate]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const score     = tracking?.locationScore ?? initialScore;
  const scoreColor = SCORE_COLOR(score);

  if (completed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 p-8
                       bg-[#39D353]/08 border border-[#39D353]/25 rounded-2xl text-center
                       font-[Inter,sans-serif] ${className}`}>
        <FiCheckCircle size={48} className="text-[#39D353]" />
        <p className="text-[18px] font-bold text-[#39D353] font-[Poppins,sans-serif]">
          Arrived Safely!
        </p>
        <p className="text-[13px] text-white/50">
          You reached <strong className="text-white/70">{destination}</strong> in {formatTime(elapsed)}.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 font-[Inter,sans-serif] ${className}`}>

      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl
                      bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-2 text-[11px]">
          {connected
            ? <><FiWifi size={12} className="text-[#39D353]" />
                <span className="text-[#39D353] font-semibold">Live Tracking Active</span></>
            : <><FiWifiOff size={12} className="text-[#FF4D4D]" />
                <span className="text-[#FF4D4D]">Reconnecting…</span></>
          }
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/30">
          <FiClock size={10} />
          {formatTime(elapsed)}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                        bg-[#FFC857]/08 border border-[#FFC857]/25
                        text-[#FFC857] text-[11.5px]">
          <FiAlertTriangle size={13} /> {error}
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-4 rounded-2xl
                      bg-white/[0.03] border border-white/[0.06]">

        {/* Score ring */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="32" cy="32" r="27" fill="none"
              stroke={scoreColor} strokeWidth="5"
              strokeDasharray={`${(score / 100) * 169.6} 169.6`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${scoreColor})`, transition: "stroke-dasharray 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[15px] font-bold font-[Poppins,sans-serif]" style={{ color: scoreColor }}>
              {score}
            </span>
            <span className="text-[8px] text-white/30 uppercase tracking-wider">score</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-white/35 mb-0.5 uppercase tracking-wider">Heading to</p>
          <p className="text-[14px] font-semibold text-[#F5F7FA] font-[Poppins,sans-serif]
                        truncate">
            {destination || "Destination"}
          </p>
          <span
            className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold
                       uppercase tracking-wide border"
            style={{
              color: scoreColor,
              background: `${scoreColor}15`,
              borderColor: `${scoreColor}40`,
            }}
          >
            {SCORE_LABEL(score)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {[
          {
            icon:  <FiMapPin size={14} />,
            label: "Remaining",
            value: tracking ? `${tracking.remainingKm} km` : "—",
            color: "#00D1FF",
          },
          {
            icon:  <MdSpeed size={14} />,
            label: "Speed",
            value: tracking ? `${tracking.speedKmh} km/h` : "—",
            color: "#39D353",
          },
          {
            icon:  <FiNavigation size={14} />,
            label: "Progress",
            value: tracking ? `${tracking.progressPercent}%` : "—",
            color: "#39D353",
          },
          {
            icon:  <FiZap size={14} />,
            label: "Off-Route",
            value: tracking?.isOffRoute ? "YES" : "No",
            color: tracking?.isOffRoute ? "#FF4D4D" : "#39D353",
          },
        ].map((s) => (
          <div key={s.label}
               className="flex items-center gap-3 px-3.5 py-3 rounded-xl
                          bg-white/[0.03] border border-white/[0.05]">
            <span style={{ color: s.color }}>{s.icon}</span>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</p>
              <p className="text-[14px] font-bold font-[Poppins,sans-serif]" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {tracking && (
        <div className="px-1">
          <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
            <span>Route progress</span>
            <span>{tracking.progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width:      `${tracking.progressPercent}%`,
                background: `linear-gradient(90deg, #39D353, #00D1FF)`,
                boxShadow:  "0 0 8px rgba(57,211,83,0.5)",
              }}
            />
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-[12px]"
              style={{
                background:  a.type === "danger" ? "rgba(255,77,77,0.07)"  : "rgba(255,200,87,0.07)",
                borderColor: a.type === "danger" ? "rgba(255,77,77,0.25)"  : "rgba(255,200,87,0.25)",
                color:       a.type === "danger" ? "#FF4D4D"               : "#FFC857",
              }}
            >
              <FiAlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold font-[Poppins,sans-serif] text-[11.5px] mb-0.5">
                  {a.title}
                </p>
                <p className="text-white/50 text-[11px]">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onSOS}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                   bg-[#FF4D4D]/10 border-[1.5px] border-[#FF4D4D]
                   text-[#FF4D4D] font-[Poppins,sans-serif] font-bold text-[13px]
                   tracking-wider uppercase
                   hover:bg-[#FF4D4D]/20 hover:shadow-[0_0_24px_rgba(255,77,77,0.3)]
                   transition-all duration-200 animate-pulse"
      >
        <MdSos size={18} /> SOS Emergency
      </button>
    </div>
  );
}