"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  MdGavel, MdCheckCircle, MdBlock, MdWarning,
  MdUpdate, MdEmail, MdExpandMore, MdExpandLess, MdChevronRight,
} from "react-icons/md";
import { FiExternalLink } from "react-icons/fi";

const LAST_UPDATED = "May 14, 2026";

const SECTIONS = [
  {
    id: "acceptance",
    icon: MdCheckCircle,
    color: "#39D353",
    title: "Acceptance of Terms",
    items: [
      "By creating a SafeRoute account or using any part of the platform, you agree to be bound by these Terms of Use.",
      "If you do not agree with any part of these terms, you must not use SafeRoute.",
      "You must be at least 13 years of age to use SafeRoute. Users under 18 should review these terms with a parent or guardian.",
      "These terms apply to the SafeRoute web application, API, and all associated services.",
    ],
  },
  {
    id: "account",
    icon: MdCheckCircle,
    color: "#00D1FF",
    title: "Account Responsibilities",
    items: [
      "You are responsible for maintaining the confidentiality of your account credentials.",
      "You must provide accurate and current information when registering. False information may result in account suspension.",
      "You must notify us immediately at support@saferoute.in if you suspect unauthorised access to your account.",
      "You may not create multiple accounts or share your account with others.",
      "Accounts that are inactive for 12 consecutive months may be deactivated.",
    ],
  },
  {
    id: "acceptable-use",
    icon: MdCheckCircle,
    color: "#FFC857",
    title: "Acceptable Use",
    items: [
      "You may use SafeRoute only for lawful purposes and in accordance with these terms.",
      "You may submit incident reports only for genuine safety concerns you have personally witnessed or experienced.",
      "You may use Guardian Mode and SOS features only in good faith for genuine safety situations.",
      "You may access the SafeRoute API for personal projects, research, or legitimate application development with proper attribution.",
      "You agree not to use SafeRoute in any way that could harm, disable, or impair the service or other users.",
    ],
  },
  {
    id: "prohibited",
    icon: MdBlock,
    color: "#FF4D4D",
    title: "Prohibited Activities",
    items: [
      "Submitting false, misleading, or malicious incident reports intended to manipulate safety scores.",
      "Attempting to reverse-engineer, scrape, or extract data from SafeRoute beyond what is permitted by the public API.",
      "Using SafeRoute to stalk, harass, or monitor any individual without their consent.",
      "Attempting to bypass authentication, access other users' data, or exploit security vulnerabilities.",
      "Using automated bots or scripts to submit reports, votes, or navigate the platform without prior written approval.",
      "Reselling or redistributing SafeRoute data or services for commercial gain without a commercial licence agreement.",
    ],
  },
  {
    id: "content",
    icon: MdWarning,
    color: "#FFC857",
    title: "User-Generated Content",
    items: [
      "By submitting incident reports, you grant SafeRoute a non-exclusive, royalty-free licence to use, store, and display that content for the purpose of improving community safety.",
      "You represent that your submissions are truthful to the best of your knowledge.",
      "SafeRoute reserves the right to remove any content that violates these terms or is deemed harmful to the community.",
      "Anonymous reports are accepted, but misuse of anonymous reporting for false submissions is a violation of these terms.",
    ],
  },
  {
    id: "disclaimers",
    icon: MdWarning,
    color: "#FF4D4D",
    title: "Disclaimers & Limitations",
    items: [
      "SafeRoute provides safety information on a best-effort basis. Safety scores are algorithmic estimates and should not be the sole basis for safety decisions.",
      "SafeRoute does not guarantee the accuracy, completeness, or timeliness of safety data.",
      "In no event shall SafeRoute be liable for any indirect, incidental, or consequential damages arising from your use of the platform.",
      "SafeRoute is not a substitute for emergency services. Always call 112 in a life-threatening emergency.",
      "We do not guarantee service availability and may perform maintenance at any time.",
    ],
  },
  {
    id: "changes",
    icon: MdUpdate,
    color: "#00D1FF",
    title: "Changes to Terms",
    items: [
      "We may update these terms from time to time. The updated date at the top of this page will reflect any changes.",
      "For significant changes, we will notify registered users via email at least 14 days before the changes take effect.",
      "Continued use of SafeRoute after changes take effect constitutes acceptance of the updated terms.",
      "If you do not agree to the updated terms, you must stop using SafeRoute and may request account deletion.",
    ],
  },
  {
    id: "termination",
    icon: MdBlock,
    color: "#FF4D4D",
    title: "Account Termination",
    items: [
      "SafeRoute reserves the right to suspend or terminate accounts that violate these terms without prior notice.",
      "You may delete your account at any time from your Profile settings. Deletion is irreversible.",
      "Upon termination, your personal data will be deleted within 30 days, except where retention is required by law.",
      "Termination does not affect any provisions of these terms that by their nature should survive, including disclaimers and limitation of liability.",
    ],
  },
  {
    id: "contact-terms",
    icon: MdEmail,
    color: "#39D353",
    title: "Contact",
    items: [
      "For questions about these terms, email legal@saferoute.in.",
      "For technical support, email support@saferoute.in.",
      "SafeRoute is operated from Indore, Madhya Pradesh, India. These terms are governed by the laws of India.",
    ],
  },
];

