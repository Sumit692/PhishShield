import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  showBadge?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = true,
  showBadge = true,
  className = ''
}) => {
  const sizeClass = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;
  const textClass = size === 'sm' ? styles.textSm : size === 'lg' ? styles.textLg : styles.textMd;

  return (
    <div className={`${styles.logoLink} ${className}`}>
      {/* High-Tech Faceted Shield Emblem */}
      <div className={`${styles.emblemWrapper} ${sizeClass}`} aria-hidden="true">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer metallic gradient */}
            <linearGradient id="shieldGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Inner check / core glow gradient */}
            <linearGradient id="coreGrad" x1="10" y1="12" x2="22" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#A7F3D0" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#10B981" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Outer Armored Shield Boundary */}
          <path
            d="M16 3.5L25 7.5V15C25 21.2 21.2 25.8 16 28.5C10.8 25.8 7 21.2 7 15V7.5L16 3.5Z"
            fill="url(#shieldGrad)"
            fillOpacity="0.25"
            stroke="url(#shieldGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Secondary Inner Geometric Contour */}
          <path
            d="M16 6.5L22.5 9.8V14.8C22.5 19.4 19.6 23.2 16 25.4C12.4 23.2 9.5 19.4 9.5 14.8V9.8L16 6.5Z"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Center Cyber Defense Check / Armor Core */}
          <path
            d="M12.5 15.5L15 18L20 12"
            stroke="url(#coreGrad)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Radar Beacon Point at Crest */}
          <circle cx="16" cy="3.5" r="1.5" fill="#34D399" />
        </svg>
      </div>

      {/* Typography and Tagline */}
      <div className={styles.brandColumn}>
        <div className={styles.brandHeadingRow}>
          <div className={`${styles.brandWordmark} ${textClass}`}>
            <span className={styles.brandPrefix}>Phish</span>
            <span className={styles.brandGradient}>Shield</span>
          </div>

          {showBadge && (
            <span className={styles.radarPill}>
              <span className={styles.liveDot} />
              <span>AI Radar</span>
            </span>
          )}
        </div>

        {showTagline && (
          <span className={styles.tagline}>
            Autonomous Threat Defense
          </span>
        )}
      </div>
    </div>
  );
};
