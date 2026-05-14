"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MdDashboard,
  MdNavigation,
  MdShield,
  MdReport,
  MdPerson,
  MdMenu,
  MdClose,
} from "react-icons/md";
import { FiAlertOctagon } from "react-icons/fi";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: MdDashboard },
  { href: "/navigate",  label: "Navigate",  icon: MdNavigation },
  { href: "/guardian",  label: "Guardian",  icon: MdShield },
  { href: "/report",    label: "Report",    icon: MdReport },
  { href: "/profile",   label: "Profile",   icon: MdPerson },
];

export default function Header() {
  const pathname  = usePathname();
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-8 ${
          scrolled
            ? "bg-[#081120]/90 backdrop-blur-xl border-b border-[#00D1FF]/10 shadow-[0_4px_40px_rgba(0,0,0,0.4)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">

          <Link href="/dashboard" className="flex items-center gap-3 no-underline">
             <img src="./images/logo.png" alt="SafeRoute Logo" className="w-32" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 no-underline relative ${
                    active
                      ? "text-[#39D353] bg-[#39D353]/10"
                      : "text-white/60 hover:text-white hover:bg-[#00D1FF]/8"
                  }`}
                >
                  <Icon size={14} className="opacity-70" />
                  {label}
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#39D353] rounded-sm shadow-[0_0_6px_#39D353]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#FF4D4D] to-[#c73737] text-white font-bold text-[13px] rounded-lg tracking-widest shadow-[0_0_20px_rgba(255,77,77,0.35)] hover:scale-105 hover:shadow-[0_0_32px_rgba(255,77,77,0.55)] transition-all duration-200 animate-[sosPulse_2.5s_ease-in-out_infinite] border-0 cursor-pointer">
              <FiAlertOctagon size={15} />
              SOS
            </button>

            <Link href="/profile">
              <div className="w-9 h-9 rounded-full border border-[#00D1FF]/30 bg-gradient-to-br from-[#00D1FF]/13 to-[#39D353]/13 flex items-center justify-center text-sm cursor-pointer hover:border-[#00D1FF] hover:shadow-[0_0_12px_rgba(0,209,255,0.3)] transition-all duration-200">
                <MdPerson size={18} className="text-white/70" />
              </div>
            </Link>

            <button
              className="md:hidden bg-transparent border-0 text-white text-xl cursor-pointer p-1"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <MdClose size={22} /> : <MdMenu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#081120]/95 backdrop-blur-xl border-t border-white/5 px-4 pb-4">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium mt-1 no-underline transition-all ${
                    active ? "text-[#39D353] bg-[#39D353]/10" : "text-white/60"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <div className="fixed top-16 left-0 right-0 z-40 bg-[#39D353]/8 border-b border-[#39D353]/20 py-1.5 px-6 flex items-center justify-center gap-5 flex-wrap">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/50 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#39D353] shadow-[0_0_6px_#39D353] animate-pulse inline-block" />
          System Active
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[11px] text-white/50 tracking-wider">📍 Indore, MP</span>
        <span className="text-white/20">|</span>
        <span className="text-[11px] text-white/50 tracking-wider">🛰 GPS Locked</span>
        <span className="text-white/20">|</span>
        <span className="text-[11px] text-white/50 tracking-wider">⚡ OSRM Connected</span>
      </div>

      <style>{`
        @keyframes sosPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,77,77,0.35); }
          50%       { box-shadow: 0 0 32px rgba(255,77,77,0.6); }
        }
      `}</style>
    </>
  );
}