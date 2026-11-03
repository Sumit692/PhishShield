import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { Button, Input, PasswordField, Alert } from '../components/arc';
import styles from './AuthPages.module.css';

export const LoginPage: React.FC = () => {
  useDocumentTitle('Sign In');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = (location.state as any)?.from?.pathname || '/analyze';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unable to sign in. Please verify your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container ${styles.authWrapper}`}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Sign In</h1>
          <p className={styles.authSubtitle}>
            Access your saved URL detection history and inspection records
          </p>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert tone="danger" title="Authentication Error">
              {errorMsg}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
            disabled={loading}
          />

          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            disabled={loading}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            Sign In
          </Button>
        </form>

        <div className={styles.authFooter}>
          Don't have an account yet?{' '}
          <Link to="/register" className={styles.authLink}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};
