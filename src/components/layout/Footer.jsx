"use client";
import Link from "next/link";
import {
  MdDashboard, MdNavigation, MdShield, MdReport, MdPerson,
} from "react-icons/md";
import { SiOpenstreetmap } from "react-icons/si";
import { FiGithub, FiExternalLink } from "react-icons/fi";

const QUICK_LINKS = [
  { href: "/dashboard", label: "Dashboard",       icon: MdDashboard  },
  { href: "/navigate",  label: "Navigate",        icon: MdNavigation },
  { href: "/guardian",  label: "Guardian",        icon: MdShield     },
  { href: "/report",    label: "Report Incident", icon: MdReport     },
  { href: "/profile",   label: "My Profile",      icon: MdPerson     },
];

const APIS = [
  "OSRM Routing", "OpenStreetMap", "Overpass API",
  "Nominatim", "Claude AI", "Twilio SMS", "Firebase",
];

const STATS = [
  { val: "1.2K", lbl: "Routes Today" },
  { val: "98%",  lbl: "Uptime"       },
  { val: "342",  lbl: "Reports"      },
  { val: "7ms",  lbl: "Avg Latency"  },
];

export default function Footer() {
  return (
    <footer className="relative bg-[#040c18] border-t border-[#00D1FF]/10 pt-14 pb-0 overflow-hidden font-[Inter,sans-serif]">

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#39D353] to-transparent opacity-60" />

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-[radial-gradient(ellipse_at_center_bottom,rgba(57,211,83,0.06),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-12">

        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src="./images/logo.png" alt="SafeRoute Logo" className="w-32" />
          </div>

          <p className="text-[13.5px] text-white/45 leading-relaxed max-w-[280px] mb-5">
            AI-powered navigation that scores routes for safety, not just speed.
            Real-time alerts, SOS protection, and community-driven incident reporting.
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#39D353] bg-[#39D353]/8 border border-[#39D353]/30">● Live</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#00D1FF] bg-[#00D1FF]/8 border border-[#00D1FF]/30">AI Powered</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#39D353] bg-[#39D353]/8 border border-[#39D353]/30">Open Source</span>
          </div>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-white/35 tracking-[0.15em] uppercase mb-5 font-[Poppins,sans-serif]">Navigation</p>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-2 text-[13.5px] text-white/50 hover:text-[#39D353] no-underline transition-all duration-200 group"
                >
                  <Icon size={13} className="opacity-60 group-hover:opacity-100 text-[#39D353]" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-white/35 tracking-[0.15em] uppercase mb-5 font-[Poppins,sans-serif]">Live Stats</p>
          <div className="grid grid-cols-2 gap-3">
            {STATS.map(({ val, lbl }) => (
              <div key={lbl} className="bg-white/3 border border-white/6 rounded-xl p-3 text-center">
                <p className="text-[18px] font-bold text-[#39D353] font-[Poppins,sans-serif]">{val}</p>
                <p className="text-[9px] text-white/35 uppercase tracking-widest mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-white/35 tracking-[0.15em] uppercase mb-5 font-[Poppins,sans-serif]">Powered By</p>
          <div className="flex flex-wrap gap-2">
            {APIS.map((api) => (
              <span
                key={api}
                className="px-2.5 py-1 rounded text-[10.5px] font-medium text-[#00D1FF]/70 bg-[#00D1FF]/6 border border-[#00D1FF]/15 hover:bg-[#00D1FF]/12 hover:text-[#00D1FF] transition-all duration-200 cursor-default"
              >
                {api}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-white/25">
            © 2025 SafeRoute SNS. Built with <span className="text-[#39D353]">♥</span> for safer streets.
          </p>
          <div className="flex items-center gap-5">
            {["Privacy Policy", "Terms of Use", "API Docs"].map((t) => (
              <a key={t} href="#" className="text-[11px] text-white/25 hover:text-[#00D1FF] no-underline transition-colors duration-200 flex items-center gap-1">
                {t}
              </a>
            ))}
            <a href="#" className="text-[11px] text-white/25 hover:text-[#00D1FF] no-underline transition-colors duration-200 flex items-center gap-1">
              <FiGithub size={12} /> GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}