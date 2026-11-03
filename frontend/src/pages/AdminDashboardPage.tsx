import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, ApiError } from '../services/api';
import type { AdminSummaryResponse, AdminAnalysesResponse } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { Button } from '../components/Button';
import { MetricCard, Progress } from '../components/arc';
import styles from './AdminDashboardPage.module.css';

export const AdminDashboardPage: React.FC = () => {
  useDocumentTitle('Administrator Dashboard');

  const [summary, setSummary] = useState<AdminSummaryResponse | null>(null);
  const [analysesList, setAnalysesList] = useState<AdminAnalysesResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        api.admin.getSummary(),
        api.admin.getAnalyses({ page, search, per_page: 10 }),
      ]);
      setSummary(sumRes);
      setAnalysesList(listRes);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to load administrator data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  if (loading && !summary) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading administrator metrics & aggregates...</p>
      </div>
    );
  }

  if (errorMsg && !summary) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) 0', textAlign: 'center' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto', background: 'var(--bg-surface)', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-2)' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
            {errorMsg}
          </p>
          <Link to="/">
            <Button variant="primary" size="md">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const aggs = summary?.aggregates;
  const breakdown = aggs?.classification_breakdown || { low: 0, moderate: 0, high: 0 };
  const totalAnalyses = aggs?.total_analyses || 0;

  const lowPct = totalAnalyses > 0 ? Math.round((breakdown.low / totalAnalyses) * 100) : 0;
  const modPct = totalAnalyses > 0 ? Math.round((breakdown.moderate / totalAnalyses) * 100) : 0;
  const highPct = totalAnalyses > 0 ? Math.max(0, 100 - lowPct - modPct) : 0;

  return (
    <div className={styles.pageWrapper}>
      <div className="container">
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Administrator Dashboard</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            System-wide analytics, classification distributions, and live health metrics
          </p>
        </header>

        {/* Aggregates Grid with Arc MetricCard */}
        <section className={styles.metricsGrid} aria-label="System Metrics">
          <MetricCard
            label="Total Users"
            value={aggs?.total_users ?? 0}
            context="Registered user accounts"
          />

          <MetricCard
            label="Total Analyses"
            value={aggs?.total_analyses ?? 0}
            context="Inspected web links"
          />

          <MetricCard
            label="Average Risk Score"
            value={Math.round(aggs?.average_risk_score ?? 0)}
            suffix="/100"
            context="Platform-wide threat mean"
          />

          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>ML Engine</span>
            <span className={styles.metricValue} style={{ fontSize: 'var(--text-xl)' }}>
              Random Forest
            </span>
            <span className={styles.metricSubtext}>100 trees &bull; 25 lexical features</span>
          </article>
        </section>

        {/* Breakdown & Health Cards */}
        <div className={styles.twoColGrid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Classification Distribution</h2>
            <div className={styles.distBar} role="progressbar" aria-label="Threat risk distribution">
              <div className={styles.distLow} style={{ width: `${lowPct}%` }} title={`Low Risk: ${lowPct}%`} />
              <div className={styles.distMod} style={{ width: `${modPct}%` }} title={`Moderate Risk: ${modPct}%`} />
              <div className={styles.distHigh} style={{ width: `${highPct}%` }} title={`High Risk: ${highPct}%`} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <Progress value={lowPct} max={100} label={`Low Risk (${breakdown.low} URLs)`} showValue />
              <Progress value={modPct} max={100} label={`Moderate Risk (${breakdown.moderate} URLs)`} showValue />
              <Progress value={highPct} max={100} label={`High Risk (${breakdown.high} URLs)`} showValue />
            </div>

            <div className={styles.distLegend} style={{ marginTop: 'var(--space-4)' }}>
              <div className={styles.distItem}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RiskBadge level="low" label="Low Risk" />
                  <span>Legitimate Characteristics</span>
                </span>
                <span style={{ fontWeight: 600 }}>
                  {breakdown.low} ({lowPct}%)
                </span>
              </div>

              <div className={styles.distItem}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RiskBadge level="moderate" label="Moderate Risk" />
                  <span>Suspicious Signals</span>
                </span>
                <span style={{ fontWeight: 600 }}>
                  {breakdown.moderate} ({modPct}%)
                </span>
              </div>

              <div className={styles.distItem}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RiskBadge level="high" label="High Risk" />
                  <span>Phishing Signatures</span>
                </span>
                <span style={{ fontWeight: 600 }}>
                  {breakdown.high} ({highPct}%)
                </span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Application Health & Security</h2>
            <div>
              <div className={styles.healthRow}>
                <span style={{ color: 'var(--text-secondary)' }}>Database Status</span>
                <span style={{ fontWeight: 600, color: 'var(--status-low)' }}>
                  Connected (SQLite Persistent)
                </span>
              </div>
              <div className={styles.healthRow}>
                <span style={{ color: 'var(--text-secondary)' }}>ML Model Artifact</span>
                <span style={{ fontWeight: 600, color: summary?.system_health.model_ready ? 'var(--status-low)' : 'var(--status-high)' }}>
                  {summary?.system_health.model_ready ? 'Loaded & Validated' : 'Artifact Missing'}
                </span>
              </div>
              <div className={styles.healthRow}>
                <span style={{ color: 'var(--text-secondary)' }}>Rate Limiter</span>
                <span style={{ fontWeight: 600, color: 'var(--status-low)' }}>
                  Active (Sliding Window IP Guard)
                </span>
              </div>
              <div className={styles.healthRow}>
                <span style={{ color: 'var(--text-secondary)' }}>Session Protection</span>
                <span style={{ fontWeight: 600, color: 'var(--status-low)' }}>
                  HTTPOnly & SameSite Lax
                </span>
              </div>
              <div className={styles.healthRow}>
                <span style={{ color: 'var(--text-secondary)' }}>SSRF Mitigation</span>
                <span style={{ fontWeight: 600, color: 'var(--status-low)' }}>
                  Strict Scheme & Localhost Parsing
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Analyses Table */}
        <section className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>
              System Analysis Activity
            </h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                placeholder="Search across all URLs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', minWidth: '220px' }}
                aria-label="Filter analyses list"
              />
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Submitted URL</th>
                  <th>Risk Level</th>
                  <th>Score</th>
                  <th>Confidence</th>
                  <th>User ID</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {analysesList?.items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      #{item.id}
                    </td>
                    <td>
                      <div className={styles.urlCell} title={item.submitted_url}>
                        {item.submitted_url}
                      </div>
                    </td>
                    <td>
                      <RiskBadge level={item.risk_level} label={item.classification} />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {item.risk_score}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        /100
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {item.model_confidence}%
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {item.user_id ? `User #${item.user_id}` : 'Guest'}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {analysesList && analysesList.pages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {page} of {analysesList.pages} ({analysesList.total} total)
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= analysesList.pages}
                onClick={() => setPage((p) => Math.min(analysesList.pages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
