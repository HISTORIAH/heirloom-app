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
}

export function LanguageSwitcher({
  className,
  menuClassName,
  itemClassName,
  activeItemClassName,
  chevronClassName,
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
        {shortFor(current)}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 200ms",
          }}
          className={chevronClassName}
        >
          <path d="m6 9 6 6 6-6" />
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
                {lang.short}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}