import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, ApiError } from '../services/api';
import type { AnalysisResult, SampleUrl } from '../types';
import { Button, Input, CopyButton } from '../components/arc';
import { RiskBadge } from '../components/RiskBadge';
import { ScoreMeter } from '../components/ScoreMeter';
import { IndicatorItem } from '../components/IndicatorItem';
import { RadarScanner } from '../components/RadarScanner';
import { UrlDissector } from '../components/UrlDissector';
import styles from './AnalyzePage.module.css';
import quishingStyles from './QuishingPage.module.css';

export const AnalyzePage: React.FC = () => {
  useDocumentTitle('Analyze a URL');
  const [searchParams, setSearchParams] = useSearchParams();

  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [samples, setSamples] = useState<SampleUrl[]>([]);

  // Load exhibition sample URLs
  useEffect(() => {
    api.analysis.getSamples()
      .then((res) => setSamples(res.samples))
      .catch(() => {});
  }, []);

  // If URL parameter is provided in query string, trigger analysis on initial load
  useEffect(() => {
    const queryUrl = searchParams.get('url');
    if (queryUrl) {
      setInputUrl(queryUrl);
      executeAnalysis(queryUrl);
    }
  }, [searchParams]);

  const executeAnalysis = async (targetUrl: string) => {
    const clean = targetUrl.trim();
    if (!clean) {
      setValidationError('Please enter a URL to analyze.');
      return;
    }

    setLoading(true);
    setValidationError('');

    try {
      const data = await api.analysis.analyze(clean);
      setResult(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setValidationError(err.message);
      } else {
        setValidationError('Unable to reach the analysis service. Please try again.');
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAnalysis(inputUrl);
  };

  const handleSelectSample = (sample: SampleUrl) => {
    setInputUrl(sample.url);
    setSearchParams({ url: sample.url });
    executeAnalysis(sample.url);
  };

  const handleReset = () => {
    setResult(null);
    setInputUrl('');
    setSearchParams({});
    setValidationError('');
  };

  return (
    <div className={styles.pageWrapper}>
      <div className="container">
        {/* Navigation Tabs between Tools */}
        <div className={quishingStyles.toolsNav}>
          <Link to="/analyze" className={`${quishingStyles.toolTab} ${quishingStyles.toolTabActive}`}>
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
          <Link to="/extension" className={quishingStyles.toolTab}>
            Browser Extension
          </Link>
        </div>

        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Analyze a URL</h1>
          <p className={styles.pageSubtitle}>
            Inspect structural characteristics, test with our machine-learning model,
            and review detected risk indicators.
          </p>
        </header>

        {/* Input Card */}
        <section className={styles.card} aria-label="URL Input Form">
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input
                  label="Destination URL"
                  placeholder="https://example.com/login"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  error={validationError}
                  description="Enter full URL or domain. Non-web schemes (e.g. javascript:) will be rejected."
                  disabled={loading}
                  required
                />
              </div>
              <div style={{ marginTop: '24px' }}>
                <Button type="submit" variant="primary" size="md" loading={loading}>
                  Run Analysis
                </Button>
              </div>
            </div>

            {/* Live Interactive URL Anatomy Dissector */}
            <UrlDissector url={inputUrl} />

            {/* Quick Demonstration Samples */}
            {samples.length > 0 && (
              <div className={styles.samplesSection}>
                <span className={styles.samplesTitle}>Exhibition Demonstration Samples:</span>
                <div className={styles.samplesGrid}>
                  {samples.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      className={styles.sampleButton}
                      onClick={() => handleSelectSample(sample)}
                      title={sample.description}
                    >
                      <strong style={{ marginRight: '4px' }}>
                        [{sample.category}]
                      </strong>
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Cyber Radar Scanning Visualization */}
        {loading && <RadarScanner url={inputUrl} />}

        {/* Results Area */}
        {result && !loading && (
          <section className={styles.resultsCard} aria-labelledby="results-heading">
            <div className={styles.resultTop}>
              <div className={styles.urlBlock}>
                <span className={styles.urlLabel}>Analyzed Link</span>
                <div className={styles.urlTextWrap}>
                  <span className={styles.urlText} title={result.submitted_url}>
                    {result.submitted_url}
                  </span>
                  <CopyButton
                    value={result.submitted_url}
                    label="Copy"
                    variant="outline"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <RiskBadge level={result.risk_level} label={result.classification} />
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  Analyze Another
                </Button>
              </div>
            </div>

            {/* Score & Model Details */}
            <div className={styles.scoreGrid}>
              <ScoreMeter score={result.risk_score} level={result.risk_level} />

              <div className={styles.confidenceBox}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Model Confidence
                </span>
                <div className={styles.confidenceValue}>
                  {result.model_confidence}%
                </div>
                <p className={styles.confidenceNote}>
                  {result.confidence_note || 'Statistical probability of phishing characteristics.'}
                </p>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Engine: {result.model_version}
                </div>
              </div>
            </div>

            {/* Recommendation Box */}
            <div className={`${styles.adviceBox} ${styles[result.risk_level]}`}>
              <div className={styles.adviceTitle}>Security Summary & Guidance</div>
              <p className={styles.adviceText}>{result.summary}</p>
              <p className={styles.adviceText} style={{ fontWeight: 500 }}>
                Recommendation: {result.recommendation}
              </p>
            </div>

            {/* Indicators Section */}
            <div className={styles.indicatorsSection}>
              <div className={styles.indicatorsHeader}>
                <h2 id="results-heading" className={styles.indicatorsTitle}>
                  Extracted Signals & Indicators
                </h2>
                <span className={styles.indicatorsCount}>
                  {result.indicators.length} {result.indicators.length === 1 ? 'signal' : 'signals'} detected
                </span>
              </div>

              {result.indicators.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  No high or medium severity anomalies were detected.
                </p>
              ) : (
                <div className={styles.indicatorsList}>
                  {result.indicators.map((ind, index) => (
                    <IndicatorItem key={`${ind.id}-${index}`} indicator={ind} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer with persistence info */}
            <div className={styles.resultFooter}>
              <div className={styles.saveNote}>
                {result.saved ? (
                  <>
                    <span>✓ Saved to your detection history.</span>
                    {result.analysis_id && (
                      <Link to={`/history/${result.analysis_id}`} className={styles.saveLink}>
                        View in History #{result.analysis_id}
                      </Link>
                    )}
                  </>
                ) : (
                  <span>
                    Guest mode: {result.save_note}{' '}
                    <Link to="/login" className={styles.saveLink}>
                      Sign In
                    </Link>
                  </span>
                )}
              </div>

              <div>
                Assessment Time: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
