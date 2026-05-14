"use client";

import Header from "@/components/layout/Header";
import footer from "@/components/layout/Footer";
import SOSButton from "@/components/home/SOSButton";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MdLocationOn, MdPersonAdd, MdVisibility,
  MdNotifications, MdCheckCircle, MdDelete,
  MdClose, MdEdit, MdSave,
} from "react-icons/md";
import { FiRadio } from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────

const SYNC_INTERVAL_MS  = 15_000;   // push location every 15 s
const ALLOWED_RELATIONS = ["Mother", "Father", "Sister", "Brother",
                            "Friend", "Spouse", "Partner", "Colleague", "Other"];
const DOT_COLOR = { info: "#00D1FF", safe: "#39D353", warning: "#FFC857", error: "#FF4D4D" };

const AVATAR_MAP = {
  Mother: "👩‍🦳", Father: "👨‍🦳", Sister: "👩", Brother: "👦",
  Friend: "🧑",  Spouse: "💑",  Partner: "🧑", Colleague: "🧑‍💼", Other: "👤",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function getReverseGeoLabel(lat, lng) {
  // Very lightweight reverse-geo using lat/lng bands for India
  // In production you'd call a real geocoding API
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuardianPage() {
  // ── Location state ─────────────────────────────────────────────────────────
  const [sharing,    setSharing]    = useState(false);
  const [location,   setLocation]   = useState(null);     // { lat, lng }
  const [countdown,  setCountdown]  = useState(SYNC_INTERVAL_MS / 1000);
  const [geoError,   setGeoError]   = useState(null);

  // ── Contacts state ─────────────────────────────────────────────────────────
  const [contacts,       setContacts]       = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [addForm,        setAddForm]        = useState({ name: "", phone: "", relation: "Friend", isPrimary: false });
  const [addLoading,     setAddLoading]     = useState(false);
  const [addError,       setAddError]       = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  // ── Journey log ────────────────────────────────────────────────────────────
  const [log, setLog] = useState([
    { time: nowTime(), event: "Guardian Mode opened", type: "info" },
  ]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const syncIntervalRef  = useRef(null);
  const countdownRef     = useRef(null);
  const watchIdRef       = useRef(null);

  // ─── Append to journey log ─────────────────────────────────────────────────
  const addLog = useCallback((event, type = "info") => {
    setLog((prev) => [{ time: nowTime(), event, type }, ...prev].slice(0, 20));
  }, []);

  // ─── Load contacts on mount ────────────────────────────────────────────────
  useEffect(() => {
    loadContacts();
    return () => stopSharing(); // cleanup on unmount
  }, []); // eslint-disable-line

  async function loadContacts() {
    try {
      setContactsLoading(true);
      const data = await apiFetch("/api/contacts/get");
      setContacts(data.data.contacts || []);
    } catch (err) {
      addLog("Failed to load contacts: " + err.message, "error");
    } finally {
      setContactsLoading(false);
    }
  }

  // ─── Push location to server ───────────────────────────────────────────────
  const pushLocation = useCallback(async (lat, lng) => {
    try {
      await apiFetch("/api/tracking/update", {
        method: "POST",
        body:   JSON.stringify({ lat, lng }),
      });
      addLog(`Location synced — ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`, "safe");
    } catch (err) {
      addLog("Location sync failed: " + err.message, "warning");
    }
  }, [addLog]);

  // ─── Start sharing ─────────────────────────────────────────────────────────
  function startSharing() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      addLog("Geolocation not supported", "error");
      return;
    }

    setGeoError(null);

    // One-shot: get location immediately
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        setLocation({ lat, lng });
        pushLocation(lat, lng);
        addLog("Location sharing started", "info");
      },
      (err) => {
        setGeoError("Location access denied. Please allow location permission.");
        addLog("Location access denied", "error");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // Watch for position updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true }
    );

    // Periodic push every SYNC_INTERVAL_MS
    setCountdown(SYNC_INTERVAL_MS / 1000);
    syncIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const lat = coords.latitude;
          const lng = coords.longitude;
          setLocation({ lat, lng });
          pushLocation(lat, lng);
        },
        () => addLog("Could not refresh location", "warning"),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }, SYNC_INTERVAL_MS);

    // Countdown timer (visual only)
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? SYNC_INTERVAL_MS / 1000 : c - 1));
    }, 1000);

    setSharing(true);
  }

  // ─── Stop sharing ──────────────────────────────────────────────────────────
  function stopSharing() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearInterval(syncIntervalRef.current);
    clearInterval(countdownRef.current);
    setSharing(false);
    addLog("Location sharing stopped", "warning");
  }

  function toggleSharing() {
    if (sharing) stopSharing();
    else startSharing();
  }

  // ─── Add contact ───────────────────────────────────────────────────────────
  async function handleAddContact(e) {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      const data = await apiFetch("/api/contacts/add", {
        method: "POST",
        body:   JSON.stringify(addForm),
      });
      setContacts((prev) => [...prev, data.data]);
      setAddForm({ name: "", phone: "", relation: "Friend", isPrimary: false });
      setShowAddForm(false);
      addLog(`Contact added: ${data.data.name}`, "safe");
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  // ─── Delete contact ────────────────────────────────────────────────────────
  async function handleDeleteContact(contactId, contactName) {
    if (!confirm(`Remove ${contactName} from emergency contacts?`)) return;
    setDeleteLoadingId(contactId);
    try {
      await apiFetch("/api/contacts/delete", {
        method: "DELETE",
        body:   JSON.stringify({ contactId }),
      });
      setContacts((prev) => prev.filter((c) => (c._id || c.id) !== contactId));
      addLog(`Contact removed: ${contactName}`, "warning");
    } catch (err) {
      addLog("Failed to remove contact: " + err.message, "error");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  // ─── SOS trigger ──────────────────────────────────────────────────────────
  async function handleSOS() {
    addLog("🆘 SOS triggered — alerting all contacts", "error");
    try {
      const payload = location ? { lat: location.lat, lng: location.lng } : {};
      const data = await apiFetch("/api/sos", {
        method: "POST",
        body:   JSON.stringify(payload),
      });
      addLog(`SOS sent to ${data.results?.length ?? 0} contact(s)`, "error");
      // Mark all contacts as notified in UI
      setContacts((prev) =>
        prev.map((c) => ({ ...c, _uiStatus: "notified" }))
      );
    } catch (err) {
      addLog("SOS failed: " + err.message, "error");
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const displayLat = location?.lat ?? 22.7196;
  const displayLng = location?.lng ?? 75.8577;

  return (
    <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 text-[#F5F7FA] font-[Inter,sans-serif] relative">
      <Header />
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 600px 400px at 20% 80%,rgba(57,211,83,.04) 0%,transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#F5F7FA] tracking-tight font-[Poppins,sans-serif]">
              Guardian <span className="text-[#39D353]">Mode</span>
            </h1>
            <p className="text-[13px] text-white/40 mt-1">
              Live location sharing &amp; emergency contact management
            </p>
          </div>

          {sharing && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#39D353]/8 border-[1.5px] border-[#39D353]/30 rounded-full text-[12px] font-semibold text-[#39D353] font-[Poppins,sans-serif]"
              style={{ animation: "liveGlow 2s ease-in-out infinite" }}>
              <span className="w-2 h-2 rounded-full bg-[#39D353] shadow-[0_0_6px_#39D353] animate-pulse" />
              Live Tracking ON · Updates every {countdown}s
            </div>
          )}
        </div>

        {/* ── 3-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_320px] gap-[18px]">

          {/* ══ COLUMN 1 — Live Location ══════════════════════════════════════ */}
          <div className="bg-white/3 border border-[#39D353]/15 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">
              Your Live Location
            </p>

            {/* Map placeholder with animated dot */}
            <div className="bg-[#0a1628] border border-[#00D1FF]/10 rounded-xl h-44 flex items-center justify-center mb-4 relative overflow-hidden">
              {/* Grid lines */}
              <div className="absolute inset-0"
                style={{
                  background:
                    "repeating-linear-gradient(0deg,rgba(0,209,255,.05) 0,rgba(0,209,255,.05) 1px,transparent 1px,transparent 40px)," +
                    "repeating-linear-gradient(90deg,rgba(0,209,255,.05) 0,rgba(0,209,255,.05) 1px,transparent 1px,transparent 40px)",
                }}
              />
              {/* Location dot */}
              <div className="relative z-10">
                {sharing ? (
                  <div className="w-4 h-4 rounded-full bg-[#39D353] shadow-[0_0_12px_#39D353] relative">
                    <span className="absolute inset-0 rounded-full border border-[#39D353] animate-ping opacity-60" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/25">
                    <MdLocationOn size={28} />
                    <span className="text-[11px]">Start sharing to track</span>
                  </div>
                )}
              </div>

              {/* Accuracy label while sharing */}
              {sharing && location && (
                <span className="absolute bottom-2 right-2 text-[9px] text-[#00D1FF]/50 bg-[#00D1FF]/5 border border-[#00D1FF]/10 px-2 py-0.5 rounded-full">
                  GPS · High Accuracy
                </span>
              )}
            </div>

            {/* Geo-error */}
            {geoError && (
              <div className="mb-3 px-3 py-2 bg-[#FF4D4D]/8 border border-[#FF4D4D]/20 rounded-lg text-[11px] text-[#FF4D4D]">
                {geoError}
              </div>
            )}

            {/* Stats */}
            <div className="space-y-2.5 text-[12.5px]">
              <div className="flex justify-between items-center text-white/50">
                <span>Coordinates</span>
                <strong className="text-[#F5F7FA] font-medium">
                  {sharing && location
                    ? `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E`
                    : "—"}
                </strong>
              </div>
              <div className="flex justify-between items-center text-white/50">
                <span>Status</span>
                <strong className={sharing ? "text-[#39D353]" : "text-white/30"}>
                  {sharing ? "● Sharing" : "○ Idle"}
                </strong>
              </div>
              <div className="flex justify-between items-center text-white/50">
                <span>Sync interval</span>
                {sharing ? (
                  <span className="flex items-center gap-1 text-[10px] text-[#00D1FF] bg-[#00D1FF]/8 border border-[#00D1FF]/20 rounded-full px-2 py-0.5 font-semibold animate-pulse">
                    <FiRadio size={10} /> {countdown}s
                  </span>
                ) : (
                  <span className="text-white/25 text-[10px]">Paused</span>
                )}
              </div>
            </div>

            {/* Toggle button */}
            <button
              onClick={toggleSharing}
              className={`mt-4 w-full py-2.5 rounded-xl text-[12px] font-semibold font-[Poppins,sans-serif] tracking-wider transition-all duration-200 cursor-pointer border ${
                sharing
                  ? "bg-[#39D353]/10 border-[#39D353] text-[#39D353]"
                  : "bg-transparent border-white/12 text-white/40 hover:border-[#39D353]/30 hover:text-[#39D353]/60"
              }`}
            >
              {sharing ? "📡 Stop Location Sharing" : "📡 Start Location Sharing"}
            </button>
          </div>

          {/* ══ COLUMN 2 — Emergency Contacts ════════════════════════════════ */}
          <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">
              Emergency Contacts ({contacts.length}/5)
            </p>

            {/* Loading skeleton */}
            {contactsLoading ? (
              <div className="space-y-2 mb-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-white/3 animate-pulse" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/20 text-[12px] gap-2">
                <MdPersonAdd size={28} />
                <p>No emergency contacts yet.</p>
                <p>Add someone who can help in an emergency.</p>
              </div>
            ) : (
              contacts.map((c) => {
                const cId = c._id || c.id;
                return (
                  <div key={cId}
                    className="flex items-center gap-3 p-3 rounded-xl mb-2 bg-white/2 border border-white/4 hover:bg-white/4 hover:border-white/8 transition-all duration-200 group">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-white/6 border-[1.5px] border-white/8 flex items-center justify-center text-xl flex-shrink-0">
                      {AVATAR_MAP[c.relation] ?? "👤"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-[#F5F7FA] font-[Poppins,sans-serif]">
                          {c.name}
                        </p>
                        {c.isPrimary && (
                          <span className="text-[8px] bg-[#FFC857]/10 text-[#FFC857] border border-[#FFC857]/20 px-1.5 py-0.5 rounded-full font-bold tracking-wider">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-white/40">{c.relation} · {c.phone}</p>
                    </div>

                    {/* Status + delete */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20">
                        <span className="flex items-center gap-1">
                          <MdNotifications size={10} /> Added
                        </span>
                      </span>
                      <button
                        onClick={() => handleDeleteContact(cId, c.name)}
                        disabled={deleteLoadingId === cId}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-[#FF4D4D] bg-transparent border-0 cursor-pointer p-0.5 disabled:opacity-30"
                        title="Remove contact"
                      >
                        {deleteLoadingId === cId
                          ? <span className="text-[9px] text-white/30">...</span>
                          : <MdDelete size={13} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Add contact form */}
            {showAddForm ? (
              <form onSubmit={handleAddContact} className="mt-2 p-3 bg-white/2 border border-[#00D1FF]/15 rounded-xl space-y-2.5">
                <p className="text-[11px] font-semibold text-[#00D1FF]/70 font-[Poppins,sans-serif] mb-1">
                  New Emergency Contact
                </p>

                {addError && (
                  <p className="text-[10px] text-[#FF4D4D] bg-[#FF4D4D]/8 border border-[#FF4D4D]/15 rounded-lg px-2 py-1.5">
                    {addError}
                  </p>
                )}

                <input
                  required
                  placeholder="Full name"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-black placeholder-black outline-none focus:border-[#00D1FF]/40 transition-colors"
                />

                <input
                  required
                  placeholder="Phone (+91XXXXXXXXXX)"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-black placeholder-black outline-none focus:border-[#00D1FF]/40 transition-colors"
                />

                <select
                  value={addForm.relation}
                  onChange={(e) => setAddForm((f) => ({ ...f, relation: e.target.value }))}
                  className="w-full bg-[#0a1628] border border-white/8 rounded-lg px-3 py-2 text-[12px] text-white/80 outline-none focus:border-[#00D1FF]/40 transition-colors cursor-pointer"
                >
                  {ALLOWED_RELATIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-[11px] text-white/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addForm.isPrimary}
                    onChange={(e) => setAddForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                    className="accent-[#39D353]"
                  />
                  Set as primary contact
                </label>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 py-2 rounded-lg text-[11px] font-semibold font-[Poppins,sans-serif] bg-[#00D1FF]/10 border border-[#00D1FF]/30 text-[#00D1FF] hover:bg-[#00D1FF]/15 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {addLoading ? "Saving…" : "Save Contact"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setAddError(null); }}
                    className="px-3 py-2 rounded-lg text-[11px] text-white/30 hover:text-white/60 bg-transparent border border-white/8 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              contacts.length < 5 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-2.5 mt-1 bg-white/3 border border-dashed border-white/12 rounded-xl text-[12px] text-white/35 font-[Poppins,sans-serif] hover:bg-[#00D1FF]/4 hover:border-[#00D1FF]/25 hover:text-[#00D1FF] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MdPersonAdd size={14} /> Add Emergency Contact
                </button>
              )
            )}
          </div>

          {/* ══ COLUMN 3 — SOS + Journey Log ════════════════════════════════ */}
          <div className="flex flex-col gap-3.5">

            {/* SOS card */}
            <div className="bg-[#FF4D4D]/5 border border-[#FF4D4D]/15 rounded-2xl p-5 flex flex-col items-center gap-1 text-center">
              <p className="text-[12px] font-semibold text-white/50 mb-3 font-[Poppins,sans-serif]">
                Emergency SOS
              </p>
              <SOSButton compact={false} onSOS={handleSOS} />

              {contacts.length === 0 && (
                <p className="text-[10px] text-[#FFC857]/60 mt-2 max-w-[180px] leading-relaxed">
                  ⚠️ Add emergency contacts first so SOS can alert them.
                </p>
              )}
            </div>

            {/* Journey log */}
            <div className="flex-1 bg-white/3 border border-white/6 rounded-2xl p-4 overflow-hidden">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">
                Journey Log
              </p>

              <div className="space-y-0 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                {log.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 pb-2.5 mb-2.5 border-b border-white/4 last:border-0 last:mb-0 last:pb-0"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
                      style={{
                        background:  DOT_COLOR[l.type] ?? "#fff",
                        boxShadow:   `0 0 5px ${DOT_COLOR[l.type] ?? "#fff"}`,
                      }}
                    />
                    <div>
                      <p className="text-[9.5px] text-white/25">{l.time}</p>
                      <p className="text-[11.5px] text-white/55 leading-snug">{l.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes liveGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(57,211,83,.2); }
          50%      { box-shadow: 0 0 0 6px rgba(57,211,83,0); }
        }
      `}</style>
      <footer />
    </div>
  );
}