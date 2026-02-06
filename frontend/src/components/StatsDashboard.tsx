import React from 'react';
import '../styles/StatsDashboard.css';

interface StatCardData {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface StatsDashboardProps {
  stats: StatCardData[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats }) => {
  return (
    <div className="stats-dashboard">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card-modern">
          <div className="stat-card-header">
            <h4 className="stat-card-title">{stat.title}</h4>
            {stat.icon && <span className="stat-card-icon">{stat.icon}</span>}
          </div>
          <div className="stat-card-value">{stat.value}</div>
          {stat.trend && (
            <div className={`stat-card-trend ${stat.trend.isPositive ? 'positive' : 'negative'}`}>
              <span className="trend-icon">
                {stat.trend.isPositive ? '↑' : '↓'}
              </span>
              <span className="trend-value">
                {Math.abs(stat.trend.value)}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const StatsCard: React.FC<{ title: string; value: string | number; subtitle?: string }> = ({
  title,
  value,
  subtitle
}) => {
  return (
    <div className="simple-stat-card">
      <div className="simple-stat-title">{title}</div>
      <div className="simple-stat-value">{value}</div>
      {subtitle && <div className="simple-stat-subtitle">{subtitle}</div>}
    </div>
  );
};
