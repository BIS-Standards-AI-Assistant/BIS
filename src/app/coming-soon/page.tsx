"use client";

import Link from "next/link";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";

export default function ComingSoon() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <NavBar />
      
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center p-8 md:p-10 rounded-2xl border border-border bg-surface-raised shadow-sm">
          {/* Official BIS Logo SVG with standard mark and Sanskrit Motto */}
          <div className="flex justify-center mb-6">
            <svg
              viewBox="0 0 450 350"
              className="w-44 h-36 md:w-52 md:h-44 shrink-0 drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Blue Logo Triangle */}
              <path
                d="M225,18 L382,236 C397,257 382,286 356,286 L265,286 L225,246 L185,286 L94,286 C68,286 53,257 68,236 L225,18 Z"
                fill="#1e5cb3"
              />
              
              {/* Inner White Triangle Cutout */}
              <path
                d="M225,90 L305,210 C315,225 305,246 287,246 L163,246 C145,246 135,225 145,210 L225,90 Z"
                fill="#ffffff"
              />
              
              {/* Central Red Circular Dot */}
              <circle cx="225" cy="175" r="28" fill="#e22e2e" />
              
              {/* Motto: मानकः पथप्रदर्शकः */}
              <text
                x="225"
                y="318"
                fill="#e22e2e"
                fontFamily="'Noto Sans Devanagari', 'Kokila', 'Arial', sans-serif"
                fontSize="26"
                fontWeight="bold"
                textAnchor="middle"
                letterSpacing="1"
              >
                मानकः पथप्रदर्शकः
              </text>
              
              {/* Lower Blue Wing Arch */}
              <path
                d="M20,300 C100,350 350,350 430,300 C390,320 260,335 225,335 C190,335 60,320 20,300 Z"
                fill="#1e5cb3"
              />
            </svg>
          </div>

          <span className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider uppercase bg-orange/10 text-orange dark:bg-orange/20 rounded-full mb-4">
            Under Development / विकास के अधीन
          </span>

          <h1 className="text-2xl font-extrabold tracking-tight text-navy dark:text-navy mb-2">
            Coming Soon
          </h1>
          <h2 className="text-xl font-bold text-navy-deep dark:text-navy opacity-90 mb-4">
            शीघ्र आ रहा है
          </h2>

          <div className="space-y-3 mb-8 text-[14px] leading-relaxed text-ink-soft">
            <p>
              This service is currently under development. Our AI-assisted portal will soon connect you to this direct BIS feature. Thank you for your patience.
            </p>
            <p className="border-t border-border pt-3 text-[13.5px] font-medium italic">
              यह सेवा वर्तमान में विकास के अधीन है। हमारा एआई-असिस्टेड पोर्टल जल्द ही आपको इस डायरेक्ट बीआईएस सेवा से जोड़ेगा। आपके धैर्य के लिए धन्यवाद।
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 text-[14px] font-bold text-white bg-blue hover:bg-navy-deep rounded-xl shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            ← Return to Dashboard / वापस जाएं
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
