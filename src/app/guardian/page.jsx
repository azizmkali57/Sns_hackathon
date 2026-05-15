"use client";

import SOSButton from "@/components/home/SOSButton";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MdLocationOn, MdPersonAdd, MdDelete,
  MdRefresh, MdCheckCircle, MdWarning, MdPhone,
} from "react-icons/md";
import { FiRadio } from "react-icons/fi";

const SYNC_INTERVAL_MS  = 15_000;
const ALLOWED_RELATIONS = ["Mother","Father","Sister","Brother","Friend","Spouse","Partner","Colleague","Other"];
const DOT_COLOR = { info:"#00D1FF", safe:"#39D353", warning:"#FFC857", error:"#FF4D4D" };
const AVATAR_MAP = {
  Mother:"👩‍🦳", Father:"👨‍🦳", Sister:"👩", Brother:"👦",
  Friend:"🧑",  Spouse:"💑",  Partner:"🧑", Colleague:"🧑‍💼", Other:"👤",
};

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

export default function GuardianPage() {
  // Location
  const [sharing,   setSharing]   = useState(false);
  const [location,  setLocation]  = useState(null);
  const [countdown, setCountdown] = useState(SYNC_INTERVAL_MS / 1000);
  const [geoError,  setGeoError]  = useState(null);

  // Contacts
  const [contacts,         setContacts]         = useState([]);
  const [contactsLoading,  setContactsLoading]  = useState(true);
  const [showAddForm,      setShowAddForm]       = useState(false);
  const [addForm,          setAddForm]           = useState({ name:"", phone:"", relation:"Friend", isPrimary:false });
  const [addLoading,       setAddLoading]        = useState(false);
  const [addError,         setAddError]          = useState(null);
  const [deleteLoadingId,  setDeleteLoadingId]   = useState(null);
  const [resendLoadingId,  setResendLoadingId]   = useState(null);
  const [verifyLoadingId,  setVerifyLoadingId]   = useState(null);

  // Log
  const [log, setLog] = useState([{ time: nowTime(), event: "Guardian Mode opened", type: "info" }]);

  // Refs
  const syncIntervalRef = useRef(null);
  const countdownRef    = useRef(null);
  const watchIdRef      = useRef(null);

  const addLog = useCallback((event, type = "info") => {
    setLog((prev) => [{ time: nowTime(), event, type }, ...prev].slice(0, 25));
  }, []);

  useEffect(() => {
    loadContacts();
    return () => stopSharing();
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

  const pushLocation = useCallback(async (lat, lng) => {
    try {
      await apiFetch("/api/tracking/update", { method:"POST", body:JSON.stringify({ lat, lng }) });
      addLog(`Location synced — ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`, "safe");
    } catch (err) {
      addLog("Location sync failed: " + err.message, "warning");
    }
  }, [addLog]);

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
        ({ coords }) => { setLocation({ lat: coords.latitude, lng: coords.longitude }); pushLocation(coords.latitude, coords.longitude); },
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
    if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    clearInterval(syncIntervalRef.current);
    clearInterval(countdownRef.current);
    setSharing(false);
    addLog("Location sharing stopped", "warning");
  }

  async function handleAddContact(e) {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      const data = await apiFetch("/api/contacts/add", { method:"POST", body:JSON.stringify(addForm) });
      setContacts((prev) => [...prev, data.data]);
      setAddForm({ name:"", phone:"", relation:"Friend", isPrimary:false });
      setShowAddForm(false);
      addLog(
        data.verificationTriggered
          ? `✅ ${data.data.name} added — Twilio is calling ${data.data.phone} with a verification code now`
          : `✅ ${data.data.name} added — verify manually in Twilio console`,
        "safe"
      );
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDeleteContact(contactId, contactName) {
    if (!confirm(`Remove ${contactName} from emergency contacts?`)) return;
    setDeleteLoadingId(contactId);
    try {
      await apiFetch("/api/contacts/delete", { method:"DELETE", body:JSON.stringify({ contactId }) });
      setContacts((prev) => prev.filter((c) => (c._id || c.id) !== contactId));
      addLog(`Contact removed: ${contactName}`, "warning");
    } catch (err) {
      addLog("Failed to remove: " + err.message, "error");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  // Re-trigger Twilio verification call
  async function handleResendVerification(contactId, contactName) {
    setResendLoadingId(contactId);
    try {
      const data = await apiFetch("/api/contacts/verify", { method:"PATCH", body:JSON.stringify({ contactId }) });
      addLog(`📞 Verification call re-sent to ${contactName}`, "info");
      // Update local state with new validation code
      setContacts((prev) => prev.map((c) =>
        (c._id || c.id) === contactId
          ? { ...c, twilioValidationCode: data.data?.twilioValidationCode, twilioVerified: false }
          : c
      ));
    } catch (err) {
      addLog("Failed to resend call: " + err.message, "error");
    } finally {
      setResendLoadingId(null);
    }
  }

  // Mark contact as verified (after they receive Twilio's call)
  async function handleMarkVerified(contactId, contactName) {
    setVerifyLoadingId(contactId);
    try {
      await apiFetch("/api/contacts/verify", { method:"POST", body:JSON.stringify({ contactId }) });
      setContacts((prev) => prev.map((c) =>
        (c._id || c.id) === contactId ? { ...c, twilioVerified: true } : c
      ));
      addLog(`✅ ${contactName} verified — SOS will reach them`, "safe");
    } catch (err) {
      addLog("Failed to mark verified: " + err.message, "error");
    } finally {
      setVerifyLoadingId(null);
    }
  }

  async function handleSOS() {
    addLog("🆘 SOS triggered — alerting all contacts", "error");
    let lat = location?.lat ?? null;
    let lng = location?.lng ?? null;
    if (lat == null) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy:true, timeout:5000 })
        );
        lat = pos.coords.latitude; lng = pos.coords.longitude;
        setLocation({ lat, lng });
      } catch { addLog("Could not get GPS — using last known", "warning"); }
    }
    try {
      const data = await apiFetch("/api/sos", { method:"POST", body:JSON.stringify(lat != null ? { lat, lng } : {}) });
      const { smsSent=0, whatsappSent=0, total=0 } = data.summary ?? {};
      addLog(`📨 SOS: SMS to ${smsSent}/${total} · WhatsApp to ${whatsappSent}/${total}`, "error");
      data.results?.forEach((r) => {
        const ch = [r.smsSent && "SMS", r.whatsappSent && "WA"].filter(Boolean).join("+") || "FAILED";
        addLog(`${r.smsSent||r.whatsappSent?"✓":"✗"} ${r.contactName} (${r.phone}) — ${ch}`, r.smsSent?"safe":"warning");
      });
    } catch (err) {
      addLog("🚨 SOS error: " + err.message, "error");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 text-[#F5F7FA] font-[Inter,sans-serif] relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{background:"radial-gradient(ellipse 600px 400px at 20% 80%,rgba(57,211,83,.04) 0%,transparent 70%)"}} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* Header */}
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

          {/* ── COL 1: Location ── */}
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

            {geoError && <div className="mb-3 px-3 py-2 bg-[#FF4D4D]/8 border border-[#FF4D4D]/20 rounded-lg text-[11px] text-[#FF4D4D]">{geoError}</div>}

            <div className="space-y-2.5 text-[12.5px]">
              <div className="flex justify-between items-center text-white/50">
                <span>Coordinates</span>
                <strong className="text-[#F5F7FA] font-medium">{sharing && location ? `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E` : "—"}</strong>
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
                sharing ? "bg-[#39D353]/10 border-[#39D353] text-[#39D353]" : "bg-transparent border-white/12 text-white/40 hover:border-[#39D353]/30 hover:text-[#39D353]/60"
              }`}>
              {sharing ? "📡 Stop Location Sharing" : "📡 Start Location Sharing"}
            </button>
          </div>

          {/* ── COL 2: Contacts ── */}
          <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">
              Emergency Contacts ({contacts.length}/5)
            </p>

            {/* How verification works */}
            <div className="mb-3 px-3 py-2.5 bg-[#00D1FF]/5 border border-[#00D1FF]/15 rounded-xl text-[10.5px] text-[#00D1FF]/70 leading-relaxed">
              <strong className="text-[#00D1FF]">📞 Auto Verification:</strong> When you add a contact, Twilio automatically calls their number and reads out a 6-digit code. Once they receive it, click <strong>"Mark Verified"</strong> — then SOS messages will reach them.
            </div>

            {contactsLoading ? (
              <div className="space-y-2 mb-3">{[1,2].map(i=><div key={i} className="h-20 rounded-xl bg-white/3 animate-pulse"/>)}</div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/20 text-[12px] gap-2">
                <MdPersonAdd size={28}/><p>No emergency contacts yet.</p>
              </div>
            ) : (
              contacts.map((c) => {
                const cId     = c._id || c.id;
                const verified = c.twilioVerified ?? false;
                return (
                  <div key={cId} className="mb-2 rounded-xl bg-white/2 border border-white/4 hover:bg-white/4 transition-all duration-200 group overflow-hidden">
                    {/* Main row */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 rounded-full bg-white/6 border-[1.5px] border-white/8 flex items-center justify-center text-xl flex-shrink-0">
                        {AVATAR_MAP[c.relation]??"👤"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[13px] font-semibold text-[#F5F7FA] font-[Poppins,sans-serif]">{c.name}</p>
                          {c.isPrimary && <span className="text-[8px] bg-[#FFC857]/10 text-[#FFC857] border border-[#FFC857]/20 px-1.5 py-0.5 rounded-full font-bold">PRIMARY</span>}
                        </div>
                        <p className="text-[10.5px] text-white/40">{c.relation} · {c.phone}</p>
                      </div>
                      <button onClick={() => handleDeleteContact(cId, c.name)} disabled={deleteLoadingId===cId}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-[#FF4D4D] bg-transparent border-0 cursor-pointer disabled:opacity-30 flex-shrink-0">
                        {deleteLoadingId===cId ? <span className="text-[9px]">...</span> : <MdDelete size={13}/>}
                      </button>
                    </div>

                    {/* Verification status bar */}
                    <div className={`px-3 pb-3 flex items-center justify-between gap-2 flex-wrap`}>
                      {verified ? (
                        <span className="flex items-center gap-1 text-[9.5px] font-bold text-[#39D353] bg-[#39D353]/8 border border-[#39D353]/20 px-2 py-0.5 rounded-full">
                          <MdCheckCircle size={10}/> SMS Verified · SOS Ready
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 w-full">
                          <span className="flex items-center gap-1 text-[9.5px] font-bold text-[#FFC857] bg-[#FFC857]/8 border border-[#FFC857]/20 px-2 py-0.5 rounded-full w-fit">
                            <MdPhone size={10}/> Awaiting Twilio Call Verification
                          </span>
                          {c.twilioValidationCode && (
                            <p className="text-[9px] text-white/35 pl-1">
                              Twilio will read code <strong className="text-[#00D1FF]/70">{c.twilioValidationCode}</strong> during the call · contact receives it automatically
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <button onClick={() => handleMarkVerified(cId, c.name)} disabled={verifyLoadingId===cId}
                              className="text-[9px] text-[#39D353]/70 hover:text-[#39D353] bg-transparent border-0 cursor-pointer flex items-center gap-0.5 transition-colors disabled:opacity-30">
                              <MdCheckCircle size={11}/>
                              {verifyLoadingId===cId ? "Saving…" : "Mark Verified (they received the call)"}
                            </button>
                            <button onClick={() => handleResendVerification(cId, c.name)} disabled={resendLoadingId===cId}
                              className="text-[9px] text-[#00D1FF]/60 hover:text-[#00D1FF] bg-transparent border-0 cursor-pointer flex items-center gap-0.5 transition-colors disabled:opacity-30">
                              <MdRefresh size={11} className={resendLoadingId===cId?"animate-spin":""}/> 
                              {resendLoadingId===cId ? "Calling…" : "Recall"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {showAddForm ? (
              <form onSubmit={handleAddContact} className="mt-2 p-3 bg-white/2 border border-[#00D1FF]/15 rounded-xl space-y-2.5">
                <p className="text-[11px] font-semibold text-[#00D1FF]/70 font-[Poppins,sans-serif]">New Emergency Contact</p>
                {addError && <p className="text-[10px] text-[#FF4D4D] bg-[#FF4D4D]/8 border border-[#FF4D4D]/15 rounded-lg px-2 py-1.5">{addError}</p>}
                <input required placeholder="Full name" value={addForm.name}
                  onChange={(e) => setAddForm(f=>({...f,name:e.target.value}))}
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-black placeholder-Black outline-none focus:border-[#00D1FF]/40 transition-colors"/>
                <input required placeholder="Phone — 9876543210 or +919876543210" value={addForm.phone}
                  onChange={(e) => setAddForm(f=>({...f,phone:e.target.value.trim()}))}
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-black placeholder-Black outline-none focus:border-[#00D1FF]/40 transition-colors"/>
                <select value={addForm.relation} onChange={(e) => setAddForm(f=>({...f,relation:e.target.value}))}
                  className="w-full bg-[#0a1628] border border-white/8 rounded-lg px-3 py-2 text-[12px] text-white/80 outline-none focus:border-[#00D1FF]/40 cursor-pointer">
                  {ALLOWED_RELATIONS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                <label className="flex items-center gap-2 text-[11px] text-white/40 cursor-pointer select-none">
                  <input type="checkbox" checked={addForm.isPrimary} onChange={(e)=>setAddForm(f=>({...f,isPrimary:e.target.checked}))} className="accent-[#39D353]"/>
                  Set as primary contact
                </label>
                <p className="text-[9.5px] text-[#00D1FF]/50 leading-relaxed">
                  📞 After saving, Twilio will automatically call this number to verify it. The contact just needs to pick up — no action needed from them.
                </p>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={addLoading}
                    className="flex-1 py-2 rounded-lg text-[11px] font-semibold font-[Poppins,sans-serif] bg-[#00D1FF]/10 border border-[#00D1FF]/30 text-[#00D1FF] hover:bg-[#00D1FF]/15 transition-all cursor-pointer disabled:opacity-40">
                    {addLoading ? "Saving & Calling…" : "Save & Auto-Verify"}
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

          {/* ── COL 3: SOS + Log ── */}
          <div className="flex flex-col gap-3.5">
            <div className="bg-[#FF4D4D]/5 border border-[#FF4D4D]/15 rounded-2xl p-5 flex flex-col items-center gap-1 text-center">
              <p className="text-[12px] font-semibold text-white/50 mb-3 font-[Poppins,sans-serif]">Emergency SOS</p>
              <SOSButton compact={false} onSOS={handleSOS}/>
              {contacts.length === 0 && (
                <p className="text-[10px] text-[#FFC857]/60 mt-2 max-w-[180px] leading-relaxed">⚠️ Add & verify emergency contacts first.</p>
              )}
              {contacts.length > 0 && !contacts.some(c=>c.twilioVerified) && (
                <p className="text-[10px] text-[#FFC857]/60 mt-2 max-w-[200px] leading-relaxed">⚠️ No contacts verified yet — SOS SMS may not deliver.</p>
              )}
            </div>

            <div className="flex-1 bg-white/3 border border-white/6 rounded-2xl p-4">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">Journey Log</p>
              <div className="max-h-[280px] overflow-y-auto space-y-0 pr-1">
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