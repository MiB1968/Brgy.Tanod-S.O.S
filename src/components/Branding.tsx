import React from 'react';
import { cn } from '../lib/utils';

/* ── LOGO SVG COMPONENT ───────────────────────────────────── */
export function TanodLogo({ size = 200, animated = true, className, useImage = false }: { size?: number, animated?: boolean, className?: string, useImage?: boolean }) {
  const [imgError, setImgError] = React.useState(false);
  const logoUrl = '/logo.svg';

  if (useImage && !imgError) {
    return (
      <div className={cn("relative overflow-hidden", className)} style={{ width: size, height: size }}>
        <img 
          src={logoUrl} 
          alt="Official Logo" 
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const grid = React.useMemo(() => (
    <g clipPath="url(#shieldShape)" opacity="0.15">
      {[...Array(15)].map((_, r) => (
        [...Array(15)].map((_, c) => (
          <path key={`${r}-${c}`} d={`M${c * 36 + (r % 2 ? 18 : 0)} ${r * 32} l18 0 l9 15 l-9 15 l-18 0 l-9 -15 z`} fill="none" stroke="#ef4444" strokeWidth="0.5" />
        ))
      ))}
    </g>
  ), []);

  return (
    <svg width={size} height={size} viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="logoBackground" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e1e2e" />
          <stop offset="100%" stopColor="#0a0a0f" />
        </radialGradient>
        <linearGradient id="shieldBorder" x1="0" y1="0" x2="400" y2="460">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="crimsonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <clipPath id="shieldShape">
          <path d="M200 10 L380 60 L380 280 C380 380 200 450 200 450 C200 450 20 380 20 280 L20 60 L200 10Z" />
        </clipPath>
      </defs>

      {/* Extreme Depth Shadow */}
      <path d="M200 30 L390 80 L390 300 C390 400 200 470 200 470 C200 470 10 400 10 300 L10 80 L200 30Z" fill="black" opacity="0.6" filter="blur(12px)" />

      {/* Outer Tactical Frame */}
      <path d="M200 5 L390 60 L390 285 C390 390 200 455 200 455 C200 455 10 390 10 285 L10 60 L200 5Z" fill="#0f172a" stroke="#ffffff10" strokeWidth="2" />

      {/* Main Shield Body */}
      <path d="M200 10 L380 60 L380 280 C380 380 200 450 200 450 C200 450 20 380 20 280 L20 60 L200 10Z" fill="url(#logoBackground)" stroke="url(#shieldBorder)" strokeWidth="8" />

      {/* Tactical Hex Grid */}
      {grid}

      {/* Philippine Sun & Stars (High Detail) */}
      <g transform="translate(200, 95)" opacity="0.9">
        <circle r="25" fill="#fbbf24" filter="url(#emeraldGlow)" />
        <circle r="22" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
        {[...Array(8)].map((_, i) => (
          <path key={i} d="M0 -36 L6 -26 L-6 -26 Z" fill="#fbbf24" transform={`rotate(${i * 45})`} />
        ))}
        {/* Stars */}
        <g fill="#f59e0b">
           <path d="M0 -75 l6 18 l20 0 l-16 12 l6 18 l-16 -12 l-16 12 l6 -18 l-16 -12 l20 0 z" transform="scale(0.3) translate(0, -20)" />
           <path d="M0 -75 l6 18 l20 0 l-16 12 l6 18 l-16 -12 l-16 12 l6 -18 l-16 -12 l20 0 z" transform="scale(0.3) translate(-120, 60) rotate(-30)" />
           <path d="M0 -75 l6 18 l20 0 l-16 12 l6 18 l-16 -12 l-16 12 l6 -18 l-16 -12 l20 0 z" transform="scale(0.3) translate(120, 60) rotate(30)" />
        </g>
      </g>

      {/* CENTRAL BRANDING */}
      <g filter="url(#crimsonGlow)">
        <text x="200" y="185" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="900" fontSize="24" fill="#94a3b8" letterSpacing="8" opacity="0.8">BRGY.</text>
        <text x="200" y="255" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="900" fontSize="82" fill="white" style={{ letterSpacing: '-2px' }}>TANOD</text>
        <text x="200" y="325" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="900" fontSize="104" fill="#ef4444" style={{ letterSpacing: '-4px' }}>S.O.S.</text>
      </g>

      {/* STATUS INDICATORS */}
      <rect x="140" y="345" width="120" height="4" rx="2" fill="#ffffff10" />
      <rect x="180" y="345" width="40" height="4" rx="2" fill="#ef4444">
        <animate attributeName="x" from="140" to="220" dur="2s" repeatCount="indefinite" />
      </rect>

      {/* BOTTOM ASSETS */}
      <g transform="translate(85, 385)">
        {/* Secure Shield */}
        <path d="M30 4 L55 12 L55 35 C55 50 30 60 30 60 C30 60 5 50 5 35 L5 12 Z" fill="#3b82f620" stroke="#3b82f6" strokeWidth="2" />
        <path d="M30 18 l4 10 l12 0-8 6 4 10-8-6-8 6 4-10-8-6 12 0z" fill="#3b82f6" transform="scale(0.4) translate(45, 45)" />

        {/* Transmission Tower */}
        <g transform="translate(100, 0)">
          <path d="M30 10 L15 55 L45 55 Z" stroke="#ef4444" strokeWidth="2.5" fill="none" />
          <circle cx="30" cy="10" r="4" fill="#ef4444">
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
          </circle>
          <path d="M20 20 Q5 20 5 5" stroke="#ef444450" strokeWidth="2" fill="none" />
          <path d="M40 20 Q55 20 55 5" stroke="#ef444450" strokeWidth="2" fill="none" />
        </g>
      </g>

      {/* Cyberpunk Scanline */}
      {animated && (
        <g>
          <rect x="20" y="0" width="360" height="2" fill="url(#scanGradient)" opacity="0.6">
            <animateTransform attributeName="transform" type="translate" from="0 60" to="0 390" dur="3s" repeatCount="indefinite" />
          </rect>
          <defs>
            <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </g>
      )}
    </svg>
  );
}

/* ── FULL WORDMARK COMPONENT ──────────────────────────────── */
export function TanodWordmark({ width, className, size = 'md' }: { width?: number, className?: string, size?: 'sm' | 'md' | 'lg' }) {
  const isSm = size === 'sm';
  const logoSize = isSm ? 50 : (size === 'lg' ? 120 : 80);
  
  return (
    <div className={cn("flex items-center", isSm ? "gap-2" : "gap-6", className)} style={width ? { width } : undefined}>
      <div className="relative shrink-0">
        <TanodLogo size={logoSize} animated={false} />
        <div className={cn("absolute -inset-2 bg-emergency/10 blur-2xl rounded-full -z-10", isSm ? "opacity-30" : "opacity-100")} />
      </div>
      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-mono font-black text-white/40 uppercase tracking-[0.2em]", isSm ? "text-[8px]" : "text-[12px]")}>BRGY DISTRICT</span>
          {!isSm && <div className="h-0.5 w-8 bg-emergency/20" />}
          <span className={cn("px-1.5 py-0.5 rounded bg-brand-red font-black text-white uppercase tracking-[0.1em] shadow-glow-red", isSm ? "text-[7px]" : "text-[10px]")}>S.O.S.</span>
        </div>
        <h1 className={cn(
          "font-black italic text-white tracking-tighter uppercase font-mono leading-[0.9] mt-0.5 group select-none",
          isSm ? "text-xl xs:text-2xl" : "text-5xl"
        )}>
          TANOD<span className="text-brand-red group-hover:text-emergency transition-all duration-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">NET</span>
        </h1>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className={cn("rounded-full bg-success animate-pulse", isSm ? "w-1 h-1" : "w-1.5 h-1.5")} />
          <p className={cn("font-mono text-white/30 uppercase tracking-[0.15em] font-black", isSm ? "text-[7px]" : "text-[10px]")}>ACTIVE INTEL GRID</p>
        </div>
      </div>
    </div>
  );
}

/* ── BACKGROUND SVG PATTERN ───────────────────────────────── */
export function BackgroundPattern() {
  const HEX_SIZE = 28;
  const cols = 30, rows = 22;
  
  const hexPoints = (cx: number, cy: number, r: number) => {
    return [...Array(6)].map((_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
  };

  const hexagons = React.useMemo(() => {
    const hexs = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * HEX_SIZE * 1.73 + (row % 2 === 0 ? 0 : HEX_SIZE * 0.866);
        const y = row * HEX_SIZE * 1.5;
        const distFromCenter = Math.hypot(x - 760, y - 430) / 600;
        const opacity = Math.max(0.01, 0.07 - distFromCenter * 0.06);
        hexs.push({ x, y, opacity, id: `${row}-${col}`, points: hexPoints(x, y, HEX_SIZE * 0.9) });
      }
    }
    return hexs;
  }, []);

  const horizontalLines = React.useMemo(() => [...Array(43)].map((_, i) => i * 20), []);
  const verticalLines = React.useMemo(() => [...Array(77)].map((_, i) => i * 20), []);

  return (
    <svg width="100%" height="100%" viewBox="0 0 1520 860"
      xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 pointer-events-none">
      <defs>
        <radialGradient id="bgGlowCenter" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef444408" />
          <stop offset="60%" stopColor="#ef444403" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="bgGlowTopLeft" cx="0%" cy="0%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f18" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="bgGlowBottomRight" cx="100%" cy="100%" r="50%">
          <stop offset="0%" stopColor="#7f1d1d12" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="bgBlur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Base glow layers */}
      <rect width="1520" height="860" fill="url(#bgGlowCenter)" />
      <rect width="1520" height="860" fill="url(#bgGlowTopLeft)" />
      <rect width="1520" height="860" fill="url(#bgGlowBottomRight)" />

      {/* Hex grid */}
      <g>
        {hexagons.map(h => (
          <polygon key={h.id}
            points={h.points}
            fill="none"
            stroke="#ef4444"
            strokeWidth="0.5"
            opacity={h.opacity}
          />
        ))}
      </g>

      {/* Horizontal scan lines */}
      <g>
        {horizontalLines.map((y, i) => (
          <line key={`h${i}`}
            x1="0" y1={y} x2="1520" y2={y}
            stroke="#3b82f6" strokeWidth="0.3" opacity="0.025" />
        ))}
      </g>

      {/* Vertical scan lines */}
      <g>
        {verticalLines.map((x, i) => (
          <line key={`v${i}`}
            x1={x} y1="0" x2={x} y2="860"
            stroke="#3b82f6" strokeWidth="0.3" opacity="0.018" />
        ))}
      </g>

      {/* Radar rings */}
      {[120, 220, 320, 440, 580].map((r, i) => (
        <circle key={`ring${i}`}
          cx="760" cy="430" r={r}
          fill="none" stroke="#ef4444"
          strokeWidth="0.6"
          opacity={0.06 - i * 0.01}
          strokeDasharray={i % 2 === 0 ? "none" : "4 8"}
        />
      ))}

      {/* Cross-hairs */}
      <line x1="760" y1="290" x2="760" y2="570" stroke="#ef4444" strokeWidth="0.8" opacity="0.08" />
      <line x1="620" y1="430" x2="900" y2="430" stroke="#ef4444" strokeWidth="0.8" opacity="0.08" />

      {/* Corner bracket decorations */}
      {/* TL */}
      <path d="M20 20 L20 60 L60 60" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.25" />
      <path d="M20 20 L60 20" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.25" />
      {/* TR */}
      <path d="M1500 20 L1500 60 L1460 60" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.25" />
      <path d="M1500 20 L1460 20" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.25" />
      {/* BL */}
      <path d="M20 840 L20 800 L60 800" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.25" />
      <path d="M20 840 L60 840" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.25" />
      {/* BR */}
      <path d="M1500 840 L1500 800 L1460 800" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.25" />
      <path d="M1500 840 L1460 840" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.25" />

      {/* Circuit paths */}
      <path d="M0 200 L200 200 L220 220 L400 220 L420 200 L600 200"
        stroke="#ef4444" strokeWidth="0.8" opacity="0.06" fill="none" />
      <path d="M0 660 L180 660 L200 640 L380 640 L400 660 L560 660"
        stroke="#3b82f6" strokeWidth="0.8" opacity="0.06" fill="none" />
      <path d="M1100 0 L1100 160 L1120 180 L1120 320 L1100 340 L1100 500"
        stroke="#ef4444" strokeWidth="0.8" opacity="0.06" fill="none" />
    </svg>
  );
}

/* ── APP ICON COMPONENT ──────────────────────────────────── */
export function AppIcon({ size = 64, className }: { size?: number, className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center bg-[#0d0505] rounded-2xl border border-brand-red/20 overflow-hidden shadow-lg", className)} style={{ width: size, height: size }}>
      <TanodLogo size={size * 0.8} animated={false} />
    </div>
  );
}
