package xyz.heirlm.tangemcard

import androidx.activity.ComponentActivity
import com.tangem.common.card.Card
import com.tangem.common.extensions.hexToBytes
import com.tangem.common.extensions.toHexString
import com.tangem.crypto.hdWallet.DerivationPath
import com.tangem.operations.sign.SignResponse
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Tangem cards as an NFC credential: read the Solana key, sign Solana messages. Tangem's own
 * sheet handles the tap and the access code. Runs on the main thread because that sheet does.
 */
class TangemCardModule : Module() {
  private var session: TangemSession? = null

  override fun definition() = ModuleDefinition {
    Name("TangemCard")

    AsyncFunction("scan") { derivationPath: String, promise: Promise ->
      val path = DerivationPath(derivationPath)
      currentSession().run<Card>(
        promise,
        configure = { defaultDerivationPaths = SOLANA_CURVES.associateWith { listOf(path) }.toMutableMap() },
        start = { callback -> scanCard(callback = callback) },
        toJs = { card -> card.toScanResult(path) },
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("sign") { request: SignRequest, promise: Promise ->
      currentSession().run<SignResponse>(
        promise,
        configure = {},
        start = { callback ->
          sign(
            hashes = request.messages.map { it.hexToBytes() }.toTypedArray(),
            walletPublicKey = request.walletPublicKey.hexToBytes(),
            cardId = request.cardId,
            derivationPath = request.derivationPath?.let(::DerivationPath),
            callback = callback,
          )
        },
        toJs = { response -> response.signatures.map { it.toHexString() } },
      )
    }.runOnQueue(Queues.MAIN)
  }

  /** One session per activity; a recreated activity gets a fresh one. */
  private fun currentSession(): TangemSession {
    val activity = appContext.currentActivity as? ComponentActivity ?: throw NoActivityException()
    return session?.takeIf { it.activity === activity } ?: TangemSession(activity).also { session = it }
  }
}
