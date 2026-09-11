export interface ChallengeResponse {
  message: string; // SIWS-style message for the wallet to sign
}

export interface VerifyResponse {
  address: string;
}
