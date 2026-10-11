package xyz.heirlm.tangemcard

import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import com.tangem.TangemSdk
import com.tangem.common.CompletionResult
import com.tangem.common.core.CompletionCallback
import com.tangem.common.core.Config
import com.tangem.crypto.bip39.Wordlist
import com.tangem.operations.attestation.AttestationTask
import com.tangem.sdk.DefaultSessionViewDelegate
import com.tangem.sdk.extensions.getWordlist
import com.tangem.sdk.nfc.AndroidNfcAvailabilityProvider
import com.tangem.sdk.nfc.NfcManager
import com.tangem.sdk.storage.AndroidSecureStorageV2
import expo.modules.kotlin.Promise

/**
 * The Tangem SDK for one activity, with NFC reader mode switched on only while a call runs.
 *
 * `TangemSdk.init` would tie Tangem's reader to the activity lifecycle and hold the NFC field
 * whenever the app is open, starving our own applet reader (react-native-nfc-manager). Here the
 * reader is built by hand and enabled per call instead.
 *
 * Reader mode is enabled here rather than through [NfcManager], so the session sees the card's
 * [Tag] and can release it properly: see [releaseReader].
 */
internal class TangemSession(val activity: ComponentActivity) {
  private val nfcManager = NfcManager().apply { setCurrentActivity(activity) }
  private val nfcAdapter: NfcAdapter? = NfcAdapter.getDefaultAdapter(activity)
  private val mainHandler = Handler(Looper.getMainLooper())
  private var lastTag: Tag? = null
  private val config = Config().apply {
    // Verify the card's key on the device only: no card details go to Tangem's servers.
    attestationMode = AttestationTask.Mode.Offline
  }
  private val sdk = TangemSdk(
    reader = nfcManager.reader,
    viewDelegate = DefaultSessionViewDelegate(nfcManager, activity).apply { sdkConfig = config },
    nfcAvailabilityProvider = AndroidNfcAvailabilityProvider(activity),
    // Falls back to the regular keystore on phones without StrongBox.
    secureStorage = AndroidSecureStorageV2(appContext = activity.applicationContext, useStrongBox = true),
    wordlist = Wordlist.getWordlist(),
    config = config,
  )

  /** Remembers the card, then hands it to Tangem's reader. */
  private val readerCallback = NfcAdapter.ReaderCallback { tag ->
    lastTag = tag
    nfcManager.onTagDiscovered(tag)
  }

  /** Runs one SDK call with the reader on, settles `promise`, then hands the field back. */
  fun <T> run(
    promise: Promise,
    configure: Config.() -> Unit,
    start: TangemSdk.(CompletionCallback<T>) -> Unit,
    toJs: (T) -> Any?,
  ) {
    config.configure()
    nfcManager.reader.listener = nfcManager
    enableReader()
    sdk.start { result ->
      mainHandler.post(::releaseReader)
      when (result) {
        is CompletionResult.Success -> promise.resolve(toJs(result.data))
        is CompletionResult.Failure -> promise.reject(result.error.toCodedException())
      }
    }
  }

  private fun enableReader() {
    if (nfcAdapter?.isEnabled != true) return
    nfcAdapter.enableReaderMode(activity, readerCallback, READER_FLAGS, Bundle())
  }

  /**
   * Turns reader mode off without letting Android re-read the card. The card is usually still on
   * the phone when the call ends; with reader mode off, Android dispatches it like any other tag,
   * and a Tangem card's NDEF record opens the Tangem app, or the Play Store when it isn't installed.
   * Ignoring the tag keeps it from being dispatched until it has been away for [IGNORE_DEBOUNCE_MS].
   */
  private fun releaseReader() {
    lastTag?.let { tag -> runCatching { nfcAdapter?.ignore(tag, IGNORE_DEBOUNCE_MS, null, null) } }
    lastTag = null
    if (!activity.isDestroyed) nfcAdapter?.disableReaderMode(activity)
    nfcManager.reader.listener = null
  }

  private companion object {
    // Tangem's own reader flags (NfcManager.READER_FLAGS): type A and V, no NDEF check, no sound.
    const val READER_FLAGS = NfcAdapter.FLAG_READER_NFC_A or
      NfcAdapter.FLAG_READER_NFC_V or
      NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK or
      NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS
    const val IGNORE_DEBOUNCE_MS = 1_500
  }
}
