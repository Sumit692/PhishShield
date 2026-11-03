import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Badge, ThemeSwitch } from './arc';
import { Logo } from './Logo';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} onClick={closeMobile} aria-label="PhishShield Home">
          <Logo size="md" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className={styles.navLinks} aria-label="Main Navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/analyze"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
          >
            Analyze URL
          </NavLink>
          <NavLink
            to="/quishing"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
          >
            Quishing (QR)
          </NavLink>
          <NavLink
            to="/email-inspector"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
          >
            Email & SMS
          </NavLink>
          <NavLink
            to="/arena"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
          >
            Phish Arena
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '9px',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '10px',
              marginLeft: '5px',
              letterSpacing: '0.04em'
            }}>
              GAME
            </span>
          </NavLink>
          <NavLink
            to="/extension"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
          >
            Extension
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to="/history"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
            >
              History
            </NavLink>
          )}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
            >
              Admin Dashboard
              <Badge tone="warning" size="sm" style={{ marginLeft: '6px' }}>
                Admin
              </Badge>
            </NavLink>
          )}
        </nav>

        {/* Desktop Auth Buttons and Theme Switch */}
        <div className={styles.authActions}>
          <ThemeSwitch
            theme={theme}
            iconOnly
            onThemeChange={(next, variant, trigger) => setTheme(next, variant, trigger)}
            label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          />

          {isAuthenticated ? (
            <>
              <Link to="/account">
                <Button variant="ghost" size="sm">
                  Account ({user?.name.split(' ')[0]})
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Create Account
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className={styles.mobileDrawer}>
          <Link to="/" className={styles.mobileLink} onClick={closeMobile}>
            Home
          </Link>
          <Link to="/analyze" className={styles.mobileLink} onClick={closeMobile}>
            Analyze URL
          </Link>
          <Link to="/quishing" className={styles.mobileLink} onClick={closeMobile}>
            Quishing Scanner (QR)
          </Link>
          <Link to="/email-inspector" className={styles.mobileLink} onClick={closeMobile}>
            Email & SMS Inspector
          </Link>
          <Link to="/arena" className={styles.mobileLink} onClick={closeMobile}>
            🎮 Spot the Phish Arena (Game)
          </Link>
          <Link to="/extension" className={styles.mobileLink} onClick={closeMobile}>
            Browser Extension
          </Link>
          {isAuthenticated && (
            <Link to="/history" className={styles.mobileLink} onClick={closeMobile}>
              Detection History
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={styles.mobileLink} onClick={closeMobile}>
              Admin Dashboard
            </Link>
          )}

          <hr style={{ borderColor: 'var(--border-subtle)', margin: 'var(--space-1) 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Appearance</span>
            <ThemeSwitch
              theme={theme}
              onThemeChange={(next, variant, trigger) => setTheme(next, variant, trigger)}
            />
          </div>

          <hr style={{ borderColor: 'var(--border-subtle)', margin: 'var(--space-1) 0' }} />

          {isAuthenticated ? (
            <>
              <Link to="/account" className={styles.mobileLink} onClick={closeMobile}>
                My Account ({user?.email})
              </Link>
              <Button variant="secondary" size="sm" onClick={handleLogout} style={{ width: '100%' }}>
                Sign Out
              </Button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Link to="/login" onClick={closeMobile} style={{ flex: 1 }}>
                <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={closeMobile} style={{ flex: 1 }}>
                <Button variant="primary" size="sm" style={{ width: '100%' }}>
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
