import { useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, Loader2, Search } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/surface/Panel";

/**
 * Finding an estate by address: the fallback when the scan doesn't find it. `onLookup` resolves
 * to an error message, or null once the estate is found and shown.
 */
export const EstateLookupForm: React.FC<{
  idPrefix: string;
  /** Ask for the heir too. The heir page leaves it out: the heir is the connected wallet. */
  withHeir: boolean;
  primary?: boolean;
  onLookup: (owner: string, heir: string) => Promise<string | null>;
  /** Shown beside the lookup button, e.g. Switch wallet. */
  extraAction?: ReactNode;
}> = ({ idPrefix, withHeir, primary = false, onLookup, extraAction }) => {
  const { t } = useTranslation("app");
  const [owner, setOwner] = useState("");
  const [heir, setHeir] = useState("");
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = owner.trim() !== "" && (!withHeir || heir.trim() !== "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || looking) return;
    setLooking(true);
    setError(null);
    const err = await onLookup(owner.trim(), heir.trim());
    setError(err);
    if (!err) {
      setOwner("");
      setHeir("");
    }
    setLooking(false);
  };

  const field = (id: string, label: string, placeholder: string, value: string, set: (v: string) => void) => (
    <div>
      <label className="ed-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => set(e.target.value)}
        maxLength={128}
        spellCheck={false}
        autoComplete="off"
        className="ed-input mt-2 font-mono"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {field(`${idPrefix}-owner`, t("roles.ownerLabel"), t("roles.ownerPlaceholder"), owner, setOwner)}
      {withHeir &&
        field(`${idPrefix}-heir`, t("roles.heirLabel"), t("roles.heirPlaceholder"), heir, setHeir)}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant={primary ? "flat-yellow" : "flat-outline"} disabled={!ready || looking}>
          {looking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("roles.lookingUp")}
            </>
          ) : (
            <>
              <Search className="h-4 w-4" /> {t("roles.lookUpEstate")}
            </>
          )}
        </Button>
        {extraAction}
      </div>
      {error && (
        <p className="flex items-center gap-2 text-sm font-semibold text-accent-red" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
};

/** The lookup folded away under the results, open by default when the scan found nothing. */
export const EstateLookupDetails: React.FC<{
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}> = ({ summary, defaultOpen = false, children }) => (
  <Panel bare>
    <details open={defaultOpen} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold md:p-6 xl:p-7 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-5 pb-5 md:px-6 md:pb-6 xl:px-7 xl:pb-7">{children}</div>
    </details>
  </Panel>
);
