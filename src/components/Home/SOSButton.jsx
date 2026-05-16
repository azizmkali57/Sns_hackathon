"use client";
// components/Home/SOSButton.jsx
// Auto-sends WhatsApp message to every guardian when SOS is triggered

import { useState, useEffect, useRef, useCallback } from "react";

const LOCATION_OPTS   = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
const UPDATE_INTERVAL = 10_000;

function buildSOSMessage({ userName, liveUrl, snapshotLink, triggeredAt }) {
  const time = new Date(triggeredAt).toLocaleTimeString();
  return [
    `🆘 SOS ALERT — ${userName} needs help!`,
    ``,
    `📍 Live location (updates every 10s):`,
    liveUrl,
    ``,
    snapshotLink ? `🗺️ Current snapshot: ${snapshotLink}` : ``,
    `🕐 Time: ${time}`,
    `📞 Call them immediately!`,
  ].filter(Boolean).join("\n").trim();
}

function openWhatsApp(phone, message) {
  const clean = phone.replace(/[\s\-().+]/g, "");
  // ensure country code — if number doesn't start with country code add 91 (India)
  const normalized = clean.startsWith("91") || clean.length > 10 ? clean : `91${clean}`;
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function SOSButton({ onSOS }) {
  const [phase,     setPhase]     = useState("idle"); // idle|confirm|triggering|active|error
  const [liveUrl,   setLiveUrl]   = useState(null);
  const [contacts,  setContacts]  = useState([]);
  const [errorMsg,  setErrorMsg]  = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [location,  setLocation]  = useState(null);
  const [sentCount, setSentCount] = useState(0);
  const [sosData,   setSosData]   = useState(null);

  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);

  // ── Push GPS to server every 10s ──────────────────────────────────────
  const pushGPS = useCallback(async (lat, lng) => {
    try {
      await fetch("/api/tracking/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
    } catch {}
  }, []);

  const startLiveTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    const push = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setLocation({ lat: coords.latitude, lng: coords.longitude });
          pushGPS(coords.latitude, coords.longitude);
        },
        () => {},
        LOCATION_OPTS
      );
    };
    push();
    intervalRef.current = setInterval(push, UPDATE_INTERVAL);
  }, [pushGPS]);

  const stopLiveTracking = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  // ── Main SOS trigger ──────────────────────────────────────────────────
  const triggerSOS = useCallback(async () => {
    setPhase("triggering");
    setSentCount(0);

    // 1. Get GPS
    let lat = 0, lng = 0;
    try {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => { lat = coords.latitude; lng = coords.longitude; resolve(); },
          resolve,
          LOCATION_OPTS
        );
      });
    } catch {}

    try {
      // 2. Create SOS record on server
      const res  = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "SOS failed");

      const guardians = data.contacts ?? [];
      setSosData(data);
      setLiveUrl(data.liveTrackingUrl);
      setContacts(guardians);
      setPhase("active");
      startLiveTracking();
      onSOS?.({ lat, lng, liveUrl: data.liveTrackingUrl });

      // 3. Build message once
      const message = buildSOSMessage({
        userName:    data.userName,
        liveUrl:     data.liveTrackingUrl,
        snapshotLink: data.snapshotLink,
        triggeredAt: data.triggeredAt ?? new Date().toISOString(),
      });

      // 4. Open WhatsApp for each guardian with 1.5s gap
      //    (browsers require user gesture + small delay between window.open calls)
      let sent = 0;
      for (let i = 0; i < guardians.length; i++) {
        if (!guardians[i]?.phone) continue;
        openWhatsApp(guardians[i].phone, message);
        sent++;
        setSentCount(sent);
        if (i < guardians.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
      setPhase("error");
    }
  }, [onSOS, startLiveTracking]);

  // ── 3-second hold to confirm ──────────────────────────────────────────
  const startHold = () => {
    if (phase !== "idle") return;
    setPhase("confirm");
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) { clearInterval(countdownRef.current); triggerSOS(); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const cancelHold = () => {
    if (phase !== "confirm") return;
    clearInterval(countdownRef.current);
    setPhase("idle");
    setCountdown(3);
  };

  const resolveSOS = () => {
    stopLiveTracking();
    setPhase("idle");
    setLiveUrl(null); setContacts([]); setLocation(null); setSentCount(0); setSosData(null);
  };

  const resendToAll = useCallback(async () => {
    if (!liveUrl || !contacts.length || !sosData) return;
    const message = buildSOSMessage({
      userName:    sosData.userName,
      liveUrl,
      snapshotLink: location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : null,
      triggeredAt: new Date().toISOString(),
    });
    for (let i = 0; i < contacts.length; i++) {
      if (!contacts[i]?.phone) continue;
      openWhatsApp(contacts[i].phone, message);
      if (i < contacts.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
  }, [liveUrl, contacts, location, sosData]);

  useEffect(() => () => { stopLiveTracking(); clearInterval(countdownRef.current); }, [stopLiveTracking]);

  // ── ACTIVE STATE ──────────────────────────────────────────────────────
  if (phase === "active") return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
        borderRadius: 12, background: "rgba(255,40,40,0.1)", border: "1px solid rgba(255,77,77,0.3)",
      }}>
        <Blink />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FF4D4D" }}>SOS ACTIVE</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>Live GPS updating every 10s</div>
        </div>
        {sentCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#39D353",
            background: "rgba(57,211,83,0.1)", border: "1px solid rgba(57,211,83,0.25)",
            padding: "2px 8px", borderRadius: 20,
          }}>✓ {sentCount} notified</span>
        )}
      </div>

      {/* Per-contact sent status */}
      {contacts.length > 0 && (
        <div style={{
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column", gap: 7,
        }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            WhatsApp sent to
          </p>
          {contacts.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>✅</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{c.name}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>{c.phone}</span>
              </div>
              <button
                onClick={() => {
                  if (!liveUrl || !sosData) return;
                  openWhatsApp(c.phone, buildSOSMessage({
                    userName: sosData.userName, liveUrl,
                    snapshotLink: location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : null,
                    triggeredAt: new Date().toISOString(),
                  }));
                }}
                style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 6,
                  background: "#25D366", border: "none", color: "#fff",
                  cursor: "pointer", fontWeight: 600,
                }}
              >Resend</button>
            </div>
          ))}
        </div>
      )}

      {/* Live link */}
      {liveUrl && (
        <div style={{
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(0,209,255,0.04)", border: "1px solid rgba(0,209,255,0.12)",
        }}>
          <p style={{ fontSize: 10, color: "rgba(0,209,255,0.6)", marginBottom: 3, letterSpacing: "0.1em", textTransform: "uppercase" }}>Live Tracking Link</p>
          <p style={{ fontSize: 11, color: "#00D1FF", wordBreak: "break-all", fontFamily: "monospace" }}>{liveUrl}</p>
          {location && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
              📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={resendToAll} style={{
          flex: 1, padding: "9px 8px", borderRadius: 10,
          background: "#25D366", border: "none", color: "#fff",
          fontWeight: 700, fontSize: 12, cursor: "pointer",
        }}>📤 Resend to All</button>
        <button onClick={() => liveUrl && navigator.clipboard?.writeText(liveUrl)} style={{
          padding: "9px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontWeight: 600,
        }}>📋 Copy</button>
      </div>

      <button onClick={resolveSOS} style={{
        width: "100%", padding: "9px", borderRadius: 10,
        background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer",
      }}>✓ I am safe — Cancel SOS</button>
    </div>
  );

  if (phase === "triggering") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <Spinner />
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
        Sending SOS &amp; opening WhatsApp for each contact…
      </p>
    </div>
  );

  if (phase === "error") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <p style={{ fontSize: 12, color: "#FF4D4D", textAlign: "center" }}>⚠ {errorMsg}</p>
      <button onClick={() => setPhase("idle")} style={{
        padding: "8px 20px", borderRadius: 8, background: "#FF4D4D",
        border: "none", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer",
      }}>Retry</button>
    </div>
  );

  // ── IDLE / CONFIRM ────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {phase === "confirm" && (
        <p style={{ fontSize: 12, color: "#FF4D4D", fontWeight: 700, textAlign: "center" }}>
          Sending in {countdown}s…<br />
          <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>Release to cancel</span>
        </p>
      )}

      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={(e) => { e.preventDefault(); startHold(); }}
        onTouchEnd={cancelHold}
        style={{
          width: 120, height: 120, borderRadius: "50%",
          background: phase === "confirm"
            ? "radial-gradient(circle, #ff2222, #cc0000)"
            : "radial-gradient(circle, #ff4444, #cc0000)",
          boxShadow: phase === "confirm"
            ? "0 0 50px rgba(255,40,40,0.9), 0 0 100px rgba(255,40,40,0.3)"
            : "0 0 24px rgba(255,77,77,0.4)",
          border: `4px solid ${phase === "confirm" ? "#ff8888" : "rgba(255,77,77,0.5)"}`,
          color: "#fff", fontWeight: 900, fontSize: 28,
          cursor: "pointer", userSelect: "none", WebkitUserSelect: "none",
          transition: "all 0.15s",
          transform: phase === "confirm" ? "scale(1.1)" : "scale(1)",
        }}
      >
        SOS
      </button>

      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
        {phase === "confirm" ? "Keep holding…" : "Hold 3s → auto-WhatsApp all guardians"}
      </p>
    </div>
  );
}

function Blink() {
  return (
    <>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}`}</style>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", background: "#FF4D4D",
        boxShadow: "0 0 8px rgba(255,77,77,0.9)", flexShrink: 0,
        animation: "blink 1.2s ease-in-out infinite",
      }} />
    </>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 36, height: 36, border: "3px solid rgba(255,77,77,0.2)",
        borderTopColor: "#FF4D4D", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </>
  );
}