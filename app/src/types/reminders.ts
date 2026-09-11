export type ReminderChannel = "email" | "sms" | "whatsapp" | "telegram";
export type ReminderRole = "check_in_signer" | "heir";

export interface AddRecipientRequest {
  channel: ReminderChannel;
  destination: string; // plaintext in the request; sealed server-side
  role: ReminderRole;
}

export interface RecipientResponse extends AddRecipientRequest {
  verified: boolean; // destination is decrypted by the server in responses
}

export interface CreateReminderRequest {
  estateAddress: string;
  estateKind: string;
  recipients: AddRecipientRequest[]; // 1–2 items max
}

export interface CreateReminderResponse {
  estateAddress: string;
  estateKind: string;
  reminderSubscriptionId: string; // uuid
}

export interface FetchReminderResponse {
  estateAddress: string;
  recipients: RecipientResponse[];
}
