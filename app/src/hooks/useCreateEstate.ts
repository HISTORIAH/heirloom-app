import { useCallback, useEffect, useRef, useState } from "react";
import { useVault, type CreateEstateInput } from "@/contexts/VaultContext";
import { useRentCost } from "@/hooks/useRentCost";
import { classifyTxError } from "@/lib/heirloom/txErrors";
import {
  ASSET_RECORD_SPACE,
  ESTATE_SPACE,
  NETWORK_FEE_LAMPORTS,
  TOKEN_ACCOUNT_SPACE,
  VAULT_SPACE,
} from "@/lib/constants";
import type { CreateEstateDraft, CreateEstateProgress } from "@/types/create";

/**
 * How the estate will be sent, worked out ahead of time: kit's split into transactions, so the
 * review step can say how many signatures it takes. Null while planning, without a wallet, or
 * when there's nothing to plan.
 */
export function useCreateEstatePreview(input: CreateEstateInput | null): CreateEstateDraft | null {
  const { prepareCreateEstate } = useVault();
  // Kept with the input it was planned for, so a stale plan is never shown for new input.
  const [preview, setPreview] = useState<{
    input: CreateEstateInput;
    draft: CreateEstateDraft | null;
  } | null>(null);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    prepareCreateEstate(input)
      .then((draft) => !cancelled && setPreview({ input, draft }))
      .catch(() => !cancelled && setPreview({ input, draft: null }));
    return () => {
      cancelled = true;
    };
  }, [input, prepareCreateEstate]);

  return preview && preview.input === input ? preview.draft : null;
}

/**
 * Lamports creating the estate costs on top of the deposits: rent for every account it opens
 * (the estate, its vault, and a token account plus asset record per token) and the base fee for
 * each signature. Null while rent is loading.
 */
export function useCreateEstateCost(tokenCount: number, signatureCount: number): number | null {
  const spaces = [
    ESTATE_SPACE,
    VAULT_SPACE,
    ...Array.from({ length: tokenCount }, () => [TOKEN_ACCOUNT_SPACE, ASSET_RECORD_SPACE]).flat(),
  ];
  const rent = useRentCost(spaces);
  return rent === null ? null : rent + signatureCount * NETWORK_FEE_LAMPORTS;
}

const setAt = <T>(items: T[], index: number, value: T): T[] =>
  items.map((item, i) => (i === index ? value : item));

/**
 * Runs the create flow for the signing modal: plans the transactions, sends them one at a
 * time, and records where each one is. After a failure, `retry` starts over if nothing landed
 * yet, or picks up at the failed transaction if the estate already exists.
 */
export function useCreateEstate() {
  const { prepareCreateEstate, createEstateOnChain } = useVault();
  const [draft, setDraft] = useState<CreateEstateDraft | null>(null);
  const [progress, setProgress] = useState<CreateEstateProgress | null>(null);
  const lastInput = useRef<CreateEstateInput | null>(null);

  const update = (change: Partial<CreateEstateProgress>) =>
    setProgress((current) => (current ? { ...current, ...change } : current));

  const send = useCallback(
    async (input: CreateEstateInput, plan: CreateEstateDraft, startAt: number) => {
      try {
        await createEstateOnChain(
          input,
          plan,
          {
            onAwaitingSignature: (index) => update({ stage: "signing", current: index }),
            onSigned: (index) => update({ stage: "confirming", current: index }),
            onConfirmed: (index, signature) =>
              setProgress((current) =>
                current
                  ? { ...current, signatures: setAt(current.signatures, index, signature) }
                  : current,
              ),
          },
          startAt,
        );
        update({ status: "done" });
        return true;
      } catch (error) {
        update({ status: "error", error: classifyTxError(error) });
        return false;
      }
    },
    [createEstateOnChain],
  );

  /** Plans afresh and sends everything. `preview` fills the modal while planning runs. */
  const start = useCallback(
    async (input: CreateEstateInput, preview: CreateEstateDraft | null) => {
      lastInput.current = input;
      setDraft(preview);
      setProgress({
        status: "running",
        stage: "signing",
        current: 0,
        signatures: preview?.transactions.map(() => null) ?? [],
        error: null,
      });
      let plan: CreateEstateDraft;
      try {
        plan = await prepareCreateEstate(input);
      } catch (error) {
        update({ status: "error", error: classifyTxError(error) });
        return false;
      }
      setDraft(plan);
      update({ signatures: plan.transactions.map(() => null) });
      return send(input, plan, 0);
    },
    [prepareCreateEstate, send],
  );

  /** After a failure: start over if the estate wasn't created, else resume where it stopped. */
  const retry = useCallback(async () => {
    const input = lastInput.current;
    if (!input || !progress) return false;
    const estateCreated = progress.signatures[0] != null;
    if (!estateCreated || !draft) return start(input, draft);
    update({ status: "running", stage: "signing", error: null });
    return send(input, draft, progress.current);
  }, [draft, progress, send, start]);

  const close = useCallback(() => setProgress(null), []);

  return { draft, progress, start, retry, close };
}