export default function TermsPage() {
  const [openSections, setOpenSections] = useState(new Set(["acceptance"]));

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

      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 800px 600px at 70% 20%, rgba(255,200,87,.025) 0%, transparent 70%)" }}
      />

      <div className="max-w-4xl mx-auto px-6 pt-[120px] pb-20 relative z-10">

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFC857]/8 border border-[#FFC857]/20 text-[#FFC857] text-[11px] font-semibold tracking-widest uppercase mb-4">
            <MdGavel size={13} /> Legal
          </div>
          <h1 className="text-[38px] font-extrabold text-[#F5F7FA] tracking-tight font-[Poppins,sans-serif] leading-tight mb-3">
            Terms of <span className="text-[#FFC857]">Use</span>
          </h1>
          <p className="text-[14px] text-white/45 max-w-xl leading-relaxed">
            These terms govern your use of SafeRoute and all associated services. Please read them carefully before using the platform.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-[11px] text-white/25">Last updated: {LAST_UPDATED}</span>
            <span className="text-white/10">·</span>
            <Link href="/privacy" className="text-[11px] text-[#FFC857]/60 hover:text-[#FFC857] transition-colors flex items-center gap-1">
              Privacy Policy <FiExternalLink size={10} />
            </Link>
          </div>
        </div>

        {/* Quick summary banner */}
        <div className="bg-[#39D353]/5 border border-[#39D353]/20 rounded-2xl p-5 mb-8">
          <p className="text-[12px] font-semibold text-[#39D353] tracking-widest uppercase mb-3 font-[Poppins,sans-serif]">
            Plain English Summary
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: "✅", text: "Use SafeRoute honestly and only for real safety purposes." },
              { icon: "🚫", text: "Don't submit fake reports or try to game safety scores." },
              { icon: "⚠️", text: "We're a safety tool, not emergency services. Always call 112 first." },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <p className="text-[12px] text-white/50 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contents nav */}
        <div className="bg-white/3 border border-white/6 rounded-2xl p-5 mb-8">
          <p className="text-[11px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-3 font-[Poppins,sans-serif]">Contents</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

        {/* Accordion sections */}
        <div className="space-y-3">
          {SECTIONS.map(({ id, icon: Icon, color, title, items }) => {
            const isOpen = openSections.has(id);
            return (
              <div key={id} id={id} className="bg-white/3 border border-white/6 rounded-2xl overflow-hidden">
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

                {isOpen && (
                  <div className="px-6 pb-5 border-t border-white/5">
                    <ul className="space-y-3 pt-4">
                      {items.map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <MdChevronRight size={16} className="flex-shrink-0 mt-0.5" style={{ color }} />
                          <p className="text-[13px] text-white/50 leading-relaxed">{item}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-5 rounded-2xl bg-[#FFC857]/4 border border-[#FFC857]/15 text-center">
          <p className="text-[13px] text-white/40 leading-relaxed">
            These Terms of Use are effective as of {LAST_UPDATED}. By continuing to use SafeRoute, you acknowledge that you have read, understood, and agree to be bound by these terms.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/privacy" className="text-[12px] text-[#FFC857] hover:underline">Privacy Policy</Link>
            <span className="text-white/15">·</span>
            <Link href="/api-docs" className="text-[12px] text-[#FFC857] hover:underline">API Docs</Link>
            <span className="text-white/15">·</span>
            <a href="mailto:legal@saferoute.in" className="text-[12px] text-[#FFC857] hover:underline">Contact Legal</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}