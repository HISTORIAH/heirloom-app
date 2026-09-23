/**
 * A development-only wallet that signs with a local key.
 *
 * It exists so the app can be driven end to end against a local validator —
 * by the browser tests, or by hand — without a wallet extension that knows
 * about localnet. `main.tsx` loads it only on the Vite dev server with
 * `VITE_DEV_BURNER_WALLET=true`, so it is never part of a production build.
 *
 * The key comes from `?burner=<base58 32-byte seed>`, which is how the tests
 * pick a wallet, or else from a random seed kept in localStorage.
 */
import {
  createKeyPairFromPrivateKeyBytes,
  createSolanaRpc,
  getAddressFromPublicKey,
  getBase58Decoder,
  getBase58Encoder,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  getTransactionEncoder,
  signBytes,
  type Address,
  type ReadonlyUint8Array,
  type Transaction,
} from "@solana/kit";
import { SOLANA_RPC_ENDPOINT } from "@/config";

const STORAGE_KEY = "stocks.dev.burner";
const CHAINS = ["solana:localnet", "solana:devnet", "solana:testnet", "solana:mainnet"] as const;
const FEATURES = ["solana:signAndSendTransaction", "solana:signTransaction"] as const;

const ICON =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#ffd400"/><text x="16" y="22" font-size="16" text-anchor="middle" font-family="sans-serif">B</text></svg>',
  );

/** A mutable copy of kit's read-only bytes, which wallet-standard hands around as plain arrays. */
const toBytes = (bytes: ReadonlyUint8Array) =>
  new Uint8Array(bytes as unknown as ArrayLike<number>);

function seedBytes(): Uint8Array {
  const fromUrl = new URL(window.location.href).searchParams.get("burner");
  const stored = fromUrl ?? window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const bytes = toBytes(getBase58Encoder().encode(stored));
    if (bytes.length === 32) {
      window.localStorage.setItem(STORAGE_KEY, stored);
      return bytes;
    }
  }
  const seed = crypto.getRandomValues(new Uint8Array(32));
  window.localStorage.setItem(STORAGE_KEY, getBase58Decoder().decode(seed));
  return seed;
}

type Listener = (properties: { accounts?: unknown[] }) => void;

export async function registerBurnerWallet(): Promise<Address> {
  const keyPair = await createKeyPairFromPrivateKeyBytes(seedBytes());
  const address = await getAddressFromPublicKey(keyPair.publicKey);
  const rpc = createSolanaRpc(SOLANA_RPC_ENDPOINT);
  const decodeTransaction = getTransactionDecoder();
  const encodeTransaction = getTransactionEncoder();
  const listeners = new Set<Listener>();

  const account = Object.freeze({
    address,
    publicKey: toBytes(getBase58Encoder().encode(address)),
    chains: CHAINS,
    features: FEATURES,
    label: "Burner",
  });

  const sign = async (bytes: Uint8Array): Promise<Transaction> => {
    const transaction = decodeTransaction.decode(bytes);
    const signature = await signBytes(keyPair.privateKey, transaction.messageBytes);
    return { ...transaction, signatures: { ...transaction.signatures, [address]: signature } };
  };

  const wallet = {
    version: "1.0.0" as const,
    name: "Heirloom Burner (dev)",
    icon: ICON as `data:image/svg+xml;base64,${string}`,
    chains: CHAINS,
    accounts: [] as (typeof account)[],
    features: {
      "standard:connect": {
        version: "1.0.0",
        connect: async () => {
          wallet.accounts = [account];
          listeners.forEach((listener) => listener({ accounts: wallet.accounts }));
          return { accounts: wallet.accounts };
        },
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: async () => {
          wallet.accounts = [];
          listeners.forEach((listener) => listener({ accounts: wallet.accounts }));
        },
      },
      "standard:events": {
        version: "1.0.0",
        on: (_event: "change", listener: Listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: async (...inputs: { transaction: Uint8Array }[]) =>
          Promise.all(
            inputs.map(async ({ transaction }) => {
              const signed = await sign(transaction);
              return { signedTransaction: toBytes(encodeTransaction.encode(signed)) };
            }),
          ),
      },
      "solana:signAndSendTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction: async (...inputs: { transaction: Uint8Array }[]) =>
          Promise.all(
            inputs.map(async ({ transaction }) => {
              const signed = await sign(transaction);
              const signature = await rpc
                .sendTransaction(getBase64EncodedWireTransaction(signed), {
                  encoding: "base64",
                  preflightCommitment: "confirmed",
                })
                .send();
              return { signature: toBytes(getBase58Encoder().encode(signature)) };
            }),
          ),
      },
    },
  };

  // The Wallet Standard registration handshake, without the helper package.
  const register = ({ register }: { register: (w: unknown) => void }) => register(wallet);
  window.dispatchEvent(
    Object.assign(new Event("wallet-standard:register-wallet"), { detail: register }),
  );
  window.addEventListener("wallet-standard:app-ready", (event) =>
    register((event as CustomEvent).detail),
  );

  return address;
}
