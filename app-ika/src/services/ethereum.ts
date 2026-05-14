type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

/**
 * Sign a 32-byte message hash with MetaMask personal_sign (EIP-191).
 * MetaMask applies the prefix: keccak256("\x19Ethereum Signed Message:\n32" + hash).
 * The backend accounts for this prefix when building the secp256k1 precompile instruction.
 *
 * `messageHashHex` — 32 bytes as hex WITHOUT 0x prefix.
 * `ethAddress`     — the Ethereum address to sign with (MetaMask must control it).
 */
export async function signMessageHash(messageHashHex: string, ethAddress: string): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask not installed.");

  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const normalized = ethAddress.toLowerCase();
  if (!accounts.some((a) => a.toLowerCase() === normalized)) {
    throw new Error(
      `Address ${ethAddress} is not connected in MetaMask. Switch to that account and try again.`
    );
  }

  return window.ethereum.request({
    method: "personal_sign",
    params: [`0x${messageHashHex}`, ethAddress],
  }) as Promise<string>;
}
