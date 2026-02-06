import { useState } from 'react';

type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

type FieldValidations<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

type FieldErrors<T> = {
  [K in keyof T]?: string;
};

export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validations: FieldValidations<T>
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [touched, setTouched] = useState<{ [K in keyof T]?: boolean }>({});

  const validateField = (field: keyof T, value: T[keyof T]): string | undefined => {
    const fieldValidations = validations[field];
    if (!fieldValidations) return undefined;

    for (const rule of fieldValidations) {
      if (!rule.validate(value)) {
        return rule.message;
      }
    }
    return undefined;
  };

  const validateAllFields = (): boolean => {
    const newErrors: FieldErrors<T> = {};
    let isValid = true;

    for (const field in validations) {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, values[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAllFields,
    resetForm,
    setValues
  };
};

// Common validation rules
export const validators = {
  required: (message = 'This field is required') => ({
    validate: (value: any) => {
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== null && value !== undefined;
    },
    message
  }),

  minLength: (min: number, message?: string) => ({
    validate: (value: string) => value.length >= min,
    message: message || `Minimum ${min} characters required`
  }),

  maxLength: (max: number, message?: string) => ({
    validate: (value: string) => value.length <= max,
    message: message || `Maximum ${max} characters allowed`
  }),

  email: (message = 'Invalid email address') => ({
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),

  number: (message = 'Must be a valid number') => ({
    validate: (value: any) => !isNaN(Number(value)),
    message
  }),

  min: (min: number, message?: string) => ({
    validate: (value: number) => value >= min,
    message: message || `Minimum value is ${min}`
  }),

  max: (max: number, message?: string) => ({
    validate: (value: number) => value <= max,
    message: message || `Maximum value is ${max}`
  }),

  url: (message = 'Invalid URL') => ({
    validate: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message
  })
};
