import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { Button, Input, PasswordField, Alert } from '../components/arc';
import styles from './AuthPages.module.css';

export const RegisterPage: React.FC = () => {
  useDocumentTitle('Create Account');
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters with at least one letter and one number.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await register(name, email, password, confirmPassword);
      navigate('/analyze');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Registration failed. Please check the information provided.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container ${styles.authWrapper}`}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Create Account</h1>
          <p className={styles.authSubtitle}>
            Save your URL analysis checks and monitor threat signals
          </p>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert tone="danger" title="Registration Error">
              {errorMsg}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alice Student"
            required
            autoComplete="name"
            disabled={loading}
          />

          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alice@example.com"
            required
            autoComplete="email"
            disabled={loading}
          />

          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters with letters & numbers"
            description="Minimum 8 characters with at least one letter and one digit."
            required
            autoComplete="new-password"
            disabled={loading}
          />

          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required
            autoComplete="new-password"
            disabled={loading}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            Register Account
          </Button>
        </form>

        <div className={styles.authFooter}>
          Already have an account?{' '}
          <Link to="/login" className={styles.authLink}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
