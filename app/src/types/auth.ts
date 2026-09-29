export type ChallengeResponse = {
  message: string; // SIWS-style message for the wallet to sign
};

export type VerifyResponse = {
  address: string;
};
