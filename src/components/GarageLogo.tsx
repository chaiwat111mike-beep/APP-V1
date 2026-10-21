import React from 'react';
import { Phone, Wrench, Shield, Zap } from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import garageBannerLogo from '../assets/images/garage_songkarn_logo_1787187586075.jpg';
import garageEmblemLogo from '../assets/images/garage_emblem_logo_1787187601091.jpg';

interface GarageLogoProps {
  variant?: 'header' | 'banner' | 'print' | 'sidebar' | 'card';
  className?: string;
  showPhone?: boolean;
}

export const GarageLogo: React.FC<GarageLogoProps> = ({
  variant = 'header',
  className = '',
  showPhone = true,
}) => {
  const { garageProfile } = useGarage();

  const phone = garageProfile.mechanicPhone || garageProfile.phone || '061-069-2036';
  const mechanicName = garageProfile.mechanicName || 'ช่างไมค์';
  const activeLogoImage = garageProfile.logoImage || garageBannerLogo;

  // 1. HEADER VARIANT (Top navigation bar)
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        {/* Real Logo Image Banner & Emblem */}
        <div className="relative group flex items-center">
          <div className="h-10 sm:h-11 rounded-xl overflow-hidden border border-yellow-500/40 shadow-lg shadow-yellow-500/10 bg-[#0F1113] flex items-center">
            <img
              src={activeLogoImage}
              alt="อู่สงกรานต์ 061-069-2036 ช่างไมค์"
              referrerPolicy="no-referrer"
              className="h-full w-auto max-w-[180px] sm:max-w-[240px] object-cover object-left"
            />
          </div>
        </div>

        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base lg:text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 font-sans italic">
              อู่สงกรานต์
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 uppercase tracking-wide">
              {mechanicName}
            </span>
          </div>
          {showPhone && (
            <div className="flex items-center gap-1 text-[11px] text-yellow-400/90 font-mono font-bold -mt-0.5">
              <Phone className="w-3 h-3 text-yellow-400 shrink-0" />
              <span>{phone}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. SIDEBAR VARIANT
  if (variant === 'sidebar') {
    return (
      <div className={`p-3.5 bg-gradient-to-br from-[#1A1D21] via-[#14171A] to-[#0D0F11] border border-yellow-500/25 rounded-2xl relative overflow-hidden shadow-xl ${className}`}>
        {/* Ambient racing glow */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-yellow-500/10 rounded-full blur-xl pointer-events-none"></div>
        
        <div className="flex flex-col gap-2.5">
          <div className="w-full h-16 rounded-xl overflow-hidden border border-yellow-500/30 bg-[#0F1113] shadow-inner">
            <img
              src={activeLogoImage}
              alt="อู่สงกรานต์"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
          </div>
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="font-black text-sm text-yellow-400 italic tracking-tight">
                อู่สงกรานต์ ({mechanicName})
              </h2>
              <p className="text-[11px] text-gray-300 font-mono font-bold flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-yellow-400 shrink-0" />
                <span>{phone}</span>
              </p>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-extrabold border border-emerald-500/30 uppercase tracking-wider">
              V2.0 LIVE
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. PRINT DOCUMENT VARIANT (Pure high-contrast styling for invoices, quotes, and work orders)
  if (variant === 'print') {
    return (
      <div className={`flex items-center gap-3 border-r-2 border-black pr-5 ${className}`}>
        <div className="h-14 max-w-[160px] rounded-lg overflow-hidden border-2 border-black bg-white flex items-center justify-center p-0.5">
          <img
            src={activeLogoImage}
            alt="โลโก้อู่สงกรานต์"
            referrerPolicy="no-referrer"
            className="h-full w-auto object-contain"
          />
        </div>
        <div>
          <div className="text-lg font-black text-black tracking-tight flex items-center gap-2">
            <span>อู่สงกรานต์</span>
            <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-black border border-black">
              {mechanicName}
            </span>
          </div>
          <div className="text-xs font-bold text-black font-mono mt-0.5">
            โทร: {phone}
          </div>
          <div className="text-[11px] font-bold text-black">
            LINE: {garageProfile.lineId || 'chaiwatmike'}
          </div>
        </div>
      </div>
    );
  }

  // 4. FULL HERO BANNER VARIANT (For Dashboard, Settings, or Hero Showcase)
  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-yellow-500/40 bg-[#0F1113] shadow-2xl ${className}`}
    >
      {/* Real Full-Width Banner Image */}
      <div className="relative w-full aspect-[21/9] sm:aspect-[24/8] max-h-72 overflow-hidden bg-black flex items-center justify-center">
        <img
          src={activeLogoImage}
          alt="แบนเนอร์อู่สงกรานต์ 061-069-2036 ช่างไมค์"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
        
        {/* Subtle Gradient Overlay at bottom for seamless interaction */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"></div>

        {/* Quick Contact Floater Bar over Banner */}
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-6 sm:right-6 flex flex-wrap items-center justify-between gap-2.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-yellow-500/40 text-yellow-400 font-black text-xs sm:text-sm font-mono flex items-center gap-1.5 shadow-lg">
              <Phone className="w-3.5 h-3.5" />
              <span>{phone} ({mechanicName})</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${phone.replace(/-/g, '')}`}
              className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>โทรด่วน</span>
            </a>
            <a
              href={garageProfile.lineDirectUrl || 'https://line.me/ti/p/~chaiwatmike'}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1"
            >
              <span>LINE: {garageProfile.lineId || 'chaiwatmike'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
