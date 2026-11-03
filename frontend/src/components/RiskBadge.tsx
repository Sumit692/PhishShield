import React from 'react';
import { Badge, type BadgeTone } from './arc';

interface RiskBadgeProps {
  level: 'low' | 'moderate' | 'high' | 'info';
  label?: string;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, label, className = '' }) => {
  const toneMap: Record<string, BadgeTone> = {
    low: 'success',
    moderate: 'warning',
    high: 'danger',
    info: 'info',
  };

  const displayLabel = label || (
    level === 'low' ? 'Low Risk' :
    level === 'moderate' ? 'Moderate Risk' :
    level === 'high' ? 'High Risk' : 'Info'
  );

  return (
    <Badge
      tone={toneMap[level] || 'neutral'}
      size="md"
      className={className}
      data-risk-level={level}
    >
      {displayLabel}
    </Badge>
  );
};
