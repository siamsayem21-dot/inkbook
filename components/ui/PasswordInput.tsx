"use client";

import { useId, useState, forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  /** Extra content rendered to the right of the label (e.g. a "Forgot password?" link). */
  labelAction?: React.ReactNode;
  error?: boolean;
}

/**
 * Password field with a show/hide toggle. Previously auth forms had a plain
 * `type="password"` input with no visibility control at all — this is the
 * fix for that gap (design mission Stage 7), not a contrast tweak.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { id, label, labelAction, error, className = "", ...rest },
  ref
) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={inputId} className="text-xs font-medium text-zinc-500">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          className={`w-full rounded-lg border px-4 py-2.5 pr-11 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-colors ${
            error ? "border-red-300 focus:border-red-500" : "border-zinc-200 focus:border-violet-500"
          } ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          tabIndex={0}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 rounded-r-lg transition-colors"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
});

export default PasswordInput;
