import React, { useState } from 'react';
import honLogo from '../assets/hon-logo.svg';
import { WaitlistSignup } from './WaitlistSignup';

/**
 * Mobile-first waitlist page that mirrors the Figma frame "Waitlist-m".
 * - Dark background with top/bottom accent bands
 * - Reasons list with check icons
 * - Primary CTA that reveals the embedded waitlist signup form
 */
export default function MobileWaitlist() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="bg-[#070a0d] min-h-screen w-full text-white flex justify-center">
      <div className="relative w-full max-w-[393px] min-h-screen px-6 pt-[107px] pb-[92px]">
        {/* Top accent band */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 top-0 w-[393px] h-[107px]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #9e7bff 0, #9e7bff 3px, transparent 3px, transparent 9px)',
            maskImage: 'linear-gradient(to bottom, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)'
          }}
        />

        {/* Logo */}
        <div className="w-full flex items-center justify-center mb-8">
          <img src={honLogo} alt="Hon" className="h-9" />
        </div>

        {/* Headline & subhead */}
        <div className="space-y-2.5 mb-10">
          <h1 className="text-white text-3xl font-light font-['Inter'] leading-normal">
            The voice-to-voice creative platform built for creators — Hon is best experienced on desktop.
          </h1>
          <p className="text-white text-xl font-normal font-['Inter']">Mobile optimization coming soon.</p>
        </div>

        {/* Reasons list */}
        <div className="space-y-3.5 mb-10">
          <p className="text-white text-xl font-normal font-['Inter'] leading-loose">Reasons to create with Hon:</p>
          <ul className="space-y-2">
            {[
              'All the best models to fuel your creativity',
              'Monetize your prompt library',
              'Earn crypto support from your community',
              'Collaborate with Hon or other creatives'
            ].map((reason) => (
              <li key={reason} className="flex items-start gap-2.5">
                <span className="mt-[2px] inline-block h-[18px] w-[11px]">
                  <svg viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                    <path d="M1 9l3 3 7-7" stroke="#6f00ff" strokeWidth="2" fill="none" />
                  </svg>
                </span>
                <span className="text-white text-base font-normal font-['Inter'] leading-normal">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA or Form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full h-[50px] bg-white text-zinc-950 rounded-[106px] font-['Inter'] font-bold text-base leading-normal border-2 border-[#6f00ff] relative"
          >
            Join the waitlist
          </button>
        ) : (
          <div className="mt-2">
            <WaitlistSignup onSuccess={() => {}} />
          </div>
        )}

        {/* Bottom accent band */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[393px] h-[92px]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #9e7bff 0, #9e7bff 3px, transparent 3px, transparent 9px)',
            maskImage: 'linear-gradient(to top, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent)'
          }}
        />
        {/* Footer intentionally removed for mobile landing */}
      </div>
    </div>
  );
}


