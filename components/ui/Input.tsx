'use client'

import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full px-3 py-2.5 rounded-lg border bg-white text-stone-900
            placeholder:text-stone-400
            focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
            dark:bg-stone-800 dark:border-stone-600 dark:text-stone-100
            dark:placeholder:text-stone-500 dark:focus:ring-amber-500
            ${error ? 'border-red-400 dark:border-red-500' : 'border-stone-300'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`
            w-full px-3 py-2.5 rounded-lg border bg-white text-stone-900
            placeholder:text-stone-400 resize-none
            focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
            dark:bg-stone-800 dark:border-stone-600 dark:text-stone-100
            dark:placeholder:text-stone-500 dark:focus:ring-amber-500
            ${error ? 'border-red-400 dark:border-red-500' : 'border-stone-300'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, options, placeholder, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`
            w-full px-3 py-2.5 rounded-lg border bg-white text-stone-900
            focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
            dark:bg-stone-800 dark:border-stone-600 dark:text-stone-100
            dark:focus:ring-amber-500
            ${error ? 'border-red-400 dark:border-red-500' : 'border-stone-300'}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
