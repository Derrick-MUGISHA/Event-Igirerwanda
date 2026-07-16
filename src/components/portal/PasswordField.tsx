"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/* Password input with a show/hide toggle, styled to match the portal's
   branded Field. Autocomplete is left to the caller (sign-in vs. new). */
export default function PasswordField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-left">
      <span className="label mb-1.5 block text-xs font-semibold text-cream-dim">
        {label}
      </span>
      <div className="relative">
        <input
          {...props}
          type={show ? "text" : "password"}
          className="w-full rounded-lg border border-line bg-panel-2 px-3.5 py-2.5 pr-11 text-cream transition-colors placeholder:text-cream-dim/60 focus:border-orange focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-cream-dim transition-colors hover:text-orange"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );
}
