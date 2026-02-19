import React from 'react';
import '@/styles/FormField.css';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'textarea' | 'select';
  value: any;
  error?: string;
  touched?: boolean;
  onChange: (name: string, value: any) => void;
  onBlur?: (name: string) => void;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  error,
  touched,
  onChange,
  onBlur,
  placeholder,
  required,
  options
}) => {
  const showError = touched && error;

  return (
    <div className="form-field">
      <label htmlFor={name} className="form-field-label">
        {label}
        {required && <span className="required-mark">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          onBlur={() => onBlur?.(name)}
          placeholder={placeholder}
          className={`form-field-input ${showError ? 'error' : ''}`}
          rows={4}
        />
      ) : type === 'select' && options ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          onBlur={() => onBlur?.(name)}
          className={`form-field-input ${showError ? 'error' : ''}`}
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          onBlur={() => onBlur?.(name)}
          placeholder={placeholder}
          className={`form-field-input ${showError ? 'error' : ''}`}
        />
      )}
      
      {showError && (
        <span className="form-field-error">{error}</span>
      )}
    </div>
  );
};
