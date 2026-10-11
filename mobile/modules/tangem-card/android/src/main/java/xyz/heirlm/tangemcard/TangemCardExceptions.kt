package xyz.heirlm.tangemcard

import com.tangem.common.core.TangemError
import com.tangem.common.core.TangemSdkError
import expo.modules.kotlin.exception.CodedException

/** No activity to show Tangem's NFC sheet on, or it isn't an AndroidX one. */
internal class NoActivityException :
  CodedException("ERR_TANGEM_NO_ACTIVITY", "No activity to run the Tangem session on", null)

/**
 * SDK failures as codes the JS side can branch on. Wording for the user lives in JS; the
 * message here is for logs.
 */
internal fun TangemError.toCodedException(): CodedException {
  val jsCode = when (this) {
    is TangemSdkError.UserCancelled -> "ERR_TANGEM_CANCELLED"
    is TangemSdkError.TagLost -> "ERR_TANGEM_TAG_LOST"
    is TangemSdkError.NfcFeatureIsUnavailable -> "ERR_TANGEM_NFC_UNAVAILABLE"
    is TangemSdkError.WalletNotFound -> "ERR_TANGEM_WALLET_NOT_FOUND"
    else -> "ERR_TANGEM"
  }
  return CodedException(jsCode, "Tangem error $code: $customMessage", this)
}
