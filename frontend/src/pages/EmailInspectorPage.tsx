import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
  Upload,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, ApiError } from '../services/api';
import type { MessageAnalysisResult, SampleMessage } from '../types';
import { Button, Input } from '../components/arc';
import { RiskBadge } from '../components/RiskBadge';
import styles from './EmailInspectorPage.module.css';
import quishingStyles from './QuishingPage.module.css';
import analyzeStyles from './AnalyzePage.module.css';

const DEFAULT_SAMPLE_MESSAGES: SampleMessage[] = [
  {
    id: 'smishing-bank',
    label: 'Bank Suspension SMS (Smishing)',
    type: 'SMS / Smishing',
    sender: '+1 (800) 555-0199',
    text: 'ALERT: Your Chase Bank debit card has been temporarily locked due to 3 suspicious transactions. Verify your identity immediately at https://chase.com.fraud-prevention-alert.co/verify-identity?acc=98214 to prevent permanent closure.',
    description: 'Urgent SMS claiming debit card lock with a deceptive brand-subdomain phishing link.'
  },
  {
    id: 'phish-mfa-email',
    label: 'Microsoft 365 Password Expiry Email',
    type: 'Email',
    sender: 'IT Support <admin@global-cloud-auth24.net>',
    text: 'Dear Employee,\n\nYour Microsoft 365 domain credentials will expire in 12 hours. All access to Outlook and corporate intranet will be terminated immediately unless you update your password now.\n\nPlease verify your credentials here: http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login-run\n\nSecurity Operations Team',
    description: 'Sender domain mismatch spear-phishing email impersonating Microsoft IT with an IP address credential trap.'
  },
  {
    id: 'legit-github-email',
    label: 'Legitimate GitHub Security Alert',
    type: 'Email',
    sender: 'GitHub <notifications@github.com>',
    text: 'Hi developer,\n\nA new SSH key was added to your account. If you added this key, you can safely ignore this email.\n\nReview your public keys: https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview\n\nThanks,\nThe GitHub Team',
    description: 'Authentic notification from verified github.com domain with zero social engineering pressure.'
  }
];

