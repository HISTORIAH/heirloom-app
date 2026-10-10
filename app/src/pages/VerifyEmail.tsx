import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, Mail, ShieldCheck, Wallet } from "lucide-react";
import { useSignMessage } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/surface/Panel";
import PageHeader from "@/components/PageHeader";
import CodeInput from "@/components/reminders/CodeInput";
import VerifiedSeal from "@/components/reminders/VerifiedSeal";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useWallet } from "@/contexts/WalletContext";
import { useAuthenticate } from "@/hooks/useAuth";
import { useVerifyEmail } from "@/hooks/useReminders";
import { ApiError, isUnauthorized } from "@/lib/api";
import { VERIFY_CODE_LENGTH, VERIFY_CODE_PATTERN } from "@/lib/constants";
import { verifyErrorKey } from "@/lib/reminders";
import { useTranslation } from "@heirloom/i18n";

type VerifyState =
  | { kind: "verifying" }
  | { kind: "form"; errorKey?: string } // typed code entry
  | { kind: "sign_in"; code?: string } // no session, or one for another wallet
  | { kind: "success" }
  | { kind: "wrong_wallet" }
  | { kind: "invalid_link"; errorKey: string };

const isForbidden = (err: unknown) => err instanceof ApiError && err.code === "FORBIDDEN";

/** The panel body for one state: icon, title, description, then any actions. */
function StateBlock({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="mx-auto mt-4 flex justify-center">{icon}</div>
      <h2 className="ed-h3 mt-3">{title}</h2>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      {children}
    </>
  );
}

/**
 * Verifies with a connected wallet. Keyed by address in the parent, so switching wallets starts
 * over: a session cookie belongs to one wallet, and the new one has to sign in for itself.
 */
function VerifyWithWallet({
  account,
  estate,
  linkCode,
  onSwitchWallet,
}: {
  account: UiWalletAccount;
  estate: string;
  linkCode: string;
  onSwitchWallet: () => void;
}) {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  const signMessage = useSignMessage(account);
  const authMutation = useAuthenticate(signMessage);
  const verifyMutation = useVerifyEmail(estate);

  const [state, setState] = useState<VerifyState>(
    linkCode ? { kind: "verifying" } : { kind: "form" },
  );
  const [typedCode, setTypedCode] = useState("");
  // Whether this wallet signed in on this page: a 403 before that may just be a session left
  // over from another wallet, so we ask to sign in rather than call it the wrong wallet.
  const signedIn = useRef(false);
  const started = useRef(false);

  const attempt = useCallback(
    async (code: string, fromLink: boolean) => {
      setState({ kind: "verifying" });
      try {
        await verifyMutation.mutateAsync({ code });
        setState({ kind: "success" });
      } catch (err) {
        if (isUnauthorized(err) || (isForbidden(err) && !signedIn.current)) {
          setState({ kind: "sign_in", code });
        } else if (isForbidden(err)) {
          setState({ kind: "wrong_wallet" });
        } else if (fromLink) {
          setState({ kind: "invalid_link", errorKey: verifyErrorKey(err) });
        } else {
          setState({ kind: "form", errorKey: verifyErrorKey(err) });
        }
      }
    },
    // mutateAsync is stable; the whole mutation object isn't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estate],
  );

  // Codes work once: don't let a double-mounted effect spend it twice.
  useEffect(() => {
    if (!linkCode || started.current) return;
    started.current = true;
    void attempt(linkCode, true);
  }, [linkCode, attempt]);

  const signIn = async (code?: string) => {
    try {
      await authMutation.mutateAsync({ address: account.address });
      signedIn.current = true;
      if (code) await attempt(code, code === linkCode);
      else setState({ kind: "form" });
    } catch {
      // Rejected in the wallet, or the challenge failed: stay put so they can try again.
    }
  };

  const typedValid = VERIFY_CODE_PATTERN.test(typedCode);
  const malformed = typedCode.length === VERIFY_CODE_LENGTH && !typedValid;

  switch (state.kind) {
    case "verifying":
      return (
        <StateBlock
          icon={<Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />}
          title={t("verifyEmail.verifying")}
        />
      );

    case "sign_in":
      return (
        <StateBlock
          icon={<ShieldCheck className="h-8 w-8" strokeWidth={1.75} />}
          title={t("verifyEmail.signInTitle")}
          description={t("verifyEmail.signInDesc")}
        >
          <Button
            variant="flat-yellow"
            className="mt-5"
            disabled={authMutation.isPending}
            onClick={() => void signIn(state.code)}
          >
            {authMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("notifications.signing")}
              </>
            ) : (
              t("verifyEmail.signIn")
            )}
          </Button>
          {authMutation.isError && (
            <p className="mt-2 text-xs font-medium text-destructive">
              {t("notifications.signInFailedDesc")}
            </p>
          )}
        </StateBlock>
      );

    case "success":
      return (
        <div className="-mt-2">
          <VerifiedSeal />
          <h2
            className="seal-rise mt-2 text-[clamp(1.75rem,5vw,2.25rem)] font-semibold leading-none tracking-[-0.035em]"
            style={{ animationDelay: "0.42s" }}
          >
            {t("verifyEmail.successTitle")}
          </h2>
          <p
            className="seal-rise mx-auto mt-3 max-w-xs text-sm text-muted-foreground"
            style={{ animationDelay: "0.5s" }}
          >
            {t("verifyEmail.successDesc")}
          </p>
          <div className="seal-rise mt-6" style={{ animationDelay: "0.58s" }}>
            <Button variant="flat-yellow" className="w-full" onClick={() => navigate("/estates")}>
              {t("verifyEmail.goToDashboard")}
            </Button>
          </div>
        </div>
      );

    case "wrong_wallet":
      return (
        <StateBlock
          icon={<AlertTriangle className="h-8 w-8 text-accent-yellow" strokeWidth={2} />}
          title={t("verifyEmail.wrongWalletTitle")}
          description={t("verifyEmail.wrongWalletDesc")}
        >
          <Button variant="flat" className="mt-5" onClick={onSwitchWallet}>
            {t("verifyEmail.switchWallet")}
          </Button>
        </StateBlock>
      );

    case "invalid_link":
      return (
        <StateBlock
          icon={<AlertTriangle className="h-8 w-8 text-destructive" strokeWidth={2} />}
          title={t("verifyEmail.invalidCodeTitle")}
          description={
            state.errorKey === "notifications.codeInvalid"
              ? t("verifyEmail.invalidCodeDesc")
              : t(state.errorKey)
          }
        >
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="flat" onClick={() => setState({ kind: "form" })}>
              {t("verifyEmail.enterCodeInstead")}
            </Button>
            <Button variant="flat-outline" onClick={() => navigate("/estates")}>
              {t("verifyEmail.goToDashboard")}
            </Button>
          </div>
        </StateBlock>
      );

    case "form":
      return (
        <>
          <h2 className="ed-h3 mt-4">{t("verifyEmail.enterCodeTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("verifyEmail.enterCodeDesc")}</p>
          <form
            className="mt-6 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              if (typedValid) void attempt(typedCode, false);
            }}
          >
            <CodeInput
              value={typedCode}
              onChange={(code) => {
                setTypedCode(code);
                if (state.errorKey) setState({ kind: "form" });
                // A full, well-formed code checks itself.
                if (VERIFY_CODE_PATTERN.test(code)) void attempt(code, false);
              }}
              label={t("verifyEmail.enterCodeTitle")}
              error={malformed || !!state.errorKey}
              autoFocus
            />
            <p aria-live="polite" className="mt-2 min-h-4 text-xs font-medium text-destructive">
              {state.errorKey
                ? t(state.errorKey)
                : malformed
                  ? t("verifyEmail.codeFormatHint")
                  : ""}
            </p>
            <Button type="submit" variant="flat" className="mt-3 w-full" disabled={!typedValid}>
              {t("verifyEmail.verify")}
            </Button>
          </form>
        </>
      );
  }
}

