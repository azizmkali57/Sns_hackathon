"use client";
// app/track/[token]/page.jsx
import { useEffect, useState, useCallback, use } from "react";

const POLL_MS = 10000;

export default function TrackPage({ params }) {
  const { token } = use(params); // ✅ Next.js 15 fix — unwrap the Promise

  const [data, setData]             = useState(null);
  const [error, setError]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lastPoll, setLastPoll]     = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchLocation = useCallback(async () => {
    if (!token) {
      setError("Invalid tracking link — token missing");
      setLoading(false);
      return;
    }
    try {
      const res  = await fetch(`/api/track/${token}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to load location");
        return;
      }
      setData(json);
      setLastPoll(Date.now());
      setSecondsAgo(0);
      setError(null);
    } catch {
      setError("Network error — retrying…");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLocation();
    const pollId = setInterval(fetchLocation, POLL_MS);
    return () => clearInterval(pollId);
  }, [fetchLocation]);

  useEffect(() => {
    const id = setInterval(() => {
      if (lastPoll) setSecondsAgo(Math.floor((Date.now() - lastPoll) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastPoll]);

  const lat = data?.location?.lat;
  const lng = data?.location?.lng;
  const hasLocation = lat && lng && lat !== 0 && lng !== 0;

  const mapSrc        = hasLocation ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed` : null;
  const googleMapsUrl = hasLocation ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  const wazeUrl       = hasLocation ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null;
  const triggeredTime = data?.triggeredAt ? new Date(data.triggeredAt).toLocaleTimeString() : null;

  return (
    <div style={{
      minHeight: "100dvh", background: "#0a0a0f", color: "#f0f0f0",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex", flexDirection: "column",
    }}>

      {/* Top bar */}
      <div style={{
        padding: "14px 18px", background: "rgba(255,40,40,0.1)",
        borderBottom: "1px solid rgba(255,60,60,0.25)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Blink />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FF4D4D", letterSpacing: "0.1em" }}>
            🆘 LIVE SOS ALERT
          </div>
          {data?.userName && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
              {data.userName} triggered an emergency
            </div>
          )}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          color: "#FF4D4D", border: "1px solid rgba(255,77,77,0.4)",
          padding: "3px 8px", borderRadius: 20,
        }}>LIVE</div>
      </div>

      {/* Status strip */}
      <div style={{ display: "flex", background: "#111118", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <StatusChip icon="📡" label={`Updated ${secondsAgo}s ago`} />
        <StatusChip icon="🔄" label="Refreshes every 10s" border />
        {triggeredTime && <StatusChip icon="🕐" label={`SOS at ${triggeredTime}`} border />}
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: "relative", minHeight: 400 }}>

        {loading && (
          <CenterBox>
            <Spinner />
            <p style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Fetching location…</p>
          </CenterBox>
        )}

        {!loading && error && (
          <CenterBox>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 14, color: "#FF4D4D", textAlign: "center", maxWidth: 260 }}>{error}</div>
            <button onClick={fetchLocation} style={{
              marginTop: 16, padding: "8px 20px", borderRadius: 8,
              background: "#FF4D4D", color: "#fff", border: "none",
              cursor: "pointer", fontWeight: 600, fontSize: 13,
            }}>Retry</button>
          </CenterBox>
        )}

        {!loading && !error && !hasLocation && (
          <CenterBox>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 260 }}>
              Location not available yet — waiting for GPS signal…
            </div>
          </CenterBox>
        )}

        {mapSrc && (
          <iframe
            key={`${lat}-${lng}`}
            src={mapSrc}
            width="100%" height="100%"
            style={{ border: "none", minHeight: 400, display: "block", filter: "invert(0.9) hue-rotate(180deg)" }}
            allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
          />
        )}

        {hasLocation && (
          <div style={{
            position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
            padding: "5px 14px", fontSize: 11, color: "rgba(255,255,255,0.6)",
            whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{
        padding: "14px 16px", background: "#0d0d14",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", gap: 10,
      }}>
        {googleMapsUrl
          ? <ActionBtn href={googleMapsUrl} bg="#FF4D4D" emoji="📍" label="Google Maps" />
          : <div style={{ flex:1, padding:"11px 8px", background:"#1a1a1a", borderRadius:10,
              textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.3)" }}>
              📍 Awaiting GPS…
            </div>
        }
        {wazeUrl && <ActionBtn href={wazeUrl} bg="#1a1a28" border label="Waze" emoji="🚗" />}
        {data?.userPhone && (
          <ActionBtn href={`tel:${data.userPhone}`} bg="#1a1a28" border
            emoji="📞" label={`Call ${(data.userName || "").split(" ")[0]}`} />
        )}
      </div>

      {data?.expiresAt && (
        <div style={{
          textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.2)",
          padding: "6px 0 10px", background: "#0d0d14",
        }}>
          Link expires {new Date(data.expiresAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

function Blink() {
  return (
    <>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
      <div style={{
        width:10, height:10, borderRadius:"50%", background:"#FF4D4D",
        boxShadow:"0 0 8px rgba(255,77,77,0.9)", flexShrink:0,
        animation:"blink 1.2s ease-in-out infinite",
      }}/>
    </>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width:34, height:34, border:"3px solid rgba(255,77,77,0.2)",
        borderTopColor:"#FF4D4D", borderRadius:"50%",
        animation:"spin 0.8s linear infinite",
      }}/>
    </>
  );
}

function CenterBox({ children }) {
  return (
    <div style={{
      position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", zIndex:10,
    }}>{children}</div>
  );
}

function StatusChip({ icon, label, border }) {
  return (
    <div style={{
      flex:1, padding:"7px 10px", fontSize:10,
      color:"rgba(255,255,255,0.4)", textAlign:"center",
      borderLeft: border ? "1px solid rgba(255,255,255,0.06)" : "none",
      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
    }}>{icon} {label}</div>
  );
}

function ActionBtn({ href, bg, border, emoji, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      flex:1, padding:"11px 8px", background:bg,
      border: border ? "1px solid rgba(255,255,255,0.12)" : "none",
      color:"#fff", borderRadius:10, textDecoration:"none",
      textAlign:"center", fontWeight:600, fontSize:12,
      display:"flex", alignItems:"center", justifyContent:"center", gap:5,
    }}>{emoji} {label}</a>
  );
}