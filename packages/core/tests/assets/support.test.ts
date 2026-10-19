import { describe, expect, test } from "bun:test";

import { heldAmount, isNftAsset, unsupportedReason, type DasAsset } from "@heirloom/core/assets";

const MINT = "So11111111111111111111111111111111111111112";

function asset(fields: Omit<DasAsset, "id">): DasAsset {
  return { id: MINT, ...fields };
}

describe("isNftAsset", () => {
  test("a fungible token is not an NFT", () => {
    const usdc = asset({
      interface: "FungibleToken",
      token_info: { decimals: 6, balance: 5_000_000 },
    });
    expect(isNftAsset(usdc)).toBe(false);
  });

  test("NFT interfaces, Core assets and cNFTs are NFTs", () => {
    expect(isNftAsset(asset({ interface: "V1_NFT" }))).toBe(true);
    expect(isNftAsset(asset({ interface: "ProgrammableNFT" }))).toBe(true);
    expect(isNftAsset(asset({ interface: "MplCoreAsset" }))).toBe(true);
    expect(isNftAsset(asset({ interface: "V1_NFT", compression: { compressed: true } }))).toBe(
      true,
    );
  });

  test("a lone token with no decimals counts as an NFT whatever its interface", () => {
    const odd = asset({ interface: "Custom", token_info: { decimals: 0, balance: "1" } });
    expect(isNftAsset(odd)).toBe(true);
  });
});

describe("unsupportedReason", () => {
  test("a plain NFT or token can go in", () => {
    expect(unsupportedReason(asset({ interface: "V1_NFT" }))).toBeUndefined();
    expect(unsupportedReason(asset({ interface: "FungibleToken" }))).toBeUndefined();
  });

  test("names why the vault can't hold it", () => {
    expect(unsupportedReason(asset({ compression: { compressed: true } }))).toBe("compressed");
    expect(unsupportedReason(asset({ interface: "MplCoreAsset" }))).toBe("core");
    expect(unsupportedReason(asset({ interface: "ProgrammableNFT" }))).toBe("programmable");
    expect(unsupportedReason(asset({ interface: "V1_NFT", ownership: { frozen: true } }))).toBe(
      "frozen",
    );
  });

  test("a frozen pNFT reads as programmable, the more useful reason", () => {
    const pnft = asset({ interface: "ProgrammableNFT", ownership: { frozen: true } });
    expect(unsupportedReason(pnft)).toBe("programmable");
  });
});

describe("heldAmount", () => {
  test("reads the token balance, string or number", () => {
    expect(heldAmount(asset({ token_info: { balance: "12345678901234567890" } }))).toBe(
      12345678901234567890n,
    );
    expect(heldAmount(asset({ token_info: { balance: 42 } }))).toBe(42n);
  });

  test("an NFT with no token info is one item", () => {
    expect(heldAmount(asset({ interface: "MplCoreAsset" }))).toBe(1n);
  });

  test("a burnt asset or a fungible with no balance holds nothing", () => {
    expect(heldAmount(asset({ interface: "V1_NFT", burnt: true }))).toBe(0n);
    expect(heldAmount(asset({ interface: "FungibleToken" }))).toBe(0n);
  });
});
