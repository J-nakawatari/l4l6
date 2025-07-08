import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  onClick?: () => void;
}

export default function StatsCard({
  label,
  value,
  icon,
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/20',
  change,
  subtitle,
  onClick,
}: StatsCardProps) {
  const cardClass = onClick ? 'stats-card card-hover cursor-pointer' : 'stats-card';

  return (
    <div className={cardClass} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="stats-label">{label}</p>
          <p className="stats-value">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
          {change && (
            <div className={`stats-change ${change.isPositive ? 'positive' : 'negative'}`}>
              {change.isPositive ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              <span>{change.value}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}