import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Link2, Cpu, FileSearch, QrCode, Mail, Globe, Gamepad2, ArrowRight } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button, Input, Badge } from '../components/arc';
import { UrlDissector } from '../components/UrlDissector';
import styles from './LandingPage.module.css';

export const LandingPage: React.FC = () => {
  useDocumentTitle('PhishShield — Phishing URL & Website Detection');
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = url.trim();
    if (!clean) {
      setValidationError('Please enter a URL to inspect.');
      return;
    }
    setValidationError('');
    navigate(`/analyze?url=${encodeURIComponent(clean)}`);
  };

  const handleSampleClick = (sampleUrl: string) => {
    navigate(`/analyze?url=${encodeURIComponent(sampleUrl)}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={`container ${styles.heroContent}`}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
            <Badge tone="neutral" size="md" icon={<Shield size={14} />}>
              PhishShield Inspection Engine
            </Badge>

            <div
              onClick={() => navigate('/arena')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate('/arena');
              }}
            >
              <Gamepad2 size={14} />
              <span>EXHIBITION CHALLENGE: Spot the Phish Arena</span>
              <ArrowRight size={12} />
            </div>
          </div>

          <h1 id="hero-heading" className={styles.heading}>
            Know what is hiding behind a link.
          </h1>

          <p className={styles.subtext}>
            Check suspicious URLs for phishing indicators and see the signals behind
            the result before deciding whether to trust a link.
          </p>

          {/* Quick Analysis Input */}
          <div className={styles.inputCard}>
            <form onSubmit={handleSubmit} className={styles.inputForm}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <Input
                  label="URL to inspect for phishing"
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="Paste any link to analyze, e.g. https://example.com"
                  error={validationError}
                  className={styles.urlInput}
                />
              </div>
              <div style={{ marginTop: '24px' }}>
                <Button type="submit" variant="primary" size="md">
                  Analyze URL
                </Button>
              </div>
            </form>

            {/* Live Interactive URL Anatomy Dissector */}
            <UrlDissector url={url} />

            {/* Demonstration Sample Links */}
            <div className={styles.samplesBar}>
              <span>Try an exhibition sample:</span>
              <button
                type="button"
                className={styles.samplePill}
                onClick={() => {
                  setUrl('http://192.168.1.105:8080/paypal.com/webscr.php');
                  handleSampleClick('http://192.168.1.105:8080/paypal.com/webscr.php');
                }}
              >
                Raw IP Host Phish
              </button>
              <button
                type="button"
                className={styles.samplePill}
                onClick={() => {
                  setUrl('https://chase.com.fraud-prevention-alert.co/verify');
                  handleSampleClick('https://chase.com.fraud-prevention-alert.co/verify');
                }}
              >
                Brand Spoofing
              </button>
              <button
                type="button"
                className={styles.samplePill}
                onClick={() => {
                  setUrl('https://www.mit.edu/education');
                  handleSampleClick('https://www.mit.edu/education');
                }}
              >
                Benign Educational URL
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Explanations Section */}
      <section className={styles.section} aria-labelledby="features-heading">
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 id="features-heading" className={styles.sectionTitle}>
              Built for explainable threat inspection
            </h2>
            <p className={styles.sectionDesc}>
              Understand the specific lexical anomalies, domain tricks, and machine-learning
              features that distinguish legitimate services from credential harvesters.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <Link2 size={20} />
              </div>
              <h3 className={styles.featureTitle}>Lexical & Domain Analysis</h3>
              <p className={styles.featureText}>
                Scans for 25+ structural indicators including raw IP hosts, punycode homographs,
                unusual port numbers, sensitive login keywords, and brand spoofing in subdomains.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <Cpu size={20} />
              </div>
              <h3 className={styles.featureTitle}>Random Forest ML Pipeline</h3>
              <p className={styles.featureText}>
                Trained on balanced real-world threat feeds and verified top-tier domains.
                Yields statistical classification probabilities calibrated alongside deterministic rules.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <FileSearch size={20} />
              </div>
              <h3 className={styles.featureTitle}>Plain-Language Findings</h3>
              <p className={styles.featureText}>
                Translates machine-level characteristics into concise explanations and actionable
                security advice so everyday users know what steps to take.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Vector Threat Defense Suite */}
      <section className={styles.section} style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div style={{ display: 'inline-flex', marginBottom: 'var(--space-2)' }}>
              <Badge tone="warning" size="sm">
                Multi-Vector Defense Suite
              </Badge>
            </div>
            <h2 className={styles.sectionTitle}>
              Defend Against Modern Phishing Attack Vectors
            </h2>
            <p className={styles.sectionDesc}>
              Phishing has evolved beyond isolated URL strings. PhishShield protects users across QR codes,
              suspicious emails, smishing SMS text messages, and real-time browser navigation.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard} style={{ borderTop: '3px solid var(--brand-dark)' }}>
              <div className={styles.featureIcon}>
                <QrCode size={20} />
              </div>
              <h3 className={styles.featureTitle}>Quishing (QR Code) Scanner</h3>
              <p className={styles.featureText}>
                Decode digital screenshots or scan live webcam feeds to inspect physical flyer and email QR codes
                before opening them on mobile browsers.
              </p>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Button variant="secondary" size="sm" onClick={() => navigate('/quishing')}>
                  Open Quishing Scanner →
                </Button>
              </div>
            </div>

            <div className={styles.featureCard} style={{ borderTop: '3px solid #f59e0b' }}>
              <div className={styles.featureIcon}>
                <Mail size={20} />
              </div>
              <h3 className={styles.featureTitle}>Email & SMS Inspector</h3>
              <p className={styles.featureText}>
                Uncover urgency triggers, financial lures, and sender domain spoofing in text communications while
                simultaneously evaluating all embedded hyperlinks.
              </p>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Button variant="secondary" size="sm" onClick={() => navigate('/email-inspector')}>
                  Inspect Email / SMS →
                </Button>
              </div>
            </div>

            <div className={styles.featureCard} style={{ borderTop: '3px solid #3b82f6' }}>
              <div className={styles.featureIcon}>
                <Globe size={20} />
              </div>
              <h3 className={styles.featureTitle}>Chrome & Brave Extension</h3>
              <p className={styles.featureText}>
                Live browser defense running Manifest V3. Evaluates active navigation tabs in real time and injects
                an emergency safety banner on confirmed threats.
              </p>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Button variant="secondary" size="sm" onClick={() => navigate('/extension')}>
                  Get Browser Extension →
                </Button>
              </div>
            </div>

            <div className={styles.featureCard} style={{ borderTop: '3px solid #ef4444' }}>
              <div className={styles.featureIcon}>
                <Gamepad2 size={20} />
              </div>
              <h3 className={styles.featureTitle}>Spot the Phish Arena</h3>
              <p className={styles.featureText}>
                Interactive human-versus-AI security game. Test your intuition against real-world deceptive punycode,
                subdomains, and credential injection traps.
              </p>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Button variant="primary" size="sm" onClick={() => navigate('/arena')}>
                  Play Challenge Arena 🎮 →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section className={styles.section} aria-labelledby="how-it-works-heading">
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 id="how-it-works-heading" className={styles.sectionTitle}>
              How URL analysis works
            </h2>
            <p className={styles.sectionDesc}>
              A safe, multi-layered inspection process that analyzes text without executing target code.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>Step 01</span>
              <h3 className={styles.stepTitle}>Safe Parsing & SSRF Defense</h3>
              <p className={styles.stepText}>
                The link is sanitized, non-web schemes (`javascript:`, `file:`) are rejected,
                and hostnames are verified without the server fetching or visiting the target.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>Step 02</span>
              <h3 className={styles.stepTitle}>Feature Extraction & Model Inference</h3>
              <p className={styles.stepText}>
                Lexical features, entropy, and domain hierarchies are transformed into a numerical
                vector evaluated by the scikit-learn classifier.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>Step 03</span>
              <h3 className={styles.stepTitle}>Scoring & Explanatory Breakdown</h3>
              <p className={styles.stepText}>
                Results are compiled into a calibrated 0–100 risk score, category rating (Low, Moderate, High),
                and clear human-readable explanations.
              </p>
            </div>
          </div>

          <div className={styles.disclaimerBox}>
            <strong>Responsible Use & Educational Disclaimer:</strong> PhishShield is designed for educational
            demonstration and defensive URL evaluation. Automated classification models evaluate lexical patterns
            and statistical indicators. No automated tool can guarantee that an unflagged link is definitively safe.
            Never provide sensitive personal or financial credentials to unfamiliar web destinations.
          </div>
        </div>
      </section>
    </div>
  );
};
