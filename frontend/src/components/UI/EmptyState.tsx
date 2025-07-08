import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state p-12">
      {icon && (
        <div className="empty-state-icon">
          {icon}
        </div>
      )}
      <h4 className="empty-state-title">{title}</h4>
      {message && (
        <p className="empty-state-message">{message}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary btn-md mt-4"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}