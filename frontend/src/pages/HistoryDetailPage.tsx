import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, ApiError } from '../services/api';
import type { AnalysisResult } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { ScoreMeter } from '../components/ScoreMeter';
import { IndicatorItem } from '../components/IndicatorItem';
import { Button } from '../components/Button';
import { CopyButton } from '../components/arc';
import styles from './AnalyzePage.module.css';

export const HistoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  useDocumentTitle(`Analysis Record #${id}`);

  const [record, setRecord] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.history.get(parseInt(id, 10))
      .then((data) => setRecord(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg('Failed to load analysis record.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading stored analysis record #{id}...</p>
      </div>
    );
  }

  if (errorMsg || !record) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) 0', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--bg-surface)', padding: 'var(--space-8)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-2)' }}>Unable to View Record</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
            {errorMsg || 'Analysis record could not be found or you do not have permission to view it.'}
          </p>
          <Link to="/history">
            <Button variant="primary" size="md">
              Return to Detection History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className="container">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Link to="/history" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            &larr; Back to Detection History
          </Link>
        </div>

        <section className={styles.resultsCard}>
          <div className={styles.resultTop}>
            <div className={styles.urlBlock}>
              <span className={styles.urlLabel}>Stored Analysis Target</span>
              <div className={styles.urlTextWrap}>
                <span className={styles.urlText} title={record.submitted_url}>
                  {record.submitted_url}
                </span>
                <CopyButton
                  value={record.submitted_url}
                  label="Copy"
                  variant="outline"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <RiskBadge level={record.risk_level} label={record.classification} />
              <Link to={`/analyze?url=${encodeURIComponent(record.submitted_url)}`}>
                <Button variant="secondary" size="sm">
                  Re-analyze Link
                </Button>
              </Link>
            </div>
          </div>

          <div className={styles.scoreGrid}>
            <ScoreMeter score={record.risk_score} level={record.risk_level} />

            <div className={styles.confidenceBox}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Model Confidence
              </span>
              <div className={styles.confidenceValue}>
                {record.model_confidence}%
              </div>
              <p className={styles.confidenceNote}>
                Probability of phishing lexical characteristics.
              </p>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Model Version: {record.model_version}
              </div>
            </div>
          </div>

          <div className={`${styles.adviceBox} ${styles[record.risk_level]}`}>
            <div className={styles.adviceTitle}>Security Summary & Guidance</div>
            <p className={styles.adviceText}>{record.summary}</p>
            <p className={styles.adviceText} style={{ fontWeight: 500 }}>
              Recommendation: {record.recommendation}
            </p>
          </div>

          {/* Indicators */}
          <div className={styles.indicatorsSection}>
            <h2 className={styles.indicatorsTitle}>
              Detected Risk Indicators ({record.indicators.length})
            </h2>
            <div className={styles.indicatorsList}>
              {record.indicators.map((ind, i) => (
                <IndicatorItem key={`${ind.id}-${i}`} indicator={ind} />
              ))}
            </div>
          </div>

          {/* Extracted Features Inspection Table */}
          {record.features && Object.keys(record.features).length > 0 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                Extracted Machine Learning Feature Vector
              </h3>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>Feature</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>Value</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>Feature</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(record.features).reduce<[string, any][][]>((acc, curr, index) => {
                      if (index % 2 === 0) acc.push([curr]);
                      else acc[acc.length - 1].push(curr);
                      return acc;
                    }, []).map((pair, rowIdx) => (
                      <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {pair[0][0]}
                        </td>
                        <td style={{ padding: '6px 12px', fontWeight: 600 }}>
                          {pair[0][1]}
                        </td>
                        <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {pair[1] ? pair[1][0] : ''}
                        </td>
                        <td style={{ padding: '6px 12px', fontWeight: 600 }}>
                          {pair[1] ? pair[1][1] : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={styles.resultFooter}>
            <div>Record ID: #{record.id} &bull; Created: {record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'}</div>
            <div>{record.disclaimer}</div>
          </div>
        </section>
      </div>
    </div>
  );
};
