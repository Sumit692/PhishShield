import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Flame,
  Trophy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Timer,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cyberAudio } from '../utils/cyberAudio';
import { Button, CopyButton } from '../components/arc';
import { RiskBadge } from '../components/RiskBadge';
import styles from './ArenaPage.module.css';
import quishingStyles from './QuishingPage.module.css';

interface Scenario {
  id: string;
  type: 'Browser Address Bar' | 'Mobile Banking SMS' | 'Corporate Email' | 'Membership Lure';
  category: 'Legitimate' | 'Phishing';
  url: string;
  sender?: string;
  messageText?: string;
  context: string;
  aiRiskScore: number;
  aiConfidence: number;
  forensicClue: string;
}

const ARENA_SCENARIOS: Scenario[] = [
  {
    id: 's1-chase-subdomain',
    type: 'Mobile Banking SMS',
    category: 'Phishing',
    url: 'https://chase.com.fraud-prevention-alert.co/verify-identity?acc=98214',
    sender: 'Chase Alerts (+1-800-555-0199)',
    messageText: 'ALERT: Your Chase Bank debit card has been temporarily locked due to 3 suspicious transactions. Verify your identity immediately to prevent permanent closure.',
    context: 'You receive an urgent text message about your bank card being frozen.',
    aiRiskScore: 78,
    aiConfidence: 89,
    forensicClue: 'Subdomain Deception! The actual root domain is "fraud-prevention-alert.co". The attacker prepended "chase.com" as a third-level subdomain to fool human eyes on narrow mobile screens.'
  },
  {
    id: 's2-punycode-homograph',
    type: 'Browser Address Bar',
    category: 'Phishing',
    url: 'https://xn--pypal-4ve.com/account/login-verify',
    context: 'You clicked a payment dispute resolution link that claims to open PayPal.',
    aiRiskScore: 88,
    aiConfidence: 94,
    forensicClue: 'Internationalized Domain Name (IDN) Attack! The link uses the "xn--" prefix containing a Cyrillic character that renders visually identical to "paypal.com" but routes to an attacker\'s server.'
  },
  {
    id: 's3-mit-edu',
    type: 'Browser Address Bar',
    category: 'Legitimate',
    url: 'https://www.mit.edu/education/schools-and-departments?curriculum=2026',
    context: 'You are researching engineering degree requirements on a university website.',
    aiRiskScore: 8,
    aiConfidence: 98,
    forensicClue: 'Authentic Institution! Standard .edu domain hierarchy with valid SSL encryption, standard HTTPS port, and zero deceptive credential keywords.'
  },
  {
    id: 's4-raw-ip-paypal',
    type: 'Corporate Email',
    category: 'Phishing',
    url: 'http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login-run',
    sender: 'Invoicing Dept <support@corp-invoicing.net>',
    messageText: 'Invoice #INV-9821 overdue. Review your payment details on the attached PayPal server immediately.',
    context: 'An email arrives asking you to pay an overdue supplier invoice.',
    aiRiskScore: 96,
    aiConfidence: 97,
    forensicClue: 'Direct Numeric IP Address! Legitimate financial processors never host customer authentication portals on raw IP addresses or non-standard ports like :8080.'
  },
  {
    id: 's5-netflix-at-trick',
    type: 'Membership Lure',
    category: 'Phishing',
    url: 'https://www.netflix.com@secure-verify-billing.net/login.php',
    sender: 'Netflix Member Support',
    messageText: 'Your monthly streaming payment was declined. Update your credit card to keep your account active.',
    context: 'A streaming subscription email prompts you to re-enter payment details.',
    aiRiskScore: 92,
    aiConfidence: 92,
    forensicClue: 'RFC 3986 "@" Credential Injection! In a URL containing an "@" symbol, everything before it is interpreted as username credentials. The actual destination server is "secure-verify-billing.net".'
  },
  {
    id: 's6-mozilla-docs',
    type: 'Browser Address Bar',
    category: 'Legitimate',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview',
    context: 'You are reviewing web standard protocol documentation for an engineering project.',
    aiRiskScore: 6,
    aiConfidence: 99,
    forensicClue: 'Authentic Documentation Portal! Verified Mozilla root domain, clean standard path structure, and zero artificial urgency or credential traps.'
  }
];

