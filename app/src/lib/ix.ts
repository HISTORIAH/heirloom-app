// import { getTransferCheckedInstruction } from "@solana-program/token";
// import { getTransferSolInstruction } from "@solana-program/system";
// import { Address } from "@solana/kit";

// export async function transferSplTokens(args: {
//   destinationTokenAcc: Address,
//   sourceTokenAcc: Address,
//   tokenAmount: bigint,
//   authority: Address,
//   decimals: number,
//   mint: Address
// }) {
//   const { authority, mint, tokenAmount, decimals, sourceTokenAcc, destinationTokenAcc } = args;

//   return getTransferCheckedInstruction({
//       source: sourceTokenAcc,
//       mint: mint,
//       destination: destinationTokenAcc,
//       authority, // Owner or delegate approving the transfer.
//       amount: tokenAmount,
//       decimals
//     });
// }

// export async function transferLamports() {
//   return getTransferSolInstruction({
//     source: sender,
//     destination: recipient.address,
//     amount: transferAmount,
//   });
// }
