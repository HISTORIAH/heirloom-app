import { HEIRLOOM_PROGRAM_ADDRESS, parseHeirloomInstruction } from "@historiah/heirloom";
import {
  SOLANA_ERROR__INSTRUCTION_PLANS__MAX_INSTRUCTIONS_PER_TRANSACTION_EXCEEDED,
  SolanaError,
  type Instruction,
} from "@solana/kit";
import { HEIRLOOM_INSTRUCTION_TRACE_COSTS, MAX_INSTRUCTION_TRACE_LENGTH } from "@/lib/constants";

/** Trace entries one instruction uses: 1 for itself, plus its CPIs for Heirloom ones. */
function instructionTraceCost(instruction: Instruction): number {
  if (instruction.programAddress !== HEIRLOOM_PROGRAM_ADDRESS || !instruction.data) return 1;
  const parsed = parseHeirloomInstruction({ ...instruction, data: instruction.data });
  const cost = HEIRLOOM_INSTRUCTION_TRACE_COSTS[parsed.instructionType];
  if (!cost) return 1;
  const movesToken = "mint" in parsed.accounts && parsed.accounts.mint !== undefined;
  return movesToken ? cost.token : cost.sol;
}

/** The instruction trace a message would run, from the measured per-instruction costs. */
export function estimateInstructionTrace(message: {
  instructions: readonly Instruction[];
}): number {
  return message.instructions.reduce((total, ix) => total + instructionTraceCost(ix), 0);
}

/**
 * Planner hook: rejects a message whose estimated trace passes the runtime's cap. Kit's
 * planner treats this error as "transaction full" and moves the instruction to a new
 * transaction, the same as when the instruction count limit is hit.
 */
export function assertTraceFits<TMessage extends { instructions: readonly Instruction[] }>(
  message: TMessage,
): TMessage {
  const trace = estimateInstructionTrace(message);
  if (trace > MAX_INSTRUCTION_TRACE_LENGTH) {
    throw new SolanaError(
      SOLANA_ERROR__INSTRUCTION_PLANS__MAX_INSTRUCTIONS_PER_TRANSACTION_EXCEEDED,
      {
        maxInstructions: MAX_INSTRUCTION_TRACE_LENGTH,
        numInstructions: trace,
      },
    );
  }
  return message;
}