export const ArenaPage: React.FC = () => {
  useDocumentTitle('Spot the Phish — Cyber Defense Arena');
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userChoice, setUserChoice] = useState<'Legitimate' | 'Phishing' | 'Timed Out' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [lastRoundPoints, setLastRoundPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [history, setHistory] = useState<{ id: string; correct: boolean; isPhish: boolean }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Speed-run countdown timer & audio states
  const [timeLeft, setTimeLeft] = useState(15);
  const [speedRunEnabled, setSpeedRunEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(cyberAudio.getMuted());
  const [timedOut, setTimedOut] = useState(false);

  const currentScenario = ARENA_SCENARIOS[currentIndex];
  const totalRounds = ARENA_SCENARIOS.length;

  // 15-second countdown timer effect
  useEffect(() => {
    if (isCompleted || userChoice !== null || !speedRunEnabled) return;

    if (timeLeft <= 0) {
      // Timeout triggered
      setTimedOut(true);
      setUserChoice('Timed Out');
      setStreak(0);
      setLastRoundPoints(0);
      cyberAudio.playTimeout();

      setHistory((prev) => [
        ...prev,
        {
          id: currentScenario.id,
          correct: false,
          isPhish: currentScenario.category === 'Phishing'
        }
      ]);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 5 && prev > 1) {
          cyberAudio.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, userChoice, isCompleted, speedRunEnabled, currentScenario.id, currentScenario.category]);

  const handleVote = (choice: 'Legitimate' | 'Phishing') => {
    if (userChoice !== null) return; // Prevent double vote
    setUserChoice(choice);
    setTimedOut(false);

    const isCorrect = choice === currentScenario.category;
    if (isCorrect) {
      cyberAudio.playCorrect();
      setCorrectCount((prev) => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }

      // Dynamic Speed Multiplier Scoring: Base 100 + Speed Bonus + Streak Bonus
      const basePts = 100;
      const speedBonus = speedRunEnabled ? Math.max(0, timeLeft) * 10 : 0;
      const streakBonus = (newStreak - 1) * 20;
      const roundTotal = basePts + speedBonus + streakBonus;

      setLastRoundPoints(roundTotal);
      setPoints((prev) => prev + roundTotal);
    } else {
      cyberAudio.playWrong();
      setStreak(0);
      setLastRoundPoints(0);
    }

    setHistory((prev) => [
      ...prev,
      {
        id: currentScenario.id,
        correct: isCorrect,
        isPhish: currentScenario.category === 'Phishing'
      }
    ]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < totalRounds) {
      setCurrentIndex((prev) => prev + 1);
      setUserChoice(null);
      setTimedOut(false);
      setTimeLeft(15);
    } else {
      setIsCompleted(true);
      const finalAccuracy = Math.round((correctCount / totalRounds) * 100);
      if (finalAccuracy >= 50) {
        cyberAudio.playVictory();
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserChoice(null);
    setTimedOut(false);
    setTimeLeft(15);
    setPoints(0);
    setLastRoundPoints(0);
    setCorrectCount(0);
    setStreak(0);
    setHistory([]);
    setIsCompleted(false);
  };

  const toggleAudio = () => {
    const muted = cyberAudio.toggleMute();
    setIsMuted(muted);
  };

  const toggleSpeedRun = () => {
    setSpeedRunEnabled((prev) => !prev);
    setTimeLeft(15);
  };

  // Rank calculation based on percentage score
  const scorePercent = Math.round((correctCount / totalRounds) * 100);
  let rankTitle = 'Cyber Sentinel';
  let rankDesc = 'Flawless instinct! You successfully identified every homograph, subdomain trick, and legitimate link.';
  if (scorePercent < 50) {
    rankTitle = 'Phish Bait';
    rankDesc = 'Vulnerable to modern deception. Attackers exploit subtle tricks like punycode and subdomains that fool the naked eye.';
  } else if (scorePercent < 80) {
    rankTitle = 'Casual Surfer';
    rankDesc = 'Good baseline awareness, but caught by sophisticated multi-level subdomains or credential tricks.';
  } else if (scorePercent < 100) {
    rankTitle = 'Vigilant Security Analyst';
    rankDesc = 'Strong defensive judgment! You spotted almost all deceptive markers before clicking.';
  }

  return (
    <div className={styles.pageWrapper}>
      <div className="container">
        {/* Navigation Tabs between Tools */}
        <div className={quishingStyles.toolsNav}>
          <Link to="/analyze" className={quishingStyles.toolTab}>
            Inspect URL
          </Link>
          <Link to="/quishing" className={quishingStyles.toolTab}>
            Quishing Scanner (QR)
          </Link>
          <Link to="/email-inspector" className={quishingStyles.toolTab}>
            Email & SMS Inspector
          </Link>
          <Link to="/arena" className={`${quishingStyles.toolTab} ${quishingStyles.toolTabActive}`}>
            <Gamepad2 size={15} />
            Spot the Phish Arena
          </Link>
          <Link to="/extension" className={quishingStyles.toolTab}>
            Browser Extension
          </Link>
        </div>

        <header className={styles.pageHeader}>
          <div className={styles.badgePill}>
            <Gamepad2 size={13} />
            <span>Interactive Cyber Defense Arena</span>
          </div>
          <h1 className={styles.pageTitle}>Spot the Phish: Human vs. AI Challenge</h1>
          <p className={styles.pageSubtitle}>
            Can you outsmart modern phishing techniques under time pressure? Test your intuition against 6 tricky real-world
            scenarios with sound effects and speed scoring to compare your judgment against PhishShield's ML engine.
          </p>
        </header>

        {/* Status Bar with Controls */}
        {!isCompleted && (
          <div className={styles.statusBar}>
            <div className={styles.statusPill}>
              <span>Challenge</span>
              <span className={styles.scoreCounter}>
                {currentIndex + 1} / {totalRounds}
              </span>
            </div>
            <div className={styles.statusPill}>
              <Flame size={14} color="#f59e0b" />
              <span>Streak:</span>
              <span className={styles.scoreCounter}>{streak}</span>
            </div>
            <div className={styles.statusPill}>
              <Trophy size={14} color="var(--brand-dark)" />
              <span>Score:</span>
              <span className={styles.scoreCounter}>{points} pts</span>
            </div>

            {/* Audio & Timer Mode Controls */}
            <div className={styles.controlPill}>
              <button
                type="button"
                className={`${styles.iconCtrlBtn} ${!isMuted ? styles.iconCtrlActive : ''}`}
                onClick={toggleAudio}
                title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
                aria-label={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span>{isMuted ? 'Muted' : 'Audio'}</span>
              </button>
              <button
                type="button"
                className={`${styles.iconCtrlBtn} ${speedRunEnabled ? styles.iconCtrlActive : ''}`}
                onClick={toggleSpeedRun}
                title="Toggle 15s Countdown Timer"
                aria-label="Toggle 15s Countdown Timer"
              >
                <Timer size={13} />
                <span>{speedRunEnabled ? '15s Timer' : 'Timer Off'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Arena Card */}
        <section className={styles.arenaCard}>
          {!isCompleted ? (
            <>
              {/* Progress bar inside card */}
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${((currentIndex + 1) / totalRounds) * 100}%` }}
                />
              </div>

              {/* Adrenaline Countdown Timer Bar */}
              {speedRunEnabled && userChoice === null && (
                <div className={styles.countdownSection}>
                  <div className={styles.countdownHeader}>
                    <div className={styles.countdownLabel}>
                      <Clock
                        size={13}
                        color={timeLeft <= 3 ? '#ef4444' : timeLeft <= 7 ? '#f59e0b' : '#10b981'}
                      />
                      <span>Reaction Time Clock</span>
                    </div>
                    <span
                      className={styles.countdownSeconds}
                      style={{
                        color: timeLeft <= 3 ? '#ef4444' : timeLeft <= 7 ? '#f59e0b' : 'var(--text-primary)'
                      }}
                    >
                      {timeLeft}s
                    </span>
                  </div>
                  <div className={styles.timerTrack}>
                    <div
                      className={`${styles.timerFill} ${
                        timeLeft <= 3
                          ? styles.timerCritical
                          : timeLeft <= 7
                          ? styles.timerWarning
                          : styles.timerNormal
                      }`}
                      style={{ width: `${(timeLeft / 15) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Scenario Type and Context */}
              <div className={styles.scenarioHeader}>
                <span className={styles.scenarioTag}>{currentScenario.type}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Inspect closely before voting
                </span>
              </div>

              <p className={styles.scenarioContext}>{currentScenario.context}</p>

              {/* Mock Viewport */}
              <div className={styles.mockViewport}>
                {currentScenario.type === 'Browser Address Bar' ? (
                  <div className={styles.browserBar}>
                    <Lock size={14} color="#10b981" />
                    <span className={styles.browserUrl}>{currentScenario.url}</span>
                    <CopyButton value={currentScenario.url} label="Copy" variant="plain" />
                  </div>
                ) : (
                  <div className={styles.messageMock}>
                    {currentScenario.sender && (
                      <div className={styles.messageSender}>
                        <span>From:</span>
                        <span>{currentScenario.sender}</span>
                      </div>
                    )}
                    {currentScenario.messageText && (
                      <div className={styles.messageBody}>
                        <p style={{ margin: 0, marginBottom: '8px' }}>{currentScenario.messageText}</p>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-xs)',
                          color: '#2563eb',
                          wordBreak: 'break-all'
                        }}>
                          🔗 {currentScenario.url}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Vote Buttons */}
              {userChoice === null ? (
                <div>
                  <div className={styles.votePrompt}>
                    Is this destination safe or a phishing attack?
                  </div>
                  <div className={styles.actionGrid}>
                    <button
                      type="button"
                      className={styles.voteBtnSafe}
                      onClick={() => handleVote('Legitimate')}
                    >
                      <ShieldCheck size={20} />
                      Legitimate (Safe)
                    </button>
                    <button
                      type="button"
                      className={styles.voteBtnPhish}
                      onClick={() => handleVote('Phishing')}
                    >
                      <ShieldAlert size={20} />
                      Phishing / Scam
                    </button>
                  </div>
                </div>
              ) : (
                /* Dramatic Reveal Section with Audio Feedback & Speed Bonus Points */
                <div className={styles.revealSection}>
                  {timedOut ? (
                    <div className={`${styles.resultBanner} ${styles.bannerTimeout}`}>
                      <Clock size={22} />
                      <div>
                        <div style={{ fontWeight: 800 }}>TIME EXPIRED! (0 pts)</div>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>
                          Attackers exploit artificial urgency to force rushed decisions or hesitation.
                        </div>
                      </div>
                    </div>
                  ) : userChoice === currentScenario.category ? (
                    <div className={`${styles.resultBanner} ${styles.bannerSuccess}`}>
                      <CheckCircle2 size={22} />
                      <div>
                        <div style={{ fontWeight: 800 }}>CORRECT! You spotted the deception.</div>
                        <div className={styles.speedBonusPill}>
                          <Zap size={13} />
                          <span>
                            +{lastRoundPoints} PTS (Base: 100
                            {speedRunEnabled && timeLeft > 0 ? ` • ⚡ Speed +${timeLeft * 10}` : ''}
                            {streak > 1 ? ` • 🔥 Streak +${(streak - 1) * 20}` : ''})
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`${styles.resultBanner} ${styles.bannerDanger}`}>
                      <XCircle size={22} />
                      <div>
                        <div style={{ fontWeight: 800 }}>TRICKED! This was a deceptive {currentScenario.category} attempt.</div>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>
                          Streak reset. Review the forensic breakdown below to learn the deception technique.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Side-by-Side Comparison */}
                  <div className={styles.comparisonGrid}>
                    <div className={styles.compareCard}>
                      <span className={styles.compareLabel}>Your Decision</span>
                      <span className={styles.compareValue} style={{
                        color: userChoice === currentScenario.category ? '#10b981' : '#ef4444'
                      }}>
                        {userChoice}
                      </span>
                    </div>
                    <div className={styles.compareCard}>
                      <span className={styles.compareLabel}>PhishShield AI Analysis</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span className={styles.compareValue}>
                          {currentScenario.aiRiskScore}/100 Risk
                        </span>
                        <RiskBadge
                          level={currentScenario.aiRiskScore >= 60 ? 'high' : 'low'}
                          label={currentScenario.category}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Forensic Clue Breakdown */}
                  <div className={styles.clueBox}>
                    <strong style={{ display: 'block', marginBottom: '2px', color: 'var(--text-primary)' }}>
                      Forensic Security Teardown:
                    </strong>
                    {currentScenario.forensicClue}
                  </div>

                  {/* Next Scenario Button */}
                  <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
                    <Button variant="primary" size="lg" onClick={handleNext}>
                      {currentIndex + 1 < totalRounds ? (
                        <>Next Challenge ({currentIndex + 2}/{totalRounds}) →</>
                      ) : (
                        <>View Final Cyber Scorecard 🏆</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Final Scorecard & Cyber Resilience Certificate */
            <div className={styles.scorecardBox}>
              <div className={styles.scoreBadgeLarge}>
                <span className={styles.scoreNumberLarge}>{scorePercent}%</span>
                <span className={styles.scoreLabelLarge}>Accuracy</span>
              </div>

              <div className={styles.rankTitle}>{rankTitle}</div>
              <p className={styles.rankDesc}>{rankDesc}</p>

              {/* Round-by-Round Breakdown Pills */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
                {history.map((h, i) => (
                  <span
                    key={i}
                    title={`Round ${i + 1}: ${h.correct ? 'Correct' : 'Fooled'}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: h.correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: h.correct ? '#10b981' : '#ef4444',
                      border: `1px solid ${h.correct ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}
                  >
                    {h.correct ? '✓' : '✕'}
                  </span>
                ))}
              </div>

              <div className={styles.summaryStats}>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{points} pts</div>
                  <div className={styles.statLabel}>Total Cyber Score</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{correctCount} / {totalRounds}</div>
                  <div className={styles.statLabel}>Human Accuracy</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber} style={{ color: '#f59e0b' }}>
                    {maxStreak} <Flame size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </div>
                  <div className={styles.statLabel}>Best Streak</div>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                textAlign: 'left',
                marginBottom: 'var(--space-6)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                lineHeight: 'var(--leading-relaxed)'
              }}>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  The Exhibition Takeaway:
                </strong>
                Modern cyber attacks exploit visual blind spots—such as mobile URL truncation, Cyrillic homographs, and credential '@' symbols. While human fatigue and visual limitations make people susceptible under real-world time pressure, PhishShield's 25+ feature machine-learning model dissects lexical anatomy objectively in milliseconds.
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
                <Button variant="secondary" size="md" onClick={handleRestart}>
                  <RotateCcw size={15} style={{ marginRight: '6px' }} />
                  Replay Challenge
                </Button>
                <Button variant="primary" size="md" onClick={() => navigate('/analyze')}>
                  Test a Custom URL ↗
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ArenaPage;
