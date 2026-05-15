"use client";
// components/home/SOSButton.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { MdLocationOn, MdClose }                    from "react-icons/md";
import { FiAlertOctagon }                           from "react-icons/fi";

const HOLD_MS            = 3000;
const LOCATION_POLL_MS   = 10_000; // push location every 10 s while SOS is active

export default function SOSButton({ onSOS, compact = false }) {
  const [holding,   setHolding]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [activated, setActivated] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [sosData,   setSosData]   = useState(null);  // returned by /api/sos
  const [locError,  setLocError]  = useState(null);

  const intervalRef    = useRef(null);   // hold-progress timer
  const startRef       = useRef(null);
  const locationPollRef = useRef(null);  // live-location push timer

  // ── Get current GPS position (promise wrapper) ──────────────────────────
  const getCurrentPosition = () =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout:            8000,
      })
    );

  // ── Push location update to server ──────────────────────────────────────
  const pushLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    try {
      const pos = await getCurrentPosition();
      await fetch("/api/tracking/update", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          speedKmh: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          heading:  pos.coords.heading ?? 0,
        }),
      });
    } catch {
      // Silently skip — location might be temporarily unavailable
    }
  }, []);

  // ── Trigger SOS ──────────────────────────────────────────────────────────
  const triggerSOS = useCallback(async () => {
    setActivated(true);
    setHolding(false);
    setProgress(100);
    setCountdown(0);

    try {
      // 1. Get initial GPS
      let lat = 0, lng = 0;
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        setLocError("Location unavailable — sending without GPS");
      }

      // 2. Hit our SOS API
      const res  = await fetch("/api/sos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lat, lng }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setSosData(json);

      // 3. Open WhatsApp for each contact
      const msg = buildWhatsAppMessage(json);
      json.contacts.forEach((contact, i) => {
        const phone = contact.phone.replace(/\D/g, "");
        const url   = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        // Stagger so browser doesn't block popups
        setTimeout(() => window.open(url, "_blank"), i * 800);
      });

      // 4. Send EmailJS backup (fire and forget)
      sendEmailJS(json).catch(console.error);

      // 5. Start pushing live location every 10 s
      locationPollRef.current = setInterval(pushLocation, LOCATION_POLL_MS);

      if (onSOS) onSOS(json);

    } catch (err) {
      console.error("[SOSButton] trigger error:", err);
      setLocError(err.message || "SOS failed — try again");
      setActivated(false);
    }
  }, [onSOS, pushLocation]);

  // ── Hold-press logic ─────────────────────────────────────────────────────
  const startHold = () => {
    if (activated) return;
    setHolding(true);
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct     = Math.min((elapsed / HOLD_MS) * 100, 100);
      const secs    = Math.ceil((HOLD_MS - elapsed) / 1000);
      setProgress(pct);
      setCountdown(secs > 0 ? secs : 0);
      if (elapsed >= HOLD_MS) {
        clearInterval(intervalRef.current);
        triggerSOS();
      }
    }, 50);
  };

  const endHold = () => {
    if (activated) return;
    clearInterval(intervalRef.current);
    setHolding(false);
    setProgress(0);
    setCountdown(null);
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    clearInterval(locationPollRef.current);
    setActivated(false);
    setProgress(0);
    setCountdown(null);
    setSosData(null);
    setLocError(null);
  };

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => () => {
    clearInterval(intervalRef.current);
    clearInterval(locationPollRef.current);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function buildWhatsAppMessage(data) {
    const time = new Date(data.triggeredAt).toLocaleTimeString();
    return (
      `🆘 *SOS ALERT* — ${data.userName} needs help!\n\n` +
      `📍 *Live location (updates every 10s):*\n${data.liveTrackingUrl}\n\n` +
      (data.snapshotLink
        ? `🗺 *Current snapshot:* ${data.snapshotLink}\n\n`
        : "") +
      `🕐 Time: ${time}\n` +
      `📞 Call them immediately!`
    );
  }

  async function sendEmailJS(data) {
    // EmailJS is loaded via CDN in your layout — adjust serviceId / templateId
    if (typeof emailjs === "undefined") return;
    const time = new Date(data.triggeredAt).toLocaleTimeString();
    for (const contact of data.contacts) {
      if (!contact.email) continue;
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        {
          to_email:      contact.email,
          to_name:       contact.name,
          user_name:     data.userName,
          location_link: data.liveTrackingUrl,    // ← LIVE link, not static
          snapshot_link: data.snapshotLink ?? "unavailable",
          time,
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
      );
    }
  }

  // ── Sizing ───────────────────────────────────────────────────────────────
  const SIZE         = compact ? 84  : 148;
  const RADIUS       = compact ? 40  : 70;
  const CX           = compact ? 42  : 74;
  const circumference = 2 * Math.PI * RADIUS;

  return (
    <>
      <style>{`
        @keyframes sosRingExpand  { 0%{opacity:.6;transform:scale(1)} 100%{opacity:0;transform:scale(1.35)} }
        @keyframes activatedPulse { 0%{box-shadow:0 0 40px rgba(255,77,77,.6),0 0 80px rgba(255,77,77,.3)} 100%{box-shadow:0 0 70px rgba(255,77,77,.9),0 0 140px rgba(255,77,77,.5)} }
        @keyframes fadeUp         { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .sos-ring-expand  { animation: sosRingExpand  2s ease-in-out infinite; }
        .sos-activated    { animation: activatedPulse 0.6s ease-in-out infinite alternate; }
        .sos-fade-up      { animation: fadeUp 0.4s ease; }
      `}</style>

      <div className="flex flex-col items-center gap-3.5 select-none">
        <div className="relative flex items-center justify-center">

          {!activated && (
            <div
              className="sos-ring-expand absolute rounded-full border-2 border-[#FF4D4D]/15 pointer-events-none"
              style={{ width: compact ? 104 : 180, height: compact ? 104 : 180 }}
            />
          )}

          {(holding || activated) && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ transform: "rotate(-90deg)" }}
              width={SIZE} height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
            >
              <circle cx={CX} cy={CX} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={compact ? 3 : 4} />
              <circle
                cx={CX} cy={CX} r={RADIUS}
                fill="none"
                stroke="#fff"
                strokeWidth={compact ? 3 : 4}
                strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
                style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.6))" }}
              />
            </svg>
          )}

          <button
            className={`relative z-10 rounded-full border-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-100 ${
              holding ? "scale-[.97]" : ""
            } ${activated ? "sos-activated" : ""}`}
            style={{
              width:  SIZE,
              height: SIZE,
              background: activated
                ? "radial-gradient(circle at 35% 35%, #ff8c8c, #FF4D4D 40%, #a02020)"
                : "radial-gradient(circle at 35% 35%, #ff6b6b, #FF4D4D 40%, #c73737)",
              boxShadow: holding
                ? "0 0 60px rgba(255,77,77,0.7), 0 0 120px rgba(255,77,77,0.3), inset 0 2px 4px rgba(255,255,255,0.2)"
                : compact
                  ? "0 0 24px rgba(255,77,77,0.4), inset 0 1px 2px rgba(255,255,255,0.2)"
                  : "0 0 40px rgba(255,77,77,0.45), 0 0 80px rgba(255,77,77,0.15), inset 0 2px 4px rgba(255,255,255,0.2)",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
          >
            {holding && countdown !== null ? (
              <span className="text-[28px] font-bold text-white font-[Poppins,sans-serif] drop-shadow-[0_0_20px_rgba(255,255,255,.5)]">
                {countdown}
              </span>
            ) : (
              <>
                <span
                  className="font-extrabold text-white tracking-widest font-[Poppins,sans-serif] drop-shadow-[0_2px_8px_rgba(0,0,0,.4)] leading-none"
                  style={{ fontSize: compact ? 18 : 30 }}
                >
                  SOS
                </span>
                {!compact && (
                  <span className="text-[9px] font-semibold text-white/65 tracking-[0.18em] uppercase mt-0.5 font-[Inter,sans-serif]">
                    Emergency
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {!compact && (
          <>
            {activated ? (
              <div className="sos-fade-up flex flex-col items-center gap-2 text-center">
                <div className="flex items-center gap-2">
                  <FiAlertOctagon size={16} className="text-[#FF4D4D]" />
                  <span className="text-[14px] font-bold text-[#FF4D4D] tracking-wider font-[Poppins,sans-serif]">
                    SOS ACTIVATED
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/50 font-[Inter,sans-serif]">
                  <MdLocationOn size={12} className="text-[#39D353]" />
                  Live location link sent — updates every 10s
                </div>
                {sosData?.liveTrackingUrl && (
                  <div className="text-[10px] text-white/30 break-all max-w-[220px]">
                    {sosData.liveTrackingUrl}
                  </div>
                )}
                {locError && (
                  <div className="text-[10px] text-[#FF4D4D]/70">{locError}</div>
                )}
                <p className="text-[11px] text-white/50">Emergency contacts notified via WhatsApp & Email</p>
                <button
                  onClick={reset}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors bg-transparent border-0 cursor-pointer underline mt-1"
                >
                  <MdClose size={11} /> Cancel / Reset
                </button>
              </div>
            ) : (
              <p className="text-[11.5px] text-white/40 text-center tracking-wide max-w-[160px] leading-relaxed font-[Inter,sans-serif]">
                {holding ? "Keep holding…" : "Hold 3 seconds to trigger SOS"}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}