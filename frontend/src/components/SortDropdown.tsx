import React from 'react';
import '@/styles/SortDropdown.css';

export type SortOption = {
  label: string;
  value: string;
};

interface SortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  options,
  value,
  onChange,
  label = 'Sort by:'
}) => {
  return (
    <div className="sort-dropdown">
      {label && <label className="sort-label">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sort-select"
        aria-label="Sort options"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="sort-icon">▼</span>
    </div>
  );
};
