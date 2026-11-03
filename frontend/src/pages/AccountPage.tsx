import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import styles from './AuthPages.module.css';

export const AccountPage: React.FC = () => {
  useDocumentTitle('User Account');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Recently';

  return (
    <div className={`container ${styles.authWrapper}`}>
      <div className={styles.accountCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Your Account</h1>
          <p className={styles.authSubtitle}>
            Manage your session and access personal analysis records
          </p>
        </div>

        <div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Full Name</span>
            <span className={styles.detailValue}>{user.name}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Email Address</span>
            <span className={styles.detailValue}>{user.email}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Role</span>
            <span className={styles.detailValue} style={{ textTransform: 'capitalize' }}>
              {user.role} {user.is_admin ? '(Administrator)' : ''}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Account Created</span>
            <span className={styles.detailValue}>{joinDate}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <Link to="/history" style={{ flex: 1 }}>
            <Button variant="primary" size="md" style={{ width: '100%' }}>
              View Detection History
            </Button>
          </Link>
          <Button variant="outline" size="md" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
