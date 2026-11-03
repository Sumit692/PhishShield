import React from 'react';
import type { Indicator } from '../types';
import { RiskBadge } from './RiskBadge';
import styles from './IndicatorItem.module.css';

interface IndicatorItemProps {
  indicator: Indicator;
}

export const IndicatorItem: React.FC<IndicatorItemProps> = ({ indicator }) => {
  const badgeLevel =
    indicator.severity === 'high' ? 'high' :
    indicator.severity === 'medium' ? 'moderate' :
    indicator.severity === 'low' ? 'low' : 'info';

  const badgeLabel =
    indicator.severity === 'high' ? 'High Risk' :
    indicator.severity === 'medium' ? 'Warning' :
    indicator.severity === 'low' ? 'Notice' : 'Standard';

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <RiskBadge level={badgeLevel} label={badgeLabel} />
          <h4 className={styles.title}>{indicator.title}</h4>
        </div>
        {indicator.value && (
          <span className={styles.valueTag}>
            {indicator.value}
          </span>
        )}
      </div>
      <p className={styles.description}>
        {indicator.description}
      </p>
    </div>
  );
};
