import { useState } from "react";
import { cn } from "@/lib/utils";
import { VERIFY_CODE_LENGTH } from "@/lib/constants";
import { normalizeCode } from "@/lib/reminders";

/**
 * The email code as eight boxes, one per character, in two halves. A transparent input over them
 * does the typing, pasting and one-time-code autofill; the box being typed into is yellow.
 */
export default function CodeInput({
  value,
  onChange,
  label,
  error,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const cursor = Math.min(value.length, VERIFY_CODE_LENGTH - 1);

  return (
    <div className="relative flex gap-1.5">
      {Array.from({ length: VERIFY_CODE_LENGTH }, (_, i) => {
        const char = value[i] ?? "";
        const active = focused && !disabled && i === cursor;
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "flex h-14 min-w-0 flex-1 items-center justify-center rounded-lg border-2 font-mono text-xl font-bold transition-[background-color,border-color,transform] duration-150",
              error
                ? "border-destructive"
                : char || active
                  ? "border-foreground"
                  : "border-tile-line",
              active ? "-translate-y-0.5 bg-accent-yellow" : "bg-background",
              i === VERIFY_CODE_LENGTH / 2 - 1 && "mr-2",
            )}
          >
            {char}
          </span>
        );
      })}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(normalizeCode(e.target.value).slice(0, VERIFY_CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // No maxLength: a pasted "ABCD 2345" is longer than the code until it's normalised.
        autoFocus={autoFocus}
        disabled={disabled}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="one-time-code"
        spellCheck={false}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-hidden selection:bg-transparent"
      />
    </div>
  );
}
