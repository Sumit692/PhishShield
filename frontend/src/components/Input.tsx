import React, { forwardRef } from 'react';
import { Input as ArcInput, PasswordField as ArcPasswordField } from './arc';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label = '', error, helperText, isPassword = false, ...props },
  ref
) {
  if (isPassword) {
    return (
      <ArcPasswordField
        ref={ref}
        label={label}
        description={helperText || error}
        {...props}
      />
    );
  }

  return (
    <ArcInput
      ref={ref}
      label={label}
      error={error}
      description={helperText}
      {...props}
    />
  );
});
