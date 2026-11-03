import React, { useMemo } from 'react';
import { Eye, ShieldAlert } from 'lucide-react';
import styles from './UrlDissector.module.css';

interface UrlDissectorProps {
  url: string;
}

const BRAND_KEYWORDS = ['paypal', 'chase', 'netflix', 'apple', 'microsoft', 'google', 'amazon', 'bank', 'login', 'account'];

export const UrlDissector: React.FC<UrlDissectorProps> = ({ url }) => {
  const parsed = useMemo(() => {
    const raw = url.trim();
    if (!raw || raw.length < 4) return null;

    let scheme = '';
    let rest = raw;

    if (raw.includes('://')) {
      const parts = raw.split('://');
      scheme = parts[0].toLowerCase() + '://';
      rest = parts.slice(1).join('://');
    }

    // Check for @ credential injection trick
    let authInfo = '';
    if (rest.includes('@')) {
      const atParts = rest.split('@');
      authInfo = atParts[0] + '@';
      rest = atParts.slice(1).join('@');
    }

    // Split host and path
    let hostAndPort = rest;
    let pathAndQuery = '';

    const slashIdx = rest.indexOf('/');
    const questionIdx = rest.indexOf('?');
    let splitIdx = -1;

    if (slashIdx !== -1 && questionIdx !== -1) {
      splitIdx = Math.min(slashIdx, questionIdx);
    } else if (slashIdx !== -1) {
      splitIdx = slashIdx;
    } else if (questionIdx !== -1) {
      splitIdx = questionIdx;
    }

    if (splitIdx !== -1) {
      hostAndPort = rest.substring(0, splitIdx);
      pathAndQuery = rest.substring(splitIdx);
    }

    // Split host and port
    let host = hostAndPort;
    let port = '';
    if (hostAndPort.includes(':') && !hostAndPort.startsWith('[')) {
      const portParts = hostAndPort.split(':');
      host = portParts[0];
      port = ':' + portParts[1];
    }

    // Check if host is raw IP
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

    // Split host into subdomain and root domain
    let subdomain = '';
    let rootDomain = host;
    const hostParts = host.split('.');

    if (hostParts.length > 2 && !isIp) {
      subdomain = hostParts.slice(0, hostParts.length - 2).join('.');
      rootDomain = hostParts.slice(hostParts.length - 2).join('.');
    }

    // Detect anomalies
    const isPunycode = host.toLowerCase().includes('xn--');
    const brandInSubdomain = BRAND_KEYWORDS.find(b => subdomain.toLowerCase().includes(b));
    const isNonStandardPort = Boolean(port && port !== ':80' && port !== ':443');
    const isHttp = scheme.toLowerCase().startsWith('http://');

    return {
      scheme: scheme || 'https:// (implied)',
      authInfo,
      subdomain,
      rootDomain,
      port,
      path: pathAndQuery,
      isIp,
      isPunycode,
      brandInSubdomain,
      isNonStandardPort,
      isHttp
    };
  }, [url]);

  if (!parsed || (!parsed.subdomain && !parsed.rootDomain)) {
    return null;
  }

  const criticalFindings: string[] = [];
  if (parsed.isIp) criticalFindings.push('Raw numeric IP host instead of verified registered domain');
  if (parsed.brandInSubdomain) criticalFindings.push(`Brand trick: '${parsed.brandInSubdomain}' placed in subdomain to mislead human eyes`);
  if (parsed.isPunycode) criticalFindings.push('Internationalized Punycode homograph characters detected');
  if (parsed.authInfo) criticalFindings.push("Credential deception: '@' symbol tricks reader into believing preceding text is the host");

  return (
    <div className={styles.dissectorContainer}>
      <div className={styles.headerRow}>
        <span className={styles.headerTitle}>
          <Eye size={13} />
          Real-Time URL Anatomy Dissection
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Evaluated as you type
        </span>
      </div>

      <div className={styles.segmentsTrack}>
        {/* Scheme */}
        <div className={`${styles.segment} ${parsed.isHttp ? styles.toneWarning : styles.toneSafe}`}>
          <span className={styles.segmentLabel}>Protocol</span>
          <span className={styles.segmentValue}>{parsed.scheme}</span>
        </div>

        {/* Auth trick */}
        {parsed.authInfo && (
          <div className={`${styles.segment} ${styles.toneDanger}`}>
            <span className={styles.segmentLabel}>Deceptive Trap</span>
            <span className={styles.segmentValue}>{parsed.authInfo}</span>
          </div>
        )}

        {/* Subdomain */}
        {parsed.subdomain && (
          <div className={`${styles.segment} ${parsed.brandInSubdomain ? styles.toneDanger : styles.toneNeutral}`}>
            <span className={styles.segmentLabel}>
              {parsed.brandInSubdomain ? '⚠️ Spoofed Subdomain' : 'Subdomain'}
            </span>
            <span className={styles.segmentValue}>{parsed.subdomain}.</span>
          </div>
        )}

        {/* Root Domain */}
        <div className={`${styles.segment} ${parsed.isIp || parsed.isPunycode ? styles.toneDanger : styles.toneSafe}`}>
          <span className={styles.segmentLabel}>
            {parsed.isIp ? '🚨 Raw IP Host' : (parsed.isPunycode ? '🚨 Punycode Host' : 'Target Host')}
          </span>
          <span className={styles.segmentValue}>{parsed.rootDomain}</span>
        </div>

        {/* Port */}
        {parsed.port && (
          <div className={`${styles.segment} ${parsed.isNonStandardPort ? styles.toneWarning : styles.toneNeutral}`}>
            <span className={styles.segmentLabel}>Port</span>
            <span className={styles.segmentValue}>{parsed.port}</span>
          </div>
        )}

        {/* Path */}
        {parsed.path && (
          <div className={`${styles.segment} ${styles.toneNeutral}`}>
            <span className={styles.segmentLabel}>Path & Query</span>
            <span className={styles.segmentValue}>
              {parsed.path.length > 36 ? parsed.path.substring(0, 36) + '...' : parsed.path}
            </span>
          </div>
        )}
      </div>

      {criticalFindings.length > 0 && (
        <div className={styles.findingNotice}>
          <ShieldAlert size={14} style={{ flexShrink: 0 }} />
          <span>{criticalFindings.join(' • ')}</span>
        </div>
      )}
    </div>
  );
};
export default UrlDissector;
