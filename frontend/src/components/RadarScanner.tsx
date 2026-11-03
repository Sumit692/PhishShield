import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Search, CheckCircle2, Loader2 } from 'lucide-react';
import styles from './RadarScanner.module.css';

interface RadarScannerProps {
  url?: string;
}

const SCAN_STEPS = [
  { id: 1, label: 'SSRF Guard & Scheme Sanitization', icon: ShieldCheck },
  { id: 2, label: 'Extracting 25+ Lexical & Structural Dimensions', icon: Search },
  { id: 3, label: 'Evaluating with Random Forest Model', icon: Cpu },
  { id: 4, label: 'Compiling Calibrated 0–100 Risk Score', icon: CheckCircle2 },
];

export const RadarScanner: React.FC<RadarScannerProps> = ({ url }) => {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(2), 220);
    const timer2 = setTimeout(() => setCurrentStep(3), 440);
    const timer3 = setTimeout(() => setCurrentStep(4), 680);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className={styles.scannerWrapper}>
      {/* Animated Radar Screen */}
      <div className={styles.radarDisplay} aria-hidden="true">
        <div className={styles.radarCrosshairH} />
        <div className={styles.radarCrosshairV} />
        <div className={styles.radarRing1} />
        <div className={styles.radarRing2} />
        <div className={styles.radarSweep} />
        <div className={styles.radarBlip} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Deep Threat Inspection In Progress
        </h3>
        {url && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Target: {url.length > 50 ? url.substring(0, 50) + '...' : url}
          </p>
        )}
      </div>

      {/* Progressive Security Check Sequence */}
      <div className={styles.stepsList}>
        {SCAN_STEPS.map((step) => {
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={styles.stepItem}
              style={{
                borderColor: isActive ? '#52b788' : undefined,
                background: isActive ? 'rgba(82, 183, 136, 0.06)' : undefined
              }}
            >
              <div className={styles.stepLabel}>
                <Icon size={14} color={isDone ? '#10b981' : (isActive ? '#52b788' : 'var(--text-muted)')} />
                <span>{step.label}</span>
              </div>
              <div className={styles.stepStatus}>
                {isDone ? (
                  <span className={styles.statusDone}>✓ Ready</span>
                ) : isActive ? (
                  <span className={styles.statusActive} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Loader2 size={11} className="spin" /> Scanning
                  </span>
                ) : (
                  <span className={styles.statusPending}>Pending</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default RadarScanner;
