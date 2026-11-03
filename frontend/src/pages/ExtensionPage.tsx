import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Lock,
  Layers
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api } from '../services/api';
import type { AnalysisResult } from '../types';
import { Button, CopyButton } from '../components/arc';
import styles from './ExtensionPage.module.css';
import quishingStyles from './QuishingPage.module.css';

const EXTENSION_PATH = 'c:\\Users\\raj\\Downloads\\phishshield-project\\extension';

const SIMULATOR_TARGETS = [
  {
    name: 'Fraudulent Chase Portal',
    url: 'https://chase.com.fraud-prevention-alert.co/verify-identity?acc=98214',
  },
  {
    name: 'Raw IP Credential Harvester',
    url: 'http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login-run',
  },
  {
    name: 'Authentic MDN Docs',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview',
  }
];

export const ExtensionPage: React.FC = () => {
  useDocumentTitle('PhishShield Chrome Extension');

  const [selectedUrl, setSelectedUrl] = useState(SIMULATOR_TARGETS[0].url);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [shieldActive, setShieldActive] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.analysis.analyze(selectedUrl)
      .then((data) => setAnalysis(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedUrl]);

  return (
    <div className={styles.pageWrapper}>
      <div className="container">
        {/* Navigation Tabs between Tools */}
        <div className={quishingStyles.toolsNav}>
          <Link to="/analyze" className={quishingStyles.toolTab}>
            Inspect URL
          </Link>
          <Link to="/quishing" className={quishingStyles.toolTab}>
            Quishing Scanner (QR)
          </Link>
          <Link to="/email-inspector" className={quishingStyles.toolTab}>
            Email & SMS Inspector
          </Link>
          <Link to="/arena" className={quishingStyles.toolTab}>
            Spot the Phish Arena 🎮
          </Link>
          <Link to="/extension" className={`${quishingStyles.toolTab} ${quishingStyles.toolTabActive}`}>
            <Globe size={15} />
            Browser Extension
          </Link>
        </div>

        <header className={styles.pageHeader}>
          <div className={styles.badgePill}>
            <Globe size={13} />
            <span>Manifest V3 Real-Time Protection</span>
          </div>
          <h1 className={styles.pageTitle}>PhishShield for Chrome & Brave</h1>
          <p className={styles.pageSubtitle}>
            Bring the machine-learning threat engine directly into your daily web browsing.
            PhishShield automatically checks navigation destinations and alerts you before credentials can be stolen.
          </p>
        </header>

        <div className={styles.mainGrid}>
          {/* Left Column: Live Interactive Extension Simulator */}
          <div className={styles.simulatorCard}>
            <div className={styles.simulatorHeader}>
              <span className={styles.simulatorTitle}>Live Extension Simulator</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Interactive Preview
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Simulate Browsing to Site:
              </label>
              <select
                value={selectedUrl}
                onChange={(e) => setSelectedUrl(e.target.value)}
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)'
                }}
              >
                {SIMULATOR_TARGETS.map((t) => (
                  <option key={t.url} value={t.url}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Browser Popup Mockup */}
            <div className={styles.browserMockup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', background: '#1B4332', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={14} color="#FFFFFF" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B4332' }}>PhishShield</div>
                    <div style={{ fontSize: '9px', color: '#6B7280' }}>Active Protection</div>
                  </div>
                </div>

                <div
                  onClick={() => setShieldActive(!shieldActive)}
                  style={{
                    width: '32px',
                    height: '18px',
                    background: shieldActive ? '#1B4332' : '#D1D5DB',
                    borderRadius: '20px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  title="Toggle Protection"
                >
                  <div style={{
                    width: '14px',
                    height: '14px',
                    background: '#FFFFFF',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: shieldActive ? '16px' : '2px',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '6px 10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Tab
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#111827' }}>
                  {selectedUrl}
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px', color: '#6B7280' }}>
                  Evaluating link with ML engine...
                </div>
              ) : analysis ? (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '10px'
                  }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'monospace', color: analysis.risk_score >= 60 ? '#EF4444' : (analysis.risk_score >= 30 ? '#F59E0B' : '#10B981') }}>
                        {analysis.risk_score}
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>/100</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B7280' }}>
                        {analysis.model_confidence}% ML Confidence
                      </div>
                    </div>

                    <div style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: analysis.risk_score >= 60 ? '#FEE2E2' : (analysis.risk_score >= 30 ? '#FEF3C7' : '#DCFCE7'),
                      color: analysis.risk_score >= 60 ? '#991B1B' : (analysis.risk_score >= 30 ? '#92400E' : '#166534')
                    }}>
                      {analysis.risk_level.toUpperCase()} RISK
                    </div>
                  </div>

                  <div style={{ fontSize: '10px', color: '#4B5563', lineHeight: '1.4', marginBottom: '10px' }}>
                    {analysis.summary}
                  </div>

                  <Link to={`/analyze?url=${encodeURIComponent(selectedUrl)}`}>
                    <Button variant="primary" size="sm" style={{ width: '100%', fontSize: '12px' }}>
                      Open Full Forensic Report ↗
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
              Communicates directly with your local Flask backend on port 5000.
            </div>
          </div>

          {/* Right Column: Step-by-Step Installation Guide & Architecture */}
          <div className={styles.guideCard}>
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                How to Load in Chrome / Brave in 15 Seconds
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                The extension is fully engineered and located directly inside this repository. You can load it instantly as an unpacked developer extension:
              </p>
            </div>

            <div className={styles.stepList}>
              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepBody}>
                  <div className={styles.stepTitle}>Open Browser Extension Manager</div>
                  <div className={styles.stepText}>
                    In Google Chrome or Brave, navigate to the extension settings URL:
                  </div>
                  <div className={styles.codePathBox}>
                    <span>chrome://extensions</span>
                    <CopyButton value="chrome://extensions" label="Copy" variant="plain" />
                  </div>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepBody}>
                  <div className={styles.stepTitle}>Toggle "Developer Mode"</div>
                  <div className={styles.stepText}>
                    Turn on the <strong>Developer mode</strong> switch in the upper-right corner of the page.
                  </div>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepBody}>
                  <div className={styles.stepTitle}>Click "Load unpacked" & Select Folder</div>
                  <div className={styles.stepText}>
                    Click the <strong>Load unpacked</strong> button and select this local directory:
                  </div>
                  <div className={styles.codePathBox}>
                    <span>{EXTENSION_PATH}</span>
                    <CopyButton value={EXTENSION_PATH} label="Copy Path" variant="outline" />
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Highlights */}
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                Extension Architecture & Technical Merits
              </h3>
              <div className={styles.featureGrid}>
                <div className={styles.featureCard}>
                  <div className={styles.featureTitle}>
                    <Zap size={16} color="var(--brand-dark)" />
                    Manifest V3 Worker
                  </div>
                  <div className={styles.featureDesc}>
                    Lightweight background service worker listens to tab updates with zero background battery drain.
                  </div>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureTitle}>
                    <ShieldAlert size={16} color="#ef4444" />
                    In-Page Interstitial
                  </div>
                  <div className={styles.featureDesc}>
                    Injects an emergency warning banner on high-risk sites, preventing users from typing passwords.
                  </div>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureTitle}>
                    <Lock size={16} color="var(--brand-dark)" />
                    100% Private & Local
                  </div>
                  <div className={styles.featureDesc}>
                    Zero data transmitted to external third-party ad networks or remote cloud telemetry.
                  </div>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureTitle}>
                    <Layers size={16} color="var(--brand-dark)" />
                    Dynamic Badge Icons
                  </div>
                  <div className={styles.featureDesc}>
                    Color-coded badges (Green, Amber, Red) give instant passive awareness on every visited tab.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ExtensionPage;
