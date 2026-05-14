"use client";
import { useState, useRef } from "react";
import { MdLocationOn, MdClose } from "react-icons/md";
import { FiAlertOctagon } from "react-icons/fi";

export default function SOSButton({ onSOS, compact = false }) {
  const [holding,   setHolding]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [activated, setActivated] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const intervalRef = useRef(null);
  const startRef    = useRef(null);
  const HOLD_MS     = 3000;

  const startHold = () => {
    if (activated) return;
    setHolding(true);
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct  = Math.min((elapsed / HOLD_MS) * 100, 100);
      const secs = Math.ceil((HOLD_MS - elapsed) / 1000);
      setProgress(pct);
      setCountdown(secs > 0 ? secs : 0);
      if (elapsed >= HOLD_MS) {
        clearInterval(intervalRef.current);
        setActivated(true);
        setHolding(false);
        setProgress(100);
        setCountdown(0);
        if (onSOS) onSOS();
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

  const reset = () => { setActivated(false); setProgress(0); setCountdown(null); };

  const SIZE     = compact ? 84  : 148;
  const RADIUS   = compact ? 40  : 70;
  const CX       = compact ? 42  : 74;
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
                style={{
                  filter: "drop-shadow(0 0 6px rgba(255,255,255,0.6))",
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                }}
              />
            </svg>
          )}

          <button
            className={`relative z-10 rounded-full border-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-100 ${
              holding   ? "scale-[.97]" : ""
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
                <div className="flex items-center gap-1.5 text-[11px] text-white/50 font-[Inter,sans-serif] text-center">
                  <MdLocationOn size={12} className="text-[#39D353]" />
                  Live location sent via SMS & WhatsApp
                </div>
                <p className="text-[11px] text-white/50">Emergency contacts notified</p>
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