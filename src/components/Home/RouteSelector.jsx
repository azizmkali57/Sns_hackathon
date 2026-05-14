"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FiSearch, FiMapPin, FiNavigation, FiRotateCcw, FiChevronRight, FiX } from "react-icons/fi";
import { MdMyLocation } from "react-icons/md";
import RouteCard from "./RouteCard";

// ─── Nominatim autocomplete ───────────────────────────────────────────────────
async function searchPlaces(query) {
  if (!query?.trim() || query.trim().length < 2) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), { headers: { "User-Agent": "SafeRouteNavigationSystem/1.0" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((r) => ({
    label:      r.display_name,
    shortLabel: r.display_name.split(",").slice(0, 2).join(",").trim(),
    lat:        parseFloat(r.lat),
    lng:        parseFloat(r.lon),
  }));
}

// ─── Single autocomplete input ────────────────────────────────────────────────
function PlaceInput({ value, onChange, onSelect, placeholder, icon, accentColor, label, rightSlot }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [fetching,    setFetching]    = useState(false);
  const wrapRef  = useRef(null);
  const timerRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    setFetching(true);
    try {
      const results = await searchPlaces(q);
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch { setSuggestions([]); }
    finally { setFetching(false); }
  }, []);

  const handleChange = (e) => {
    onChange(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(e.target.value), 320);
  };

  const handleSelect = (place) => {
    onChange(place.shortLabel);
    onSelect(place);
    setSuggestions([]);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col gap-1.5 relative" ref={wrapRef}>
      <label className="text-[10px] font-semibold text-white/30 tracking-[0.14em] uppercase">{label}</label>
      <div className="flex items-center gap-2 bg-white/[0.04] border rounded-xl px-3.5 py-2.5 transition-all"
           style={{ borderColor: open ? `${accentColor}66` : "rgba(255,255,255,0.08)" }}>
        <span className="flex-shrink-0" style={{ color: accentColor }}>{icon}</span>
        <input
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[#F5F7FA] text-[13.5px] outline-none placeholder:text-white/25"
        />
        {fetching && <span className="w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin flex-shrink-0" />}
        {value && !fetching && (
          <button onClick={() => { onChange(""); onSelect(null); setSuggestions([]); setOpen(false); }}
                  className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
            <FiX size={12} />
          </button>
        )}
        {rightSlot}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#0d1e35] border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
          {suggestions.map((place, i) => (
            <button key={i} onMouseDown={() => handleSelect(place)}
                    className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0">
              <FiMapPin size={12} className="text-white/30 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[12.5px] text-[#F5F7FA] font-medium truncate">{place.shortLabel}</p>
                <p className="text-[10px] text-white/30 truncate">{place.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main RouteSelector ───────────────────────────────────────────────────────
export default function RouteSelector({ onRouteSelect, onStartNavigation, className = "" }) {
  const [srcText,   setSrcText]   = useState("");
  const [dstText,   setDstText]   = useState("");
  const [srcCoords, setSrcCoords] = useState(null);
  const [dstCoords, setDstCoords] = useState(null);
  const [routes,    setRoutes]    = useState([]);
  const [routeDocId, setRouteDocId] = useState(null);
  const [selected,  setSelected]  = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [searched,  setSearched]  = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setSrcCoords({ lat, lng });
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "User-Agent": "SafeRouteNavigationSystem/1.0" } });
          const data = await res.json();
          setSrcText(data.display_name?.split(",").slice(0, 2).join(",").trim() ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch { setSrcText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
      },
      () => setError("Could not get your location.")
    );
  };

  const swap = () => {
    setSrcText(dstText); setDstText(srcText);
    setSrcCoords(dstCoords); setDstCoords(srcCoords);
    setRoutes([]); setSearched(false);
  };

  const findRoutes = async () => {
    if (!srcText.trim() || !dstText.trim()) { setError("Please enter both source and destination."); return; }
    setLoading(true); setError(null); setRoutes([]); setSearched(false);

    try {
      // Geocode if user typed without selecting a suggestion
      let src = srcCoords;
      let dst = dstCoords;

      if (!src) {
        const r = await searchPlaces(srcText);
        if (!r.length) throw new Error(`Could not find "${srcText}" on the map.`);
        src = { lat: r[0].lat, lng: r[0].lng };
        setSrcCoords(src); setSrcText(r[0].shortLabel);
      }
      if (!dst) {
        const r = await searchPlaces(dstText);
        if (!r.length) throw new Error(`Could not find "${dstText}" on the map.`);
        dst = { lat: r[0].lat, lng: r[0].lng };
        setDstCoords(dst); setDstText(r[0].shortLabel);
      }

      const res  = await fetch("/api/routes/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: srcText.trim(), destination: dstText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to fetch routes");

      // ✅ routes here include geometry + steps from the fixed API
      const fetchedRoutes = data.data.routes ?? [];

      // ✅ Use sourceCoords/destinationCoords from API response if available
      const apiSrc = data.data.sourceCoords      ? { lat: data.data.sourceCoords.lat,      lng: data.data.sourceCoords.lng }      : src;
      const apiDst = data.data.destinationCoords ? { lat: data.data.destinationCoords.lat, lng: data.data.destinationCoords.lng } : dst;

      setRoutes(fetchedRoutes);
      setRouteDocId(data.data.routeId);
      setSelected(0);
      setSearched(true);

      // Pass full routes (with geometry) + coords back to parent (dashboard/page.jsx)
      onRouteSelect?.(fetchedRoutes[0], 0, fetchedRoutes, data.data.routeId, apiSrc, apiDst);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (route, idx) => {
    setSelected(idx);
    onRouteSelect?.(route, idx, routes, routeDocId, srcCoords, dstCoords);
  };

  return (
    <div className={`flex flex-col gap-4 font-[Inter,sans-serif] ${className}`}>
      <div className="bg-white/[0.03] border border-[#00D1FF]/15 rounded-2xl p-5 focus-within:border-[#00D1FF]/35 transition-all duration-200">
        <PlaceInput
          label="From" value={srcText}
          onChange={(v) => { setSrcText(v); if (!v) setSrcCoords(null); }}
          onSelect={(p) => { if (p) setSrcCoords({ lat: p.lat, lng: p.lng }); }}
          placeholder="My location or type address…"
          icon={<MdMyLocation size={14} />} accentColor="#00D1FF"
          rightSlot={
            <button onClick={useMyLocation} className="text-[10px] text-[#00D1FF]/60 hover:text-[#00D1FF] transition-colors flex-shrink-0 font-medium">
              Auto
            </button>
          }
        />
        <div className="flex items-center justify-center my-3">
          <button onClick={swap} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/10 text-white/40 hover:border-[#39D353]/40 hover:text-[#39D353] transition-all">
            <FiRotateCcw size={12} />
          </button>
        </div>
        <PlaceInput
          label="To" value={dstText}
          onChange={(v) => { setDstText(v); if (!v) setDstCoords(null); }}
          onSelect={(p) => { if (p) setDstCoords({ lat: p.lat, lng: p.lng }); }}
          placeholder="Enter destination…"
          icon={<FiMapPin size={14} />} accentColor="#39D353"
        />
        <button onClick={findRoutes} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mt-4 bg-gradient-to-r from-[#39D353] to-[#2ab040] text-[#081120] font-[Poppins,sans-serif] font-bold text-[13px] tracking-wide shadow-[0_0_24px_rgba(57,211,83,.30)] hover:shadow-[0_0_36px_rgba(57,211,83,.45)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
          {loading
            ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-[#081120]/30 border-t-[#081120] animate-spin" /> Analysing routes…</>
            : <><FiSearch size={14} /> Find Safest Route</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FF4D4D]/08 border border-[#FF4D4D]/25 text-[#FF4D4D] text-[12.5px]">
          <FiX size={13} className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {[1,2,3].map((i) => <div key={i} className="h-40 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />)}
        </div>
      )}

      {!loading && searched && routes.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-white/30 tracking-[0.14em] uppercase">
            {routes.length} Route{routes.length > 1 ? "s" : ""} Found
          </p>
          <div className="flex flex-col gap-3">
            {routes.map((route, idx) => (
              <RouteCard key={route.index ?? idx} route={route} selected={selected === idx} onSelect={() => handleSelect(route, idx)} />
            ))}
          </div>
          <button
            onClick={() => onStartNavigation?.(routeDocId, selected, srcCoords, dstCoords)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#00D1FF]/10 border-[1.5px] border-[#00D1FF] text-[#00D1FF] font-[Poppins,sans-serif] font-bold text-[13px] tracking-wide hover:bg-[#00D1FF]/20 hover:shadow-[0_0_24px_rgba(0,209,255,.25)] transition-all duration-200">
            <FiNavigation size={14} /> Start Navigation <FiChevronRight size={14} />
          </button>
        </>
      )}

      {!loading && searched && routes.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 py-10 text-white/25">
          <FiMapPin size={32} />
          <p className="text-[13px] font-medium">No routes found for this journey.</p>
        </div>
      )}
    </div>
  );
}