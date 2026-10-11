package xyz.heirlm.tangemcard

import com.tangem.common.card.Card
import com.tangem.common.card.CardWallet
import com.tangem.common.card.EllipticCurve
import com.tangem.common.extensions.toHexString
import com.tangem.crypto.hdWallet.DerivationPath
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** The curves Solana keys can live on. Wallet 2.0 cards use the SLIP-0010 one. */
internal val SOLANA_CURVES = listOf(EllipticCurve.Ed25519Slip0010, EllipticCurve.Ed25519)

internal class WalletResult(
  @Field val curve: String,
  /** The wallet's own key, hex. Signing names the wallet by this. */
  @Field val publicKey: String,
  /** The key at the requested derivation path, hex. Null on cards without HD wallets. */
  @Field val derivedPublicKey: String?,
) : Record

internal class ScanResult(
  @Field val cardId: String,
  @Field val firmwareVersion: String,
  @Field val hdWalletAllowed: Boolean,
  @Field val wallets: List<WalletResult>,
) : Record

internal fun Card.toScanResult(path: DerivationPath) = ScanResult(
  cardId = cardId,
  firmwareVersion = firmwareVersion.stringValue,
  hdWalletAllowed = settings.isHDWalletAllowed,
  wallets = wallets.filter { it.curve in SOLANA_CURVES }.mapNotNull { it.toWalletResult(path) },
)

private fun CardWallet.toWalletResult(path: DerivationPath): WalletResult? {
  val key = publicKey ?: return null
  return WalletResult(
    curve = curve.curve,
    publicKey = key.toHexString(),
    derivedPublicKey = derivedKeys[path]?.publicKey?.toHexString(),
  )
}
