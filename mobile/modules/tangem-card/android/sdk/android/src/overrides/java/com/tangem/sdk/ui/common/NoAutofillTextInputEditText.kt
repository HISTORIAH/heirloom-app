package com.tangem.sdk.ui.common

import android.content.Context
import android.util.AttributeSet
import android.view.View
import android.view.autofill.AutofillValue
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import com.google.android.material.textfield.TextInputEditText

/**
 * Copy of the vendor class with one change: the default style attribute comes from AppCompat's R
 * instead of Material's.
 *
 * Upstream reads `com.google.android.material.R.attr.editTextStyle`. That field exists in Material
 * 1.9 (the version Tangem compiles against) but not in 1.13, which the app resolves to: newer
 * Material ships an R class with only its own resources. The access code field then threw
 * NoSuchFieldError while inflating, and the Tangem sheet never opened. `editTextStyle` is
 * declared by AppCompat, so its R has it on every version.
 *
 * Text field kept away from the autofill framework and from the keyboard's personalized learning.
 * See the vendor file for the full reasoning.
 */
class NoAutofillTextInputEditText @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = androidx.appcompat.R.attr.editTextStyle,
) : TextInputEditText(context, attrs, defStyleAttr) {

    override fun getAutofillType(): Int = View.AUTOFILL_TYPE_NONE

    override fun autofill(value: AutofillValue) = Unit

    // the field is the only place the flag survives: `imeOptions` gets assigned wholesale elsewhere
    override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
        val inputConnection = super.onCreateInputConnection(outAttrs)
        outAttrs.imeOptions = outAttrs.imeOptions or EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING
        return inputConnection
    }
}
