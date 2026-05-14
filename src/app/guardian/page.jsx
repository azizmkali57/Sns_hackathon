"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MdLocationOn,
  MdPersonAdd,
  MdNotifications,
  MdDelete,
} from "react-icons/md";

import { FiRadio } from "react-icons/fi";
import SOSButton from "@/components/Home/SOSButton";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const SYNC_INTERVAL_MS = 15_000;

const ALLOWED_RELATIONS = [
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Friend",
  "Spouse",
  "Partner",
  "Colleague",
  "Other",
];

const DOT_COLOR = {
  info: "#00D1FF",
  safe: "#39D353",
  warning: "#FFC857",
  error: "#FF4D4D",
};

const AVATAR_MAP = {
  Mother: "👩‍🦳",
  Father: "👨‍🦳",
  Sister: "👩",
  Brother: "👦",
  Friend: "🧑",
  Spouse: "💑",
  Partner: "🧑",
  Colleague: "🧑‍💼",
  Other: "👤",
};

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export default function GuardianPage() {
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState(null);
  const [countdown, setCountdown] = useState(
    SYNC_INTERVAL_MS / 1000
  );
  const [geoError, setGeoError] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);

  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    relation: "Friend",
    isPrimary: false,
  });

  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  const [deleteLoadingId, setDeleteLoadingId] =
    useState(null);

  const [log, setLog] = useState([
    {
      time: nowTime(),
      event: "Guardian Mode opened",
      type: "info",
    },
  ]);

  const syncIntervalRef = useRef(null);
  const countdownRef = useRef(null);
  const watchIdRef = useRef(null);

  const addLog = useCallback((event, type = "info") => {
    setLog((prev) =>
      [
        {
          time: nowTime(),
          event,
          type,
        },
        ...prev,
      ].slice(0, 20)
    );
  }, []);

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    loadContacts();

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // =========================
  // LOAD CONTACTS
  // =========================
  async function loadContacts() {
    try {
      setContactsLoading(true);

      const data = await apiFetch("/api/contacts/get");

      setContacts(data.data.contacts || []);
    } catch (err) {
      addLog(
        "Failed to load contacts: " + err.message,
        "error"
      );
    } finally {
      setContactsLoading(false);
    }
  }

  // =========================
  // PUSH LOCATION
  // =========================
  const pushLocation = useCallback(
    async (lat, lng) => {
      try {
        await apiFetch("/api/tracking/update", {
          method: "POST",
          body: JSON.stringify({ lat, lng }),
        });

        addLog(
          `Location synced — ${lat.toFixed(
            4
          )}° N, ${lng.toFixed(4)}° E`,
          "safe"
        );
      } catch (err) {
        addLog(
          "Location sync failed: " + err.message,
          "warning"
        );
      }
    },
    [addLog]
  );

  // =========================
  // START SHARING
  // =========================
  function startSharing() {
    if (sharing) return;

    // Clear old intervals if any
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (!navigator.geolocation) {
      setGeoError(
        "Geolocation is not supported by your browser."
      );

      addLog("Geolocation not supported", "error");

      return;
    }

    setGeoError(null);

    // Initial location fetch
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;

        setLocation({ lat, lng });

        pushLocation(lat, lng);

        addLog("Location sharing started", "info");
      },
      () => {
        setGeoError(
          "Location access denied. Please allow location permission."
        );

        addLog("Location access denied", "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
      }
    );

    // Watch position
    watchIdRef.current =
      navigator.geolocation.watchPosition(
        ({ coords }) => {
          setLocation({
            lat: coords.latitude,
            lng: coords.longitude,
          });
        },
        () => {},
        {
          enableHighAccuracy: true,
        }
      );

    // Countdown reset
    setCountdown(SYNC_INTERVAL_MS / 1000);

    // Sync interval
    syncIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const lat = coords.latitude;
          const lng = coords.longitude;

          setLocation({ lat, lng });

          pushLocation(lat, lng);
        },
        () => {
          addLog(
            "Could not refresh location",
            "warning"
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
        }
      );
    }, SYNC_INTERVAL_MS);

    // Countdown interval
    countdownRef.current = setInterval(() => {
      setCountdown((prev) =>
        prev <= 1
          ? SYNC_INTERVAL_MS / 1000
          : prev - 1
      );
    }, 1000);

    setSharing(true);
  }

  // =========================
  // STOP SHARING
  // =========================
  function stopSharing() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);

      syncIntervalRef.current = null;
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);

      countdownRef.current = null;
    }

    setSharing(false);

    addLog("Location sharing stopped", "warning");
  }

  function toggleSharing() {
    if (sharing) {
      stopSharing();
    } else {
      startSharing();
    }
  }

  // =========================
  // ADD CONTACT
  // =========================
  async function handleAddContact(e) {
    e.preventDefault();

    setAddError(null);
    setAddLoading(true);

    try {
      const data = await apiFetch(
        "/api/contacts/add",
        {
          method: "POST",
          body: JSON.stringify(addForm),
        }
      );

      setContacts((prev) => [...prev, data.data]);

      setAddForm({
        name: "",
        phone: "",
        relation: "Friend",
        isPrimary: false,
      });

      setShowAddForm(false);

      addLog(
        `Contact added: ${data.data.name}`,
        "safe"
      );
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  // =========================
  // DELETE CONTACT
  // =========================
  async function handleDeleteContact(
    contactId,
    contactName
  ) {
    const confirmed = confirm(
      `Remove ${contactName} from emergency contacts?`
    );

    if (!confirmed) return;

    setDeleteLoadingId(contactId);

    try {
      await apiFetch("/api/contacts/delete", {
        method: "DELETE",
        body: JSON.stringify({ contactId }),
      });

      setContacts((prev) =>
        prev.filter(
          (c) => (c._id || c.id) !== contactId
        )
      );

      addLog(
        `Contact removed: ${contactName}`,
        "warning"
      );
    } catch (err) {
      addLog(
        "Failed to remove contact: " + err.message,
        "error"
      );
    } finally {
      setDeleteLoadingId(null);
    }
  }

  // =========================
  // SOS
  // =========================
  async function handleSOS() {
    addLog(
      "🆘 SOS triggered — alerting all contacts",
      "error"
    );

    try {
      const payload = location
        ? {
            lat: location.lat,
            lng: location.lng,
          }
        : {};

      const data = await apiFetch("/api/sos", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      addLog(
        `SOS sent to ${
          data.results?.length ?? 0
        } contact(s)`,
        "error"
      );

      setContacts((prev) =>
        prev.map((c) => ({
          ...c,
          _uiStatus: "notified",
        }))
      );
    } catch (err) {
      addLog("SOS failed: " + err.message, "error");
    }
  }

  return (
    <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 text-[#F5F7FA] font-[Inter,sans-serif] relative overflow-hidden">
      <Header />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 20% 80%, rgba(57,211,83,.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight font-[Poppins,sans-serif]">
              Guardian{" "}
              <span className="text-[#39D353]">
                Mode
              </span>
            </h1>

            <p className="text-[13px] text-white/40 mt-1">
              Live location sharing & emergency
              contact management
            </p>
          </div>

          {sharing && (
            <div
              className="flex items-center gap-2 px-4 py-2 bg-[#39D353]/8 border-[1.5px] border-[#39D353]/30 rounded-full text-[12px] font-semibold text-[#39D353]"
              style={{
                animation:
                  "liveGlow 2s ease-in-out infinite",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#39D353] shadow-[0_0_6px_#39D353] animate-pulse" />
              Live Tracking ON · Updates every{" "}
              {countdown}s
            </div>
          )}
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_320px] gap-[18px]">
          {/* LOCATION CARD */}
          <div className="bg-white/3 border border-[#39D353]/15 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3">
              Your Live Location
            </p>

            <div className="bg-[#0a1628] border border-[#00D1FF]/10 rounded-xl h-44 flex items-center justify-center mb-4 relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, rgba(0,209,255,.05) 0, rgba(0,209,255,.05) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(0,209,255,.05) 0, rgba(0,209,255,.05) 1px, transparent 1px, transparent 40px)",
                }}
              />

              <div className="relative z-10">
                {sharing ? (
                  <div className="w-4 h-4 rounded-full bg-[#39D353] shadow-[0_0_12px_#39D353] relative">
                    <span className="absolute inset-0 rounded-full border border-[#39D353] animate-ping opacity-60" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/25">
                    <MdLocationOn size={28} />

                    <span className="text-[11px]">
                      Start sharing to track
                    </span>
                  </div>
                )}
              </div>
            </div>

            {geoError && (
              <div className="mb-3 px-3 py-2 bg-[#FF4D4D]/8 border border-[#FF4D4D]/20 rounded-lg text-[11px] text-[#FF4D4D]">
                {geoError}
              </div>
            )}

            <div className="space-y-2.5 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-white/50">
                  Coordinates
                </span>

                <strong className="font-medium">
                  {sharing && location
                    ? `${location.lat.toFixed(
                        4
                      )}° N, ${location.lng.toFixed(
                        4
                      )}° E`
                    : "—"}
                </strong>
              </div>

              <div className="flex justify-between">
                <span className="text-white/50">
                  Status
                </span>

                <strong
                  className={
                    sharing
                      ? "text-[#39D353]"
                      : "text-white/30"
                  }
                >
                  {sharing ? "● Sharing" : "○ Idle"}
                </strong>
              </div>

              <div className="flex justify-between">
                <span className="text-white/50">
                  Sync interval
                </span>

                {sharing ? (
                  <span className="flex items-center gap-1 text-[10px] text-[#00D1FF] bg-[#00D1FF]/8 border border-[#00D1FF]/20 rounded-full px-2 py-0.5 font-semibold animate-pulse">
                    <FiRadio size={10} />{" "}
                    {countdown}s
                  </span>
                ) : (
                  <span className="text-white/25 text-[10px]">
                    Paused
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={toggleSharing}
              className={`mt-4 w-full py-2.5 rounded-xl text-[12px] font-semibold tracking-wider transition-all duration-200 border cursor-pointer ${
                sharing
                  ? "bg-[#39D353]/10 border-[#39D353] text-[#39D353]"
                  : "bg-transparent border-white/12 text-white/40 hover:border-[#39D353]/30 hover:text-[#39D353]/60"
              }`}
            >
              {sharing
                ? "📡 Stop Location Sharing"
                : "📡 Start Location Sharing"}
            </button>
          </div>

          {/* CONTACTS */}
          <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3">
              Emergency Contacts ({contacts.length}
              /5)
            </p>

            {/* CONTACT LIST */}
            {contactsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-white/3 animate-pulse"
                  />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/20 text-[12px] gap-2">
                <MdPersonAdd size={28} />
                <p>No emergency contacts yet.</p>
              </div>
            ) : (
              contacts.map((c) => {
                const cId = c._id || c.id;

                return (
                  <div
                    key={cId}
                    className="flex items-center gap-3 p-3 rounded-xl mb-2 bg-white/2 border border-white/4"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/6 flex items-center justify-center text-xl">
                      {AVATAR_MAP[c.relation] ??
                        "👤"}
                    </div>

                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">
                        {c.name}
                      </p>

                      <p className="text-[10.5px] text-white/40">
                        {c.relation} · {c.phone}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        handleDeleteContact(
                          cId,
                          c.name
                        )
                      }
                      disabled={
                        deleteLoadingId === cId
                      }
                      className="text-white/30 hover:text-[#FF4D4D] transition-colors"
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                );
              })
            )}

            {/* ADD CONTACT BUTTON */}
            {!showAddForm &&
              contacts.length < 5 && (
                <button
                  onClick={() =>
                    setShowAddForm(true)
                  }
                  className="w-full py-2.5 mt-2 bg-white/3 border border-dashed border-white/12 rounded-xl text-[12px] text-white/35 hover:text-[#00D1FF] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <MdPersonAdd size={14} />
                  Add Emergency Contact
                </button>
              )}

            {/* FORM */}
            {showAddForm && (
              <form
                onSubmit={handleAddContact}
                className="mt-3 space-y-2"
              >
                {addError && (
                  <div className="text-[11px] text-[#FF4D4D]">
                    {addError}
                  </div>
                )}

                <input
                  required
                  placeholder="Full name"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg px-3 py-2 text-black"
                />

                <input
                  required
                  placeholder="Phone Number"
                  value={addForm.phone}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg px-3 py-2 text-black"
                />

                <select
                  value={addForm.relation}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      relation: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg px-3 py-2 bg-[#0a1628]"
                >
                  {ALLOWED_RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 py-2 rounded-lg bg-[#00D1FF]/10 border border-[#00D1FF]/30 text-[#00D1FF]"
                  >
                    {addLoading
                      ? "Saving..."
                      : "Save Contact"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAddForm(false)
                    }
                    className="px-3 py-2 rounded-lg border border-white/10 text-white/40"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* SOS + LOG */}
          <div className="flex flex-col gap-3.5">
            {/* SOS */}
            <div className="bg-[#FF4D4D]/5 border border-[#FF4D4D]/15 rounded-2xl p-5 flex flex-col items-center text-center">
              <p className="text-[12px] font-semibold text-white/50 mb-3">
                Emergency SOS
              </p>

              <SOSButton
                compact={false}
                onSOS={handleSOS}
              />
            </div>

            {/* LOG */}
            <div className="flex-1 bg-white/3 border border-white/6 rounded-2xl p-4 overflow-hidden">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3">
                Journey Log
              </p>

              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {log.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-[5px]"
                      style={{
                        background:
                          DOT_COLOR[l.type],
                      }}
                    />

                    <div>
                      <p className="text-[9px] text-white/25">
                        {l.time}
                      </p>

                      <p className="text-[11px] text-white/55">
                        {l.event}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}