const VerifyEmailPage = () => {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  const { account } = useWallet();
  const [searchParams] = useSearchParams();
  const estate = searchParams.get("estate") ?? "";
  const linkCode = (searchParams.get("code") ?? "").trim().toUpperCase();
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  // Ask for a wallet straight away; the page can't do anything without one.
  useEffect(() => {
    if (!account && estate) setWalletDialogOpen(true);
  }, [account, estate]);

  let body: ReactNode;
  if (!estate) {
    body = (
      <StateBlock
        icon={<AlertTriangle className="h-8 w-8 text-destructive" strokeWidth={2} />}
        title={t("verifyEmail.invalidCodeTitle")}
        description={t("verifyEmail.invalidCodeDesc")}
      >
        <Button variant="flat-outline" className="mt-5" onClick={() => navigate("/estates")}>
          {t("verifyEmail.goToDashboard")}
        </Button>
      </StateBlock>
    );
  } else if (!account) {
    body = (
      <StateBlock
        icon={<Wallet className="h-8 w-8" strokeWidth={1.75} />}
        title={t("verifyEmail.connectTitle")}
        description={t("verifyEmail.connectDesc")}
      >
        <Button variant="flat-yellow" className="mt-5" onClick={() => setWalletDialogOpen(true)}>
          {t("verifyEmail.connect")}
        </Button>
      </StateBlock>
    );
  } else {
    body = (
      <VerifyWithWallet
        key={account.address}
        account={account}
        estate={estate}
        linkCode={linkCode}
        onSwitchWallet={() => setWalletDialogOpen(true)}
      />
    );
  }

  return (
    <>
      <div className="flex-1 overflow-x-clip bg-background">
        <PageHeader onConnectWallet={() => setWalletDialogOpen(true)} />
        <main className="app-shell px-[var(--page-pad)] py-[clamp(1.5rem,6vh,7rem)]">
          {/* The seal replaces the mail mark once verified. */}
          <Panel className="mx-auto max-w-md text-center [&:has(.seal-pop)>svg:first-child]:hidden">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            {body}
          </Panel>
        </main>
      </div>
      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default VerifyEmailPage;
