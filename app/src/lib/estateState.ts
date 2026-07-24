export type EstateUiState = "active" | "grace" | "claimable" | "distributed";

export interface EstateStateResult {
  state: EstateUiState;
  secondsUntilGrace: number;
  secondsUntilClaimable: number;
}

export interface ComputeEstateStateArgs {
  lastHeartbeat: number;
  heartbeatInterval: number;
  gracePeriod: number;
  pausedUntil: number;
  createdAt: number;
  vaultEmpty: boolean;
}

export function computeEstateState(args: ComputeEstateStateArgs): EstateStateResult {
  const {
    lastHeartbeat,
    heartbeatInterval,
    gracePeriod,
    pausedUntil,
    createdAt,
    vaultEmpty,
  } = args;

  if (vaultEmpty) {
    return { state: "distributed", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  const anchor = lastHeartbeat > 0 ? lastHeartbeat : createdAt;
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = anchor + heartbeatInterval;
  const claimableAt = Math.max(graceDeadline + gracePeriod, pausedUntil);

  if (now >= claimableAt) {
    return { state: "claimable", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  if (now >= graceDeadline) {
    return {
      state: "grace",
      secondsUntilGrace: 0,
      secondsUntilClaimable: claimableAt - now,
    };
  }
  return {
    state: "active",
    secondsUntilGrace: graceDeadline - now,
    secondsUntilClaimable: claimableAt - now,
  };
}
