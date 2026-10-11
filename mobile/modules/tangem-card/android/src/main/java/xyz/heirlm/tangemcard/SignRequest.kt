package xyz.heirlm.tangemcard

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** What JS asks the card to sign. Every byte string is hex. */
internal class SignRequest : Record {
  /** The card the session must be on, so a different card can't answer. */
  @Field val cardId: String = ""

  /** The wallet's own public key, as `scan` returned it. */
  @Field val walletPublicKey: String = ""

  /** Null signs with the wallet key itself (cards without HD wallets). */
  @Field val derivationPath: String? = null

  /** Solana message bytes. Ed25519 signs the message itself, not a hash of it. */
  @Field val messages: List<String> = emptyList()
}
