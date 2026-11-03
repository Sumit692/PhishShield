import React from 'react';
import { Button as ArcButton, type ButtonVariant, type ButtonSize } from './arc';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
  ...props
}) => {
  const arcVariant: ButtonVariant =
    variant === 'outline' ? 'secondary' :
    (variant as ButtonVariant);

  return (
    <ArcButton
      variant={arcVariant}
      size={size as ButtonSize}
      loading={loading}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {icon && <span style={{ marginRight: '6px', display: 'inline-flex', verticalAlign: 'middle' }}>{icon}</span>}
      {children}
    </ArcButton>
  );
};
