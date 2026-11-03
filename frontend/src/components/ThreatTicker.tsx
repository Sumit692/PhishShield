import React from 'react';
import { Shield } from 'lucide-react';
import styles from './ThreatTicker.module.css';

interface TickerThreat {
  url: string;
  status: 'safe' | 'suspicious' | 'danger';
  label: string;
  score: number;
}

const LIVE_THREATS: TickerThreat[] = [
  { url: 'chase.com.fraud-alert.co', status: 'danger', label: 'Brand Spoofing', score: 94 },
  { url: 'mit.edu/education', status: 'safe', label: 'Safe', score: 5 },
  { url: '192.168.1.105:8080/paypal.com', status: 'danger', label: 'IP Credential Trap', score: 96 },
  { url: 'github.com/security', status: 'safe', label: 'Verified', score: 6 },
  { url: 'xn--pypal-4ve.com/verify', status: 'danger', label: 'Cyrillic Homograph', score: 88 },
  { url: 'developer.mozilla.org', status: 'safe', label: 'Standard TLD', score: 8 },
  { url: 'secure-login-portal.net:8443', status: 'suspicious', label: 'Unusual Port', score: 52 },
  { url: 'netflix.com@billing-auth.xyz', status: 'danger', label: '@ Symbol Trick', score: 92 },
  { url: 'wikipedia.org/wiki/Phishing', status: 'safe', label: 'Safe', score: 5 },
  { url: 'microsoft-mfa-security.info', status: 'danger', label: 'MFA Harvesting', score: 91 },
];

export const ThreatTicker: React.FC = () => {
  // Duplicate list to achieve a seamless infinite loop
  const marqueeItems = [...LIVE_THREATS, ...LIVE_THREATS];

  return (
    <div className={styles.tickerContainer} aria-label="Real-time threat intelligence ticker">
      <div className={styles.radarBadge}>
        <div className={styles.pulsingDot} />
        <Shield size={12} style={{ marginRight: 2 }} />
        <span>Live Radar</span>
      </div>

      <div className={styles.marqueeTrack}>
        {marqueeItems.map((item, idx) => (
          <React.Fragment key={idx}>
            <div className={styles.tickerItem}>
              <span className={styles.itemUrl}>{item.url}</span>
              <span
                className={`${styles.scorePill} ${
                  item.status === 'danger'
                    ? styles.pillDanger
                    : item.status === 'suspicious'
                    ? styles.pillSuspicious
                    : styles.pillSafe
                }`}
              >
                {item.label} • {item.score}/100
              </span>
            </div>
            <span className={styles.separator}>•</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
export default ThreatTicker;
