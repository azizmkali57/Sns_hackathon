"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  MdShield, MdLocationOn, MdPerson, MdStorage,
  MdShare, MdLock, MdChildCare, MdEmail,
  MdChevronRight, MdExpandMore, MdExpandLess,
} from "react-icons/md";
import { FiExternalLink } from "react-icons/fi";

const LAST_UPDATED = "May 14, 2026";

const SECTIONS = [
  {
    id: "info-collect",
    icon: MdStorage,
    color: "#00D1FF",
    title: "Information We Collect",
    content: [
      {
        sub: "Account Information",
        text: "When you register, we collect your name, email address, and optionally your phone number. Passwords are hashed using bcrypt and are never stored in plain text.",
      },
      {
        sub: "Location Data",
        text: "SafeRoute collects GPS coordinates only while you are actively navigating. We do not track your location in the background. Location data is used solely to calculate safety scores and provide route guidance.",
      },
      {
        sub: "Journey History",
        text: "Route data including source, destination, safety scores, and timestamps are stored to provide journey history and improve route recommendations.",
      },
      {
        sub: "Incident Reports",
        text: "When you submit an incident, we store the incident type, description, severity, and coordinates. If you choose anonymous reporting, your user identity is not linked to the report.",
      },
    ],
  },
  {
    id: "how-we-use",
    icon: MdShield,
    color: "#39D353",
    title: "How We Use Your Information",
    content: [
      {
        sub: "Safety Scoring",
        text: "Your location and route data are used to compute real-time safety scores for roads and areas. This helps all users make informed route decisions.",
      },
      {
        sub: "Guardian Mode",
        text: "If you enable Guardian Mode, your live location is shared with your pre-configured emergency contacts for the duration of a journey only.",
      },
      {
        sub: "SOS Alerts",
        text: "When you trigger SOS, we use your current location to notify emergency contacts via SMS and WhatsApp. This data is not retained beyond the active emergency.",
      },
      {
        sub: "Service Improvement",
        text: "Aggregated, anonymised data is used to improve route algorithms, incident detection accuracy, and overall platform safety.",
      },
    ],
  },
  {
    id: "location",
    icon: MdLocationOn,
    color: "#FFC857",
    title: "Location Data & GPS",
    content: [
      {
        sub: "Active Use Only",
        text: "Location access is requested only when you initiate navigation. We do not collect location data when the app is in the background or closed.",
      },
      {
        sub: "Precision",
        text: "High-accuracy GPS is used during navigation for routing precision. You may disable location access at any time through your device settings, though this will limit core functionality.",
      },
      {
        sub: "Retention",
        text: "Live tracking data is stored per navigation session and retained for 90 days for journey history. After 90 days, location data is permanently deleted.",
      },
    ],
  },
  {
    id: "sharing",
    icon: MdShare,
    color: "#FF4D4D",
    title: "Data Sharing",
    content: [
      {
        sub: "We Do Not Sell Your Data",
        text: "SafeRoute does not sell, rent, or trade your personal information to any third party for commercial purposes.",
      },
      {
        sub: "Emergency Services",
        text: "In cases where there is a credible risk to life, we may share location data with emergency services (police or ambulance) if required by law or if you explicitly trigger an SOS.",
      },
      {
        sub: "Service Providers",
        text: "We use trusted third-party services including Twilio (for SMS), MongoDB Atlas (for data storage), and OSRM (for routing). Each provider is bound by strict data processing agreements.",
      },
      {
        sub: "Legal Requirements",
        text: "We may disclose data if required by applicable law, regulation, or valid legal process.",
      },
    ],
  },
  {
    id: "security",
    icon: MdLock,
    color: "#39D353",
    title: "Security",
    content: [
      {
        sub: "Encryption",
        text: "All data in transit is encrypted using TLS 1.3. Data at rest is encrypted using AES-256 on MongoDB Atlas.",
      },
      {
        sub: "Authentication",
        text: "We use JWT tokens stored in httpOnly cookies, making them inaccessible to client-side JavaScript and resistant to XSS attacks.",
      },
      {
        sub: "Access Control",
        text: "Only authorised personnel have access to production databases. All access is logged and audited.",
      },
    ],
  },
  {
    id: "rights",
    icon: MdPerson,
    color: "#00D1FF",
    title: "Your Rights",
    content: [
      {
        sub: "Access & Export",
        text: "You may request a complete export of all personal data we hold about you at any time by contacting privacy@saferoute.in.",
      },
      {
        sub: "Deletion",
        text: "You may request permanent deletion of your account and all associated data. Deletion is processed within 30 days.",
      },
      {
        sub: "Correction",
        text: "You may update your name, phone number, and email from the Profile page at any time.",
      },
      {
        sub: "Opt-Out",
        text: "You may disable anonymous reporting, Guardian Mode, and SOS auto-contact at any time from your Profile settings.",
      },
    ],
  },
  {
    id: "children",
    icon: MdChildCare,
    color: "#FFC857",
    title: "Children's Privacy",
    content: [
      {
        sub: "Age Requirement",
        text: "SafeRoute is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us immediately.",
      },
    ],
  },
  {
    id: "contact",
    icon: MdEmail,
    color: "#FF4D4D",
    title: "Contact Us",
    content: [
      {
        sub: "Privacy Enquiries",
        text: "For all privacy-related questions, data requests, or concerns, please email privacy@saferoute.in. We respond within 72 hours.",
      },
    ],
  },
];

