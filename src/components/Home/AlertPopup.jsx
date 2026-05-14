"use client";

import { useEffect } from "react";
import { FiX, FiMapPin, FiNavigation } from "react-icons/fi";
import { MdWarning, MdDangerous, MdInfo, MdCheckCircle } from "react-icons/md";

const ALERT_STYLES = {
  warning: {
    color: "#FFC857",
    bg: "rgba(255,200,87,0.08)",
    border: "rgba(255,200,87,0.25)",
    glow: "rgba(255,200,87,0.15)",
    icon: MdWarning,
  },
  danger: {
    color: "#FF4D4D",
    bg: "rgba(255,77,77,0.08)",
    border: "rgba(255,77,77,0.25)",
    glow: "rgba(255,77,77,0.15)",
    icon: MdDangerous,
  },
  info: {
    color: "#00D1FF",
    bg: "rgba(0,209,255,0.08)",
    border: "rgba(0,209,255,0.25)",
    glow: "rgba(0,209,255,0.15)",
    icon: MdInfo,
  },
  success: {
    color: "#39D353",
    bg: "rgba(57,211,83,0.08)",
    border: "rgba(57,211,83,0.25)",
    glow: "rgba(57,211,83,0.15)",
    icon: MdCheckCircle,
  },
};

const POSITION_CLASSES = {
  "top-right":     "top-[100px] right-6",
  "bottom-right":  "bottom-6 right-6",
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
};

export default function AlertPopup({
  alerts = [],
  onDismiss,
  position = "bottom-right",
}) {
  useEffect(() => {
    if (!alerts.length) return;
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss(alerts[0].id);
    }, 8000);
    return () => clearTimeout(timer);
  }, [alerts, onDismiss]);

  const posClass = POSITION_CLASSES[position] || POSITION_CLASSES["bottom-right"];

  if (!alerts.length) return null;

  return (
    <>
      <style>{`
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateX(30px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)   scale(1);    }
        }
        @keyframes alertProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
        .alert-slide-in { animation: alertSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .alert-progress  { animation: alertProgress 8s linear forwards; }
      `}</style>

      <div className={`fixed z-[2000] flex flex-col gap-2.5 max-w-[360px] w-[calc(100vw-48px)] ${posClass}`}>
        {alerts.map((alert) => {
          const s = ALERT_STYLES[alert.type] || ALERT_STYLES.warning;
          const Icon = s.icon;

          return (
            <div
              key={alert.id}
              className="alert-slide-in relative overflow-hidden flex items-start gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-xl font-[Inter,sans-serif]"
              style={{
                background: "rgba(8,17,32,0.92)",
                borderColor: s.border,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${s.glow}`,
              }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
              />
              <div
                className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none"
                style={{ background: `linear-gradient(to bottom, ${s.bg}, transparent)` }}
              />
              <div className="relative z-10 mt-0.5 flex-shrink-0">
                <Icon size={22} style={{ color: s.color }} />
              </div>
              <div className="relative z-10 flex-1 min-w-0">

                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold font-[Poppins,sans-serif]" style={{ color: s.color }}>
                    {alert.title}
                  </span>
                  <button
                    onClick={() => onDismiss && onDismiss(alert.id)}
                    className="ml-2 flex-shrink-0 bg-transparent border-0 p-0 cursor-pointer text-white/30 hover:text-white/70 transition-colors"
                  >
                    <FiX size={16} />
                  </button>
                </div>
                <p className="text-[12px] text-white/65 leading-relaxed mb-2">{alert.message}</p>

                <div className="flex items-center justify-between">
                  {alert.distance && (
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold"
                      style={{ color: s.color, background: s.bg, borderColor: s.border }}
                    >
                      <FiMapPin size={9} /> {alert.distance}
                    </span>
                  )}
                  <span className="text-[9.5px] text-white/25 tracking-wide ml-auto">Just now</span>
                </div>

                {(alert.type === "warning" || alert.type === "danger") && (
                  <div className="flex gap-1.5 mt-2.5">
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10.5px] font-bold font-[Poppins,sans-serif] tracking-wider border-0 cursor-pointer transition-all hover:opacity-85"
                      style={{ background: s.color, color: "#081120" }}
                    >
                      <FiNavigation size={10} /> Reroute
                    </button>
                    <button
                      onClick={() => onDismiss && onDismiss(alert.id)}
                      className="px-3 py-1.5 rounded-lg text-[10.5px] font-semibold font-[Poppins,sans-serif] bg-transparent border border-white/10 text-white/50 cursor-pointer hover:border-white/25 hover:text-white/80 transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              <div
                className="alert-progress absolute bottom-0 left-0 right-0 h-0.5 opacity-40 origin-left"
                style={{ background: s.color }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}