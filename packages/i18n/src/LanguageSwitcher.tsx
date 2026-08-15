import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, shortFor } from "./languages";
import { persistLocale } from "./init";

export interface LanguageSwitcherProps {
  className?: string;
  menuClassName?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  chevronClassName?: string;
  globeClassName?: string;
}

export function LanguageSwitcher({
  className,
  menuClassName,
  itemClassName,
  activeItemClassName,
  chevronClassName,
  globeClassName,
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = i18n.resolvedLanguage ?? i18n.language;

  const select = (code: string) => {
    void i18n.changeLanguage(code);
    persistLocale(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
        className={className}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={globeClassName}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8M3.6 15h16.8" />
          <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
        </svg>
        {shortFor(current)}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={chevronClassName}
        >
          <path d="m8 9 4-4 4 4" />
          <path d="m16 15-4 4-4-4" />
        </svg>
      </button>

      {open && (
        <div role="listbox" className={menuClassName}>
          {LANGUAGES.map((lang) => {
            const selected = lang.code === current;
            const cls = selected
              ? `${itemClassName ?? ""} ${activeItemClassName ?? ""}`.trim()
              : itemClassName;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => select(lang.code)}
                title={lang.name}
                className={cls}
              >
                {lang.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