export default function PrivacyPage() {
  const [openSections, setOpenSections] = useState(new Set(["info-collect"]));

  const toggle = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#081120] text-[#F5F7FA] font-[Inter,sans-serif]">
      <Header />

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 800px 600px at 30% 20%, rgba(0,209,255,.03) 0%, transparent 70%)" }}
      />

      <div className="max-w-4xl mx-auto px-6 pt-[120px] pb-20 relative z-10">

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00D1FF]/8 border border-[#00D1FF]/20 text-[#00D1FF] text-[11px] font-semibold tracking-widest uppercase mb-4">
            <MdShield size={13} /> Legal
          </div>
          <h1 className="text-[38px] font-extrabold text-[#F5F7FA] tracking-tight font-[Poppins,sans-serif] leading-tight mb-3">
            Privacy <span className="text-[#00D1FF]">Policy</span>
          </h1>
          <p className="text-[14px] text-white/45 max-w-xl leading-relaxed">
            SafeRoute is built on trust. This policy explains what data we collect, why we collect it, and how we protect it.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-[11px] text-white/25">Last updated: {LAST_UPDATED}</span>
            <span className="text-white/10">·</span>
            <Link href="/terms" className="text-[11px] text-[#00D1FF]/60 hover:text-[#00D1FF] transition-colors flex items-center gap-1">
              Terms of Use <FiExternalLink size={10} />
            </Link>
          </div>
        </div>

        {/* Quick nav */}
        <div className="bg-white/3 border border-white/6 rounded-2xl p-5 mb-8">
          <p className="text-[11px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">Contents</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SECTIONS.map(({ id, title, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => {
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setOpenSections((prev) => new Set([...prev, id]));
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/2 border border-white/5 hover:bg-white/5 transition-all text-left cursor-pointer"
              >
                <Icon size={13} style={{ color }} className="flex-shrink-0" />
                <span className="text-[11px] text-white/50 truncate">{title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {SECTIONS.map(({ id, icon: Icon, color, title, content }) => {
            const isOpen = openSections.has(id);
            return (
              <div
                key={id}
                id={id}
                className="bg-white/3 border border-white/6 rounded-2xl overflow-hidden transition-all"
              >
                {/* Section header */}
                <button
                  onClick={() => toggle(id)}
                  className="w-full flex items-center justify-between px-6 py-4 cursor-pointer bg-transparent border-0 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                    >
                      <Icon size={16} style={{ color }} />
                    </div>
                    <span className="text-[15px] font-bold font-[Poppins,sans-serif] text-[#F5F7FA]">{title}</span>
                  </div>
                  {isOpen
                    ? <MdExpandLess size={20} className="text-white/30 flex-shrink-0" />
                    : <MdExpandMore size={20} className="text-white/30 flex-shrink-0" />
                  }
                </button>

                {/* Section body */}
                {isOpen && (
                  <div className="px-6 pb-5 border-t border-white/5">
                    <div className="space-y-4 pt-4">
                      {content.map(({ sub, text }) => (
                        <div key={sub} className="flex gap-3">
                          <MdChevronRight size={16} className="flex-shrink-0 mt-0.5" style={{ color }} />
                          <div>
                            <p className="text-[13px] font-semibold text-[#F5F7FA] mb-1 font-[Poppins,sans-serif]">{sub}</p>
                            <p className="text-[13px] text-white/50 leading-relaxed">{text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-5 rounded-2xl bg-[#00D1FF]/4 border border-[#00D1FF]/15 text-center">
          <p className="text-[13px] text-white/40 leading-relaxed">
            By using SafeRoute, you agree to this Privacy Policy. We may update this policy periodically.
            Continued use after changes constitutes acceptance.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/terms" className="text-[12px] text-[#00D1FF] hover:underline">Terms of Use</Link>
            <span className="text-white/15">·</span>
            <Link href="/api-docs" className="text-[12px] text-[#00D1FF] hover:underline">API Docs</Link>
            <span className="text-white/15">·</span>
            <a href="mailto:privacy@saferoute.in" className="text-[12px] text-[#00D1FF] hover:underline">Contact</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}