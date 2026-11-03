import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '../components/Button';
import styles from './ErrorPages.module.css';

export const NotFoundPage: React.FC = () => {
  useDocumentTitle('Page Not Found');

  return (
    <div className={`container ${styles.errorWrapper}`}>
      <div className={styles.errorCard}>
        <span className={styles.statusCode}>404</span>
        <h1 className={styles.errorTitle}>Page Not Found</h1>
        <p className={styles.errorDesc}>
          The link you followed may be broken, or the page may have been removed or moved to another address.
        </p>
        <div className={styles.actionsGroup}>
          <Link to="/">
            <Button variant="primary" size="md">
              Return Home
            </Button>
          </Link>
          <Link to="/analyze">
            <Button variant="outline" size="md">
              Analyze a URL
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ForbiddenPage: React.FC = () => {
  useDocumentTitle('Access Denied');

  return (
    <div className={`container ${styles.errorWrapper}`}>
      <div className={styles.errorCard}>
        <span className={styles.statusCode} style={{ color: 'var(--status-high)' }}>403</span>
        <h1 className={styles.errorTitle}>Access Denied</h1>
        <p className={styles.errorDesc}>
          You do not have the required permissions or administrator privileges to view this page or record.
        </p>
        <div className={styles.actionsGroup}>
          <Link to="/">
            <Button variant="primary" size="md">
              Return Home
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="md">
              Sign In with Another Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ServerErrorPage: React.FC = () => {
  useDocumentTitle('Server Error');

  return (
    <div className={`container ${styles.errorWrapper}`}>
      <div className={styles.errorCard}>
        <span className={styles.statusCode} style={{ color: 'var(--status-mod)' }}>500</span>
        <h1 className={styles.errorTitle}>Service Temporarily Unavailable</h1>
        <p className={styles.errorDesc}>
          An unexpected error occurred while communicating with the backend service.
          Please try again in a few moments.
        </p>
        <div className={styles.actionsGroup}>
          <Button variant="primary" size="md" onClick={() => window.location.reload()}>
            Retry Request
          </Button>
          <Link to="/">
            <Button variant="outline" size="md">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
