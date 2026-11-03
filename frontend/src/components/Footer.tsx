import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandCol}>
          <div style={{ marginBottom: '12px' }}>
            <Logo size="md" showBadge={false} showTagline={false} />
          </div>
          <p className={styles.projectNote}>
            Automated lexical and structural phishing URL analysis engine.
            Developed for Information Science and Engineering exhibition.
            Automated assessments are analytical aids and do not constitute an absolute guarantee of safety.
          </p>
        </div>

        <div>
          <div className={styles.colTitle}>Product</div>
          <ul className={styles.linkList}>
            <li>
              <Link to="/analyze">Analyze a URL</Link>
            </li>
            <li>
              <Link to="/history">Detection History</Link>
            </li>
            <li>
              <Link to="/analyze?sample=phish-ip">Try a Sample Phish</Link>
            </li>
          </ul>
        </div>

        <div>
          <div className={styles.colTitle}>Security & Access</div>
          <ul className={styles.linkList}>
            <li>
              <Link to="/login">Account Sign In</Link>
            </li>
            <li>
              <Link to="/register">Create Account</Link>
            </li>
            <li>
              <Link to="/admin">Administrator Portal</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className={`container ${styles.bottomBar}`}>
        <span>&copy; {new Date().getFullYear()} PhishShield — Safe URL Analysis Utility.</span>
        <div className={styles.statusIndicator}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span>Local ML Engine Ready (Random Forest v1.0.0)</span>
        </div>
      </div>
    </footer>
  );
};