export const EmailInspectorPage: React.FC = () => {
  useDocumentTitle('Email & SMS Phishing Inspector');
  const navigate = useNavigate();

  const [messageText, setMessageText] = useState('');
  const [sender, setSender] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [samples, setSamples] = useState<SampleMessage[]>(DEFAULT_SAMPLE_MESSAGES);
  const [result, setResult] = useState<MessageAnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load exhibition sample messages from API if available
  useEffect(() => {
    api.analysis.getMessageSamples()
      .then((res) => {
        if (res.samples && res.samples.length > 0) {
          setSamples(res.samples);
        }
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = async (textToScan: string, senderToScan: string) => {
    const cleanText = textToScan.trim();
    if (!cleanText) {
      setErrorMsg('Please enter or paste an email or SMS message to inspect.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await api.analysis.analyzeMessage(cleanText, senderToScan);
      setResult(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unable to reach the message analysis engine. Please try again.');
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalyze(messageText, sender);
  };

  const handleSelectSample = (sample: SampleMessage) => {
    setMessageText(sample.text);
    setSender(sample.sender);
    handleAnalyze(sample.text, sample.sender);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      // Basic RFC email parsing for .eml files
      let extractedSender = '';
      let body = content;

      const lines = content.split(/\r?\n/);
      let isBody = false;
      const bodyLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!isBody) {
          if (line.toLowerCase().startsWith('from:')) {
            extractedSender = line.substring(5).trim();
          } else if (line.trim() === '') {
            isBody = true;
          }
        } else {
          bodyLines.push(line);
        }
      }

      if (bodyLines.length > 0 && extractedSender) {
        body = bodyLines.join('\n');
        setSender(extractedSender);
      }

      setMessageText(body);
      handleAnalyze(body, extractedSender);
    };

    reader.readAsText(file);
  };

  const handleReset = () => {
    setMessageText('');
    setSender('');
    setResult(null);
    setErrorMsg('');
  };

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
          <Link to="/email-inspector" className={`${quishingStyles.toolTab} ${quishingStyles.toolTabActive}`}>
            <Mail size={15} />
            Email & SMS Inspector
          </Link>
          <Link to="/arena" className={quishingStyles.toolTab}>
            Spot the Phish Arena 🎮
          </Link>
          <Link to="/extension" className={quishingStyles.toolTab}>
            Browser Extension
          </Link>
        </div>

        <header className={styles.pageHeader}>
          <div className={styles.badgePill}>
            <MessageSquare size={13} />
            <span>Social Engineering & Smishing Radar</span>
          </div>
          <h1 className={styles.pageTitle}>Email & SMS Phishing Inspector</h1>
          <p className={styles.pageSubtitle}>
            Paste suspicious communications to uncover urgency triggers, credential lures,
            sender domain mismatches, and automatically scan all embedded destination links.
          </p>
        </header>

        {/* Input Card */}
        <section className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.formGrid}>
            <div className={styles.senderRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input
                  label="Sender Address or Header (Optional)"
                  placeholder="e.g. Netflix Support <security@customer-account-update.xyz>"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  description="Used to detect brand impersonation and sender domain mismatch"
                />
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".eml,.txt,.msg"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className={styles.fileUploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload .eml or raw text message file"
                >
                  <Upload size={14} />
                  Upload .eml / .txt
                </button>
              </div>
            </div>

            <div className={styles.textareaWrapper}>
              <label className={styles.textareaLabel}>
                Message or Email Body Content
              </label>
              <textarea
                className={styles.textarea}
                placeholder="Paste the suspicious email, SMS, or WhatsApp message here..."
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                rows={6}
                required
              />
            </div>

            {errorMsg && (
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger-text)',
                fontSize: 'var(--text-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={styles.formActions}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {messageText.length} characters • Analyzed locally with strict privacy
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {result && (
                  <Button variant="ghost" size="md" onClick={handleReset}>
                    Clear
                  </Button>
                )}
                <Button type="submit" variant="primary" size="md" loading={loading}>
                  Run Deep Inspection
                </Button>
              </div>
            </div>
          </form>

          {/* Exhibition Demonstration Samples */}
          {samples.length > 0 && (
            <div className={quishingStyles.samplesSection}>
              <div className={quishingStyles.samplesHeader}>
                <span className={quishingStyles.samplesTitle}>Exhibition Demonstration Samples</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Click to inspect sample emails and SMS lures
                </span>
              </div>
              <div className={quishingStyles.samplesGrid}>
                {samples.map((sample) => (
                  <div
                    key={sample.id}
                    className={quishingStyles.sampleCard}
                    onClick={() => handleSelectSample(sample)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelectSample(sample);
                    }}
                  >
                    <div className={quishingStyles.sampleCardInfo}>
                      <div className={quishingStyles.sampleCardLabel}>
                        {sample.type === 'Email' ? '📧 ' : '📱 '}
                        {sample.label}
                      </div>
                      <div className={quishingStyles.sampleCardDesc}>{sample.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Results Section */}
        {result && (
          <section className={styles.resultsSection}>
            {/* Header with Risk and Classification */}
            <div className={styles.overallHeader}>
              <div>
                <div className={styles.overallTitle}>Message Threat Verdict</div>
                <div className={styles.overallScoreRow}>
                  <div className={styles.scorePill}>
                    {result.overall_risk_score}
                    <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', fontWeight: 400 }}>
                      /100
                    </span>
                  </div>
                  <div>
                    <RiskBadge level={result.overall_risk_level} label={result.classification} />
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Social Engineering Score: {result.social_engineering.score}/100 • Urgency: {result.social_engineering.urgency_level.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  Inspect Another Message
                </Button>
              </div>
            </div>

            {/* Sender Domain Spoofing Alert */}
            {result.sender.mismatch_detected && (
              <div className={styles.senderAlert}>
                <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Critical Sender Spoofing Detected:</strong> {result.sender.warning}
                </div>
              </div>
            )}

            {/* Guidance Box */}
            <div className={`${analyzeStyles.adviceBox} ${analyzeStyles[result.overall_risk_level]}`}>
              <div className={analyzeStyles.adviceTitle}>Security Summary & Guidance</div>
              <p className={analyzeStyles.adviceText}>{result.summary}</p>
              <p className={analyzeStyles.adviceText} style={{ fontWeight: 500 }}>
                Action: {result.recommendation}
              </p>
            </div>

            {/* Social Engineering Triggers Detected */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Social Engineering & Coercion Signals
                </h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {result.social_engineering.triggers_count} psychological triggers identified
                </span>
              </div>

              {result.social_engineering.triggers.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  No high-pressure deadlines, legal intimidation, or credential harvesting lures detected.
                </p>
              ) : (
                <div className={styles.triggersGrid}>
                  {result.social_engineering.triggers.map((trigger, i) => (
                    <div
                      key={i}
                      className={`${styles.triggerCard} ${
                        trigger.severity === 'high' ? styles.triggerHigh : styles.triggerMedium
                      }`}
                    >
                      <div className={styles.triggerTitleRow}>
                        <span className={styles.triggerName}>{trigger.name}</span>
                        <span style={{
                          fontSize: 'var(--text-xs)',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          color: trigger.severity === 'high' ? '#ef4444' : '#f59e0b'
                        }}>
                          {trigger.severity}
                        </span>
                      </div>
                      <div className={styles.triggerDesc}>{trigger.description}</div>
                      <div>
                        <span className={styles.triggerExcerpt}>"{trigger.matched_text}"</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extracted Hyperlinks Inspection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Extracted Hyperlinks Inspection
                </h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {result.urls_count} destination {result.urls_count === 1 ? 'link' : 'links'} analyzed with ML
                </span>
              </div>

              {result.extracted_urls.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  No external links were found in this message body.
                </p>
              ) : (
                <div className={styles.linksList}>
                  {result.extracted_urls.map((linkItem, idx) => (
                    <div key={idx} className={styles.linkRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0, flex: 1 }}>
                        <LinkIcon size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        <span className={styles.linkUrl} title={linkItem.url}>
                          {linkItem.url}
                        </span>
                      </div>

                      <div className={styles.linkBadgeGroup}>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: linkItem.risk_score >= 60 ? '#ef4444' : (linkItem.risk_score >= 30 ? '#f59e0b' : '#10b981')
                        }}>
                          Risk: {linkItem.risk_score}/100
                        </div>
                        <RiskBadge level={linkItem.risk_level} label={linkItem.classification} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/analyze?url=${encodeURIComponent(linkItem.url)}`)}
                        >
                          <ExternalLink size={13} style={{ marginRight: '4px' }} />
                          Deep Scan
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
export default EmailInspectorPage;
