"use client";

import type { InputHTMLAttributes } from "react";

type InputMode = InputHTMLAttributes<HTMLInputElement>["inputMode"];
type EnterKeyHint = InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  enterKeyHint,
  autoCapitalize,
  helperText,
  error,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url" | "password" | "number" | "search";
  inputMode?: InputMode;
  autoComplete?: string;
  enterKeyHint?: EnterKeyHint;
  autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        className="text-[14px] text-foreground mb-1 block"
        style={{ fontWeight: 500 }}
      >
        {label}
        {required && (
          <span className="ml-1 text-status-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        inputMode={inputMode}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        autoCapitalize={autoCapitalize}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error
            ? `${label}-error`
            : helperText
              ? `${label}-helper`
              : undefined
        }
        className={`w-full min-h-11 border rounded-lg px-3 py-2 text-base sm:text-sm text-foreground bg-background focus:outline-none transition-colors ${
          error
            ? "border-status-danger focus:border-status-danger"
            : "border-border focus:border-primary"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      />
      {error ? (
        <p
          id={`${label}-error`}
          role="alert"
          className="mt-1 text-xs text-status-danger"
        >
          {error}
        </p>
      ) : helperText ? (
        <p id={`${label}-helper`} className="mt-1 text-xs text-tertiary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
