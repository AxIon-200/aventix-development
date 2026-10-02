"use client";

import React, { useState } from "react";
import { X, CheckCircle, Building, Mail, Phone, Calendar } from "lucide-react";
import AventixLogo from "./AventixLogo";

interface OrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrganizerModal({ isOpen, onClose }: OrganizerModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState("concert");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1622] border border-[#213145] rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#182332] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {!submitted ? (
          <div>
            <div className="text-center mb-6">
              <AventixLogo size="md" className="justify-center mb-2" />
              <h3 className="text-2xl font-extrabold text-white">
                Partner with Aventix
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Host your concert, arena tour, or indie gig with our secure ticketing,
                instant QR scanners, and automated payouts.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Organizer / Production Name
                </label>
                <div className="relative flex items-center">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Live Nation PH / Karpos Multimedia"
                    className="w-full bg-[#141e2b] text-sm text-white placeholder-slate-500 pl-9 pr-3.5 py-2.5 rounded-xl border border-[#233348] focus:outline-none focus:border-[#00e5be]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-[#141e2b] text-sm text-white placeholder-slate-500 px-3.5 py-2.5 rounded-xl border border-[#233348] focus:outline-none focus:border-[#00e5be]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="producer@domain.ph"
                    className="w-full bg-[#141e2b] text-sm text-white placeholder-slate-500 px-3.5 py-2.5 rounded-xl border border-[#233348] focus:outline-none focus:border-[#00e5be]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Event Category
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-[#141e2b] text-sm text-white px-3.5 py-2.5 rounded-xl border border-[#233348] focus:outline-none focus:border-[#00e5be]"
                >
                  <option value="concert">Major Arena Concert</option>
                  <option value="festival">Music &amp; Arts Festival</option>
                  <option value="gig">Bar / Underground Gig</option>
                  <option value="theater">Theater / Musical Show</option>
                  <option value="comedy">Comedy &amp; Special Acts</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#00e5be] hover:bg-[#34f0cb] text-[#091519] font-extrabold text-sm transition-all shadow-[0_0_20px_rgba(0,229,190,0.35)] hover:scale-[1.02] active:scale-98 mt-2"
              >
                Submit Organizer Application
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#00e5be]/15 border border-[#00e5be] text-[#00e5be] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,229,190,0.3)]">
              <CheckCircle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h3 className="text-2xl font-extrabold text-white">
              Application Received!
            </h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              Thank you, {contactName}! Our Aventix Organizer Partnerships team in Manila
              will reach out to {email} within 24 hours.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-6 py-2.5 rounded-full bg-[#00e5be] text-[#091519] font-bold text-sm hover:bg-[#34f0cb] transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
