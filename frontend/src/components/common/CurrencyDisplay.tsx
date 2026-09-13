import React from 'react';
import { formatCurrency } from '../../utils/formatters.js';

interface CurrencyDisplayProps {
  amount: number | undefined | null;
  className?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ amount, className = '' }) => {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      {formatCurrency(amount)}
    </span>
  );
};
