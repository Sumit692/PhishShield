import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, ApiError } from '../services/api';
import type { AnalysisResult } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { Button } from '../components/Button';
import { EmptyState, Alert } from '../components/arc';
import styles from './HistoryPage.module.css';

export const HistoryPage: React.FC = () => {
  useDocumentTitle('Detection History');

  const [items, setItems] = useState<AnalysisResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date_desc');

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.history.list({
        search,
        filter,
        sort,
        page,
        per_page: 10,
      });
      setItems(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to load history records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, filter, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this analysis record?')) {
      return;
    }
    try {
      await api.history.delete(id);
      fetchHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className="container">
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Detection History</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Review your previously analyzed links and their threat scores
            </p>
          </div>
          <Link to="/analyze">
            <Button variant="primary" size="sm">
              + New Analysis
            </Button>
          </Link>
        </header>

        {/* Controls Bar */}
        <section className={styles.controlsBar} aria-label="Filters and search">
          <div className={styles.filterGroup}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginRight: '4px' }}>
              Category:
            </span>
            {(['all', 'low', 'moderate', 'high'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.filterBtn} ${filter === cat ? styles.activeFilter : ''}`}
                onClick={() => {
                  setFilter(cat);
                  setPage(1);
                }}
              >
                {cat === 'all' ? 'All Records' :
                 cat === 'low' ? 'Low Risk' :
                 cat === 'moderate' ? 'Moderate Risk' : 'High Risk'}
              </button>
            ))}
          </div>

          <div className={styles.searchSortGroup}>
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
                aria-label="Search URLs in history"
              />
            </form>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className={styles.sortSelect}
              aria-label="Sort records"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="score_desc">Highest Score</option>
              <option value="score_asc">Lowest Score</option>
            </select>
          </div>
        </section>

        {/* Error message */}
        {errorMsg && (
          <Alert tone="danger" title="Error" style={{ marginBottom: 'var(--space-4)' }}>
            {errorMsg}
          </Alert>
        )}

        {/* Records Table */}
        <div className={styles.tableCard}>
          {loading ? (
            <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading detection history...
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: 'var(--space-8)' }}>
              <EmptyState
                title="No records found"
                description={
                  search || filter !== 'all'
                    ? 'No checks matched your filter criteria. Try resetting your search or filters.'
                    : 'You have not analyzed any URLs while signed in. Run your first check now!'
                }
                action={
                  <Link to="/analyze">
                    <Button variant="primary" size="md">
                      Analyze a URL
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Target URL</th>
                    <th>Risk Category</th>
                    <th>Score</th>
                    <th>Date & Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
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
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <Link to={`/history/${item.id}`}>
                            <Button variant="secondary" size="sm">
                              Details
                            </Button>
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => item.id && handleDelete(item.id)}
                            aria-label={`Delete record for ${item.submitted_url}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && items.length > 0 && pages > 1 && (
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
                Page {page} of {pages} ({total} records)
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
