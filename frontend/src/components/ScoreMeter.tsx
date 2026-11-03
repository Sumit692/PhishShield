import React from 'react';
import { Gauge } from './arc';
import styles from './ScoreMeter.module.css';

interface ScoreMeterProps {
  score: number;
  level: 'low' | 'moderate' | 'high';
}

export const ScoreMeter: React.FC<ScoreMeterProps> = ({ score, level }) => {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className={styles.container} data-risk-level={level}>
      <div className={styles.scoreHeader}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Assessed Phishing Risk
        </span>
        <div className={styles.scoreValueWrap}>
          <span className={styles.scoreNumber} data-score={boundedScore}>
            {boundedScore}
          </span>
          <span className={styles.scoreMax}>/ 100</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-2) 0' }}>
        <Gauge
          value={boundedScore}
          label="Phishing Risk Score"
          thresholds={[
            { from: 0, tone: 'success', label: 'Low Risk' },
            { from: 30, tone: 'warning', label: 'Moderate Risk' },
            { from: 60, tone: 'danger', label: 'High Risk' },
          ]}
        />
      </div>

      <div
        className={styles.meterTrack}
        role="progressbar"
        aria-valuenow={boundedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Risk score ${boundedScore} out of 100`}
      >
        <div className={styles.segmentLow} title="Low Risk Range (0–29)" />
        <div className={styles.segmentMod} title="Moderate Risk Range (30–59)" />
        <div className={styles.segmentHigh} title="High Risk Range (60–100)" />
        <div
          className={styles.marker}
          style={{ left: `${boundedScore}%` }}
          aria-hidden="true"
        />
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDotLow} /> Low (0–29)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDotMod} /> Moderate (30–59)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDotHigh} /> High (60–100)
        </span>
      </div>
    </div>
  );
};
