"use client";

import SOSButton from "@/components/home/SOSButton";
import { useState, useEffect, useRef, useCallback } from "react";
import emailjs from "@emailjs/browser";
import {
  MdLocationOn, MdPersonAdd, MdDelete,
  MdCheckCircle, MdEmail, MdWhatsapp,
} from "react-icons/md";
import { FiRadio } from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────

const SYNC_INTERVAL_MS  = 15_000;
const ALLOWED_RELATIONS = ["Mother","Father","Sister","Brother","Friend","Spouse","Partner","Colleague","Other"];
const DOT_COLOR  = { info:"#00D1FF", safe:"#39D353", warning:"#FFC857", error:"#FF4D4D" };
const AVATAR_MAP = {
  Mother:"👩‍🦳", Father:"👨‍🦳", Sister:"👩", Brother:"👦",
  Friend:"🧑",  Spouse:"💑",  Partner:"🧑", Colleague:"🧑‍💼", Other:"👤",
};

// EmailJS config — from your .env.local
const EJ_SERVICE  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  ?? "";
const EJ_TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? "";
const EJ_KEY      = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowTime() {
  return new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
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

// Build WhatsApp deep-link message
function buildWhatsAppLink(phone, userName, trackingLink, lat, lng) {
  // Strip non-digits for wa.me (needs plain number without +)
  const waNumber = phone.replace(/\D/g, "");
  const time     = new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
  const coordsLine = (lat && lng && lat !== 0)
    ? `%0A%F0%9F%97%BA%EF%B8%8F Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
    : "";
  const locationLine = trackingLink
    ? `%0A%0A%F0%9F%93%8D Live Location:%0A${encodeURIComponent(trackingLink)}`
    : "%0A%0A⚠️ Location unavailable";

  const msg =
    `%F0%9F%86%98 *SOS ALERT — SafeRoute*%0A%0A` +
    `*${encodeURIComponent(userName)}* may be in danger and needs help immediately!%0A` +
    `%F0%9F•%95%9F Time: ${time}` +
    locationLine +
    coordsLine +
    `%0A%0APlease call them or go to their location NOW.%0A` +
    `This alert was triggered automatically by SafeRoute.`;

  return `https://wa.me/${waNumber}?text=${msg}`;
}

// Send email via EmailJS (frontend SDK — no backend needed)
async function sendEmailAlert(toEmail, toName, userName, trackingLink, lat, lng) {
  if (!EJ_SERVICE || !EJ_TEMPLATE || !EJ_KEY) {
    console.warn("[EmailJS] Not configured — skipping email");
    return { success: false, error: "EmailJS not configured" };
  }

  const coordsText = (lat && lng && lat !== 0)
    ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    : "Unavailable";

  try {
    await emailjs.send(
      EJ_SERVICE,
      EJ_TEMPLATE,
      {
        to_name:       toName,
        to_email:      toEmail,
        user_name:     userName,
        location_link: trackingLink ?? "Unavailable",
        coordinates:   coordsText,
        time:          new Date().toLocaleString("en-IN"),
      },
      EJ_KEY
    );
    return { success: true };
  } catch (err) {
    console.error("[EmailJS] Error:", err);
    return { success: false, error: err?.text ?? err.message };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuardianPage() {

  // ── Location ───────────────────────────────────────────────────────────────
  const [sharing,   setSharing]   = useState(false);
  const [location,  setLocation]  = useState(null);
  const [countdown, setCountdown] = useState(SYNC_INTERVAL_MS / 1000);
  const [geoError,  setGeoError]  = useState(null);

  // ── Contacts ───────────────────────────────────────────────────────────────
  const [contacts,        setContacts]        = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [showAddForm,     setShowAddForm]      = useState(false);
  const [addForm,         setAddForm]          = useState({ name:"", phone:"", email:"", relation:"Friend", isPrimary:false });
  const [addLoading,      setAddLoading]       = useState(false);
  const [addError,        setAddError]         = useState(null);
  const [deleteLoadingId, setDeleteLoadingId]  = useState(null);

  // ── SOS state ──────────────────────────────────────────────────────────────
  const [sosActive,   setSosActive]   = useState(false);   // true while SOS is firing
  const [sosResults,  setSosResults]  = useState(null);    // per-contact delivery results

  // ── Log ────────────────────────────────────────────────────────────────────
  const [log, setLog] = useState([{ time: nowTime(), event: "Guardian Mode opened", type: "info" }]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const syncIntervalRef = useRef(null);
  const countdownRef    = useRef(null);
  const watchIdRef      = useRef(null);

  const addLog = useCallback((event, type = "info") => {
    setLog((prev) => [{ time: nowTime(), event, type }, ...prev].slice(0, 25));
  }, []);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    emailjs.init(EJ_KEY); // initialise EmailJS SDK once
    loadContacts();
    return () => stopSharing();
  }, []); // eslint-disable-line

  // ── Load contacts ──────────────────────────────────────────────────────────
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

  // ── Location push ──────────────────────────────────────────────────────────
  const pushLocation = useCallback(async (lat, lng) => {
    try {
      await apiFetch("/api/tracking/update", { method:"POST", body:JSON.stringify({ lat, lng }) });
      addLog(`Location synced — ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`, "safe");
    } catch (err) {
      addLog("Location sync failed: " + err.message, "warning");
    }
  }, [addLog]);

  // ── Start/stop sharing ─────────────────────────────────────────────────────
  function startSharing() {
    if (!navigator.geolocation) { setGeoError("Geolocation not supported."); return; }
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        pushLocation(coords.latitude, coords.longitude);
        addLog("Location sharing started", "info");
      },
      () => { setGeoError("Location access denied."); addLog("Location access denied", "error"); },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => setLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => {}, { enableHighAccuracy: true }
    );

    setCountdown(SYNC_INTERVAL_MS / 1000);
    syncIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setLocation({ lat: coords.latitude, lng: coords.longitude });
          pushLocation(coords.latitude, coords.longitude);
        },
        () => addLog("Could not refresh location", "warning"),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }, SYNC_INTERVAL_MS);

    countdownRef.current = setInterval(() => {
      setCountdown((c) => c <= 1 ? SYNC_INTERVAL_MS / 1000 : c - 1);
    }, 1000);

    setSharing(true);
  }

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

  // ── Add contact ────────────────────────────────────────────────────────────
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
      setAddForm({ name:"", phone:"", email:"", relation:"Friend", isPrimary:false });
      setShowAddForm(false);
      addLog(`✅ ${data.data.name} added as emergency contact`, "safe");
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  // ── Delete contact ─────────────────────────────────────────────────────────
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
      addLog("Failed to remove: " + err.message, "error");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  // ── SOS handler ────────────────────────────────────────────────────────────
  async function handleSOS() {
    if (sosActive) return;
    setSosActive(true);
    setSosResults(null);
    addLog("🆘 SOS triggered!", "error");

    // 1. Get freshest location
    let lat = location?.lat ?? null;
    let lng = location?.lng ?? null;

    if (lat == null) {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy:true, timeout:5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setLocation({ lat, lng });
      } catch {
        addLog("GPS unavailable — sending without live location", "warning");
      }
    }

    // 2. Save SOS to DB + get contacts back
    let sosData = null;
    try {
      sosData = await apiFetch("/api/sos", {
        method: "POST",
        body:   JSON.stringify(lat != null ? { lat, lng } : {}),
      });
      addLog(`SOS saved — alerting ${sosData.contacts.length} contact(s)`, "error");
    } catch (err) {
      addLog("SOS save failed: " + err.message, "error");
      setSosActive(false);
      return;
    }

    const { userName, trackingLink, contacts: alertContacts } = sosData;
    const results = [];

    // 3. For each contact: open WhatsApp + send email
    for (const contact of alertContacts) {
      const result = { name: contact.name, whatsapp: false, email: false };

      // ── WhatsApp deep link ─────────────────────────────────────────────
      try {
        const waLink = buildWhatsAppLink(contact.phone, userName, trackingLink, lat, lng);
        // Open WhatsApp in new tab — browser opens WA with pre-filled SOS message
        window.open(waLink, "_blank", "noopener,noreferrer");
        result.whatsapp = true;
        addLog(`📱 WhatsApp opened for ${contact.name}`, "safe");
      } catch (err) {
        addLog(`WhatsApp failed for ${contact.name}: ${err.message}`, "warning");
      }

      // Small delay between tabs so browser doesn't block them
      await new Promise((r) => setTimeout(r, 800));

      // ── Email via EmailJS ──────────────────────────────────────────────
      if (contact.email) {
        const emailResult = await sendEmailAlert(
          contact.email,
          contact.name,
          userName,
          trackingLink,
          lat,
          lng
        );
        result.email = emailResult.success;
        addLog(
          emailResult.success
            ? `📧 Email sent to ${contact.name} (${contact.email})`
            : `📧 Email failed for ${contact.name}: ${emailResult.error}`,
          emailResult.success ? "safe" : "warning"
        );
      }

      results.push(result);
    }

    setSosResults(results);
    setSosActive(false);

    const waCount    = results.filter((r) => r.whatsapp).length;
    const emailCount = results.filter((r) => r.email).length;
    addLog(`✅ SOS complete — WhatsApp: ${waCount}, Email: ${emailCount}`, "safe");
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 text-[#F5F7FA] font-[Inter,sans-serif] relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{background:"radial-gradient(ellipse 600px 400px at 20% 80%,rgba(57,211,83,.04) 0%,transparent 70%)"}} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight font-[Poppins,sans-serif]">
              Guardian <span className="text-[#39D353]">Mode</span>
            </h1>
            <p className="text-[13px] text-white/40 mt-1">Live location sharing & emergency contact management</p>
          </div>
          {sharing && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#39D353]/8 border-[1.5px] border-[#39D353]/30 rounded-full text-[12px] font-semibold text-[#39D353] font-[Poppins,sans-serif]"
              style={{animation:"liveGlow 2s ease-in-out infinite"}}>
              <span className="w-2 h-2 rounded-full bg-[#39D353] shadow-[0_0_6px_#39D353] animate-pulse" />
              Live Tracking ON · Updates every {countdown}s
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_320px] gap-[18px]">

          {/* ══ COL 1 — Location ══ */}
          <div className="bg-white/3 border border-[#39D353]/15 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">Your Live Location</p>

            <div className="bg-[#0a1628] border border-[#00D1FF]/10 rounded-xl h-44 flex items-center justify-center mb-4 relative overflow-hidden">
              <div className="absolute inset-0" style={{background:"repeating-linear-gradient(0deg,rgba(0,209,255,.05) 0,rgba(0,209,255,.05) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(0,209,255,.05) 0,rgba(0,209,255,.05) 1px,transparent 1px,transparent 40px)"}} />
              <div className="relative z-10">
                {sharing
                  ? <div className="w-4 h-4 rounded-full bg-[#39D353] shadow-[0_0_12px_#39D353] relative"><span className="absolute inset-0 rounded-full border border-[#39D353] animate-ping opacity-60" /></div>
                  : <div className="flex flex-col items-center gap-2 text-white/25"><MdLocationOn size={28}/><span className="text-[11px]">Start sharing to track</span></div>
                }
              </div>
              {sharing && location && (
                <span className="absolute bottom-2 right-2 text-[9px] text-[#00D1FF]/50 bg-[#00D1FF]/5 border border-[#00D1FF]/10 px-2 py-0.5 rounded-full">GPS · High Accuracy</span>
              )}
            </div>

            {geoError && (
              <div className="mb-3 px-3 py-2 bg-[#FF4D4D]/8 border border-[#FF4D4D]/20 rounded-lg text-[11px] text-[#FF4D4D]">{geoError}</div>
            )}

            <div className="space-y-2.5 text-[12.5px]">
              <div className="flex justify-between items-center text-white/50">
                <span>Coordinates</span>
                <strong className="text-[#F5F7FA] font-medium">
                  {sharing && location ? `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E` : "—"}
                </strong>
              </div>
              <div className="flex justify-between items-center text-white/50">
                <span>Status</span>
                <strong className={sharing?"text-[#39D353]":"text-white/30"}>{sharing?"● Sharing":"○ Idle"}</strong>
              </div>
              <div className="flex justify-between items-center text-white/50">
                <span>Sync interval</span>
                {sharing
                  ? <span className="flex items-center gap-1 text-[10px] text-[#00D1FF] bg-[#00D1FF]/8 border border-[#00D1FF]/20 rounded-full px-2 py-0.5 font-semibold animate-pulse"><FiRadio size={10}/> {countdown}s</span>
                  : <span className="text-white/25 text-[10px]">Paused</span>
                }
              </div>
            </div>

            <button onClick={() => sharing ? stopSharing() : startSharing()}
              className={`mt-4 w-full py-2.5 rounded-xl text-[12px] font-semibold font-[Poppins,sans-serif] tracking-wider transition-all duration-200 cursor-pointer border ${
                sharing
                  ? "bg-[#39D353]/10 border-[#39D353] text-[#39D353]"
                  : "bg-transparent border-white/12 text-white/40 hover:border-[#39D353]/30 hover:text-[#39D353]/60"
              }`}>
              {sharing ? "📡 Stop Location Sharing" : "📡 Start Location Sharing"}
            </button>
          </div>

          {/* ══ COL 2 — Contacts ══ */}
          <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">
              Emergency Contacts ({contacts.length}/5)
            </p>

            {/* Info banner */}
            <div className="mb-3 px-3 py-2.5 bg-[#39D353]/5 border border-[#39D353]/15 rounded-xl text-[10.5px] text-white/50 leading-relaxed">
              <strong className="text-[#39D353]">📱 How SOS works:</strong> When triggered, WhatsApp opens for each contact with a pre-filled SOS message + your live location. If they have email, an alert is sent automatically too. <strong>No paid service needed.</strong>
            </div>

            {contactsLoading ? (
              <div className="space-y-2 mb-3">{[1,2].map(i=><div key={i} className="h-16 rounded-xl bg-white/3 animate-pulse"/>)}</div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/20 text-[12px] gap-2">
                <MdPersonAdd size={28}/><p>No emergency contacts yet.</p>
              </div>
            ) : (
              contacts.map((c) => {
                const cId = c._id || c.id;
                const res = sosResults?.find((r) => r.name === c.name);
                return (
                  <div key={cId} className="mb-2 p-3 rounded-xl bg-white/2 border border-white/4 hover:bg-white/4 transition-all duration-200 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/6 border-[1.5px] border-white/8 flex items-center justify-center text-xl flex-shrink-0">
                        {AVATAR_MAP[c.relation]??"👤"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[13px] font-semibold text-[#F5F7FA] font-[Poppins,sans-serif]">{c.name}</p>
                          {c.isPrimary && <span className="text-[8px] bg-[#FFC857]/10 text-[#FFC857] border border-[#FFC857]/20 px-1.5 py-0.5 rounded-full font-bold">PRIMARY</span>}
                        </div>
                        <p className="text-[10.5px] text-white/40">{c.relation} · {c.phone}</p>
                        {c.email && <p className="text-[10px] text-white/25">{c.email}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {/* Channel badges */}
                        <span className="flex items-center gap-1 text-[9px] text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-1.5 py-0.5 rounded-full font-semibold">
                          <span>📱</span> WhatsApp
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1 text-[9px] text-[#00D1FF] bg-[#00D1FF]/10 border border-[#00D1FF]/20 px-1.5 py-0.5 rounded-full font-semibold">
                            <MdEmail size={9}/> Email
                          </span>
                        )}
                        {/* SOS delivery result */}
                        {res && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            res.whatsapp||res.email
                              ? "text-[#39D353] bg-[#39D353]/10 border-[#39D353]/20"
                              : "text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20"
                          }`}>
                            {res.whatsapp||res.email ? "✓ Sent" : "✗ Failed"}
                          </span>
                        )}
                        {/* Delete */}
                        <button onClick={() => handleDeleteContact(cId, c.name)} disabled={deleteLoadingId===cId}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-[#FF4D4D] bg-transparent border-0 cursor-pointer disabled:opacity-30">
                          {deleteLoadingId===cId ? <span className="text-[9px]">...</span> : "🗑"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Add contact form */}
            {showAddForm ? (
              <form onSubmit={handleAddContact} className="mt-2 p-3 bg-white/2 border border-[#00D1FF]/15 rounded-xl space-y-2.5">
                <p className="text-[11px] font-semibold text-[#00D1FF]/70 font-[Poppins,sans-serif]">New Emergency Contact</p>

                {addError && (
                  <p className="text-[10px] text-[#FF4D4D] bg-[#FF4D4D]/8 border border-[#FF4D4D]/15 rounded-lg px-2 py-1.5">{addError}</p>
                )}

                <input required placeholder="Full name" value={addForm.name}
                  onChange={(e) => setAddForm(f=>({...f,name:e.target.value}))}
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-black placeholder-black outline-none focus:border-[#00D1FF]/40 transition-colors"/>

                <input required placeholder="Phone — 9876543210 or +919876543210" value={addForm.phone}
                  onChange={(e) => setAddForm(f=>({...f,phone:e.target.value.trim()}))}
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-black placeholder-black outline-none focus:border-[#00D1FF]/40 transition-colors"/>

                <input placeholder="Email (optional — for backup alert)" value={addForm.email}
                  onChange={(e) => setAddForm(f=>({...f,email:e.target.value.trim()}))}
                  type="email"
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-black placeholder-black outline-none focus:border-[#00D1FF]/40 transition-colors"/>

                <select value={addForm.relation} onChange={(e) => setAddForm(f=>({...f,relation:e.target.value}))}
                  className="w-full bg-[#0a1628] border border-white/8 rounded-lg px-3 py-2 text-[12px] text-white/80 outline-none focus:border-[#00D1FF]/40 cursor-pointer">
                  {ALLOWED_RELATIONS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>

                <label className="flex items-center gap-2 text-[11px] text-white/40 cursor-pointer select-none">
                  <input type="checkbox" checked={addForm.isPrimary}
                    onChange={(e)=>setAddForm(f=>({...f,isPrimary:e.target.checked}))}
                    className="accent-[#39D353]"/>
                  Set as primary contact
                </label>

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={addLoading}
                    className="flex-1 py-2 rounded-lg text-[11px] font-semibold font-[Poppins,sans-serif] bg-[#00D1FF]/10 border border-[#00D1FF]/30 text-[#00D1FF] hover:bg-[#00D1FF]/15 transition-all cursor-pointer disabled:opacity-40">
                    {addLoading ? "Saving…" : "Save Contact"}
                  </button>
                  <button type="button" onClick={()=>{setShowAddForm(false);setAddError(null);}}
                    className="px-3 py-2 rounded-lg text-[11px] text-white/30 hover:text-white/60 bg-transparent border border-white/8 cursor-pointer transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              contacts.length < 5 && (
                <button onClick={()=>setShowAddForm(true)}
                  className="w-full py-2.5 mt-1 bg-white/3 border border-dashed border-white/12 rounded-xl text-[12px] text-white/35 font-[Poppins,sans-serif] hover:bg-[#00D1FF]/4 hover:border-[#00D1FF]/25 hover:text-[#00D1FF] transition-all cursor-pointer flex items-center justify-center gap-1.5">
                  <MdPersonAdd size={14}/> Add Emergency Contact
                </button>
              )
            )}
          </div>

          {/* ══ COL 3 — SOS + Log ══ */}
          <div className="flex flex-col gap-3.5">

            {/* SOS card */}
            <div className="bg-[#FF4D4D]/5 border border-[#FF4D4D]/15 rounded-2xl p-5 flex flex-col items-center gap-1 text-center">
              <p className="text-[12px] font-semibold text-white/50 mb-1 font-[Poppins,sans-serif]">Emergency SOS</p>

              {/* Channel indicators */}
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1 text-[9px] text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-2 py-0.5 rounded-full">
                  📱 WhatsApp
                </span>
                {EJ_SERVICE && (
                  <span className="flex items-center gap-1 text-[9px] text-[#00D1FF] bg-[#00D1FF]/10 border border-[#00D1FF]/20 px-2 py-0.5 rounded-full">
                    <MdEmail size={9}/> Email
                  </span>
                )}
              </div>

              <SOSButton compact={false} onSOS={handleSOS}/>

              {sosActive && (
                <p className="text-[10px] text-[#FFC857] mt-2 animate-pulse">
                  Opening WhatsApp & sending emails…
                </p>
              )}

              {contacts.length === 0 && (
                <p className="text-[10px] text-[#FFC857]/60 mt-2 max-w-[180px] leading-relaxed">
                  ⚠️ Add emergency contacts first.
                </p>
              )}

              {!EJ_SERVICE && (
                <p className="text-[9px] text-white/20 mt-2 max-w-[200px] leading-relaxed">
                  Add EmailJS keys to .env.local for email backup alerts.
                </p>
              )}
            </div>

            {/* Journey log */}
            <div className="flex-1 bg-white/3 border border-white/6 rounded-2xl p-4">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">Journey Log</p>
              <div className="max-h-[280px] overflow-y-auto pr-1">
                {log.map((l,i)=>(
                  <div key={i} className="flex items-start gap-2.5 pb-2.5 mb-2.5 border-b border-white/4 last:border-0 last:mb-0 last:pb-0">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
                      style={{background:DOT_COLOR[l.type]??"#fff",boxShadow:`0 0 5px ${DOT_COLOR[l.type]??"#fff"}`}}/>
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

      <style>{`@keyframes liveGlow{0%,100%{box-shadow:0 0 0 0 rgba(57,211,83,.2)}50%{box-shadow:0 0 0 6px rgba(57,211,83,0)}}`}</style>
    </div>
  );
}