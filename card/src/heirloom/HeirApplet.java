package heirloom;

import com.nxp.id.jcopx.security.CryptoBaseX;
import com.nxp.id.jcopx.security.ECPublicKeyWithPredefinedParameters;
import com.nxp.id.jcopx.security.KeyBuilderX;

import javacard.framework.APDU;
import javacard.framework.Applet;
import javacard.framework.ISO7816;
import javacard.framework.ISOException;
import javacard.framework.JCSystem;
import javacard.framework.OwnerPIN;
import javacard.framework.Util;
import javacard.security.CryptoException;
import javacard.security.ECPublicKey;
import javacard.security.Key;
import javacard.security.PrivateKey;
import javacard.security.PublicKey;

/**
 * One Ed25519 slot. GENERATE once, GET_PUB, chunked SIGN.
 * Optional OwnerPIN: SET_PIN once after GENERATE, then VERIFY before SIGN.
 * Exports RFC 8032 little-endian (NXP getW / sig halves are reversed on-card).
 */
public class HeirApplet extends Applet {
    private static final byte CLA = (byte) 0x00;
    private static final byte INS_GENERATE = (byte) 0x01;
    private static final byte INS_GET_PUB = (byte) 0x02;
    private static final byte INS_SIGN = (byte) 0x03;
    private static final byte INS_SET_PIN = (byte) 0x04;
    private static final byte INS_VERIFY = (byte) 0x05;
    private static final byte INS_GET_STATUS = (byte) 0x06;
    private static final byte P1_MORE = (byte) 0x00;
    private static final byte P1_LAST = (byte) 0x80;

    private static final short PUB_LEN = 32;
    private static final short SIG_LEN = 64;
    private static final short MSG_MAX = 1024;
    private static final short CHUNK_MAX = 200;
    private static final short STATUS_LEN = 3;
    private static final byte PIN_MIN = (byte) 4;
    private static final byte PIN_MAX = (byte) 8;
    private static final byte PIN_TRY_LIMIT = (byte) 3;
    private static final short SW_NO_KEY = (short) 0x6A88;
    private static final short SW_PIN_REQUIRED = (short) 0x6982;
    private static final short SW_PIN_BLOCKED = (short) 0x6983;
    private static final short SW_PIN_TRIES = (short) 0x63C0;

    private PrivateKey priv;
    private PublicKey pub;
    private boolean hasKey;
    private boolean hasPin;
    private OwnerPIN pin;

    private byte[] msg;
    private short[] off;
    private byte[] io;

    public static void install(byte[] bArray, short bOffset, byte bLength) {
        new HeirApplet().register();
    }

    private HeirApplet() {
        pin = new OwnerPIN(PIN_TRY_LIMIT, PIN_MAX);
        msg = JCSystem.makeTransientByteArray(MSG_MAX, JCSystem.CLEAR_ON_DESELECT);
        off = JCSystem.makeTransientShortArray((short) 1, JCSystem.CLEAR_ON_DESELECT);
        io = JCSystem.makeTransientByteArray(SIG_LEN, JCSystem.CLEAR_ON_DESELECT);
    }

    public void process(APDU apdu) {
        if (selectingApplet()) {
            return;
        }
        byte[] buf = apdu.getBuffer();
        byte ins = buf[ISO7816.OFFSET_INS];
        if (buf[ISO7816.OFFSET_CLA] != CLA) {
            if (ins == INS_SIGN) {
                resetSign();
            }
            ISOException.throwIt(ISO7816.SW_CLA_NOT_SUPPORTED);
        }
        if (ins == INS_GENERATE) {
            insGenerate(apdu);
            return;
        }
        if (ins == INS_GET_PUB) {
            insGetPub(apdu);
            return;
        }
        if (ins == INS_SIGN) {
            insSign(apdu);
            return;
        }
        if (ins == INS_SET_PIN) {
            insSetPin(apdu);
            return;
        }
        if (ins == INS_VERIFY) {
            insVerify(apdu);
            return;
        }
        if (ins == INS_GET_STATUS) {
            insGetStatus(apdu);
            return;
        }
        ISOException.throwIt(ISO7816.SW_INS_NOT_SUPPORTED);
    }

    private void requireP2Zero(byte[] buf) {
        if (buf[ISO7816.OFFSET_P2] != (byte) 0) {
            ISOException.throwIt(ISO7816.SW_INCORRECT_P1P2);
        }
    }

    private void requireP1Zero(byte[] buf) {
        if (buf[ISO7816.OFFSET_P1] != (byte) 0) {
            ISOException.throwIt(ISO7816.SW_INCORRECT_P1P2);
        }
    }

    private void insGenerate(APDU apdu) {
        byte[] buf = apdu.getBuffer();
        requireP2Zero(buf);
        requireP1Zero(buf);
        if (hasKey) {
            ISOException.throwIt(ISO7816.SW_CONDITIONS_NOT_SATISFIED);
        }
        try {
            if (priv == null) {
                priv = (PrivateKey) KeyBuilderX.buildKey(
                    KeyBuilderX.ALG_TYPE_ED25519_PRIVATE, JCSystem.MEMORY_TYPE_PERSISTENT);
                pub = (PublicKey) KeyBuilderX.buildKey(
                    KeyBuilderX.ALG_TYPE_ED25519_PUBLIC, JCSystem.MEMORY_TYPE_PERSISTENT);
            }
            KeyBuilderX.genKeyPair(priv, pub);
        } catch (CryptoException e) {
            ISOException.throwIt(ISO7816.SW_UNKNOWN);
        }
        rfcPub();
        hasKey = true;
        Util.arrayCopyNonAtomic(io, (short) 0, buf, (short) 0, PUB_LEN);
        apdu.setOutgoingAndSend((short) 0, PUB_LEN);
    }

    private void insGetPub(APDU apdu) {
        byte[] buf = apdu.getBuffer();
        requireP2Zero(buf);
        requireP1Zero(buf);
        if (!hasKey) {
            ISOException.throwIt(SW_NO_KEY);
        }
        rfcPub();
        Util.arrayCopyNonAtomic(io, (short) 0, buf, (short) 0, PUB_LEN);
        apdu.setOutgoingAndSend((short) 0, PUB_LEN);
    }

    private void insSign(APDU apdu) {
        byte[] buf = apdu.getBuffer();
        try {
            requireP2Zero(buf);
            byte p1 = buf[ISO7816.OFFSET_P1];
            if (p1 != P1_MORE && p1 != P1_LAST) {
                ISOException.throwIt(ISO7816.SW_INCORRECT_P1P2);
            }
            if (!hasKey) {
                ISOException.throwIt(SW_NO_KEY);
            }
            if (hasPin && !pin.isValidated()) {
                ISOException.throwIt(SW_PIN_REQUIRED);
            }
            short lc = apdu.setIncomingAndReceive();
            if (p1 == P1_MORE) {
                appendChunk(buf, lc);
                return;
            }
            appendLast(buf, lc);
            signAndSend(apdu, buf);
        } catch (ISOException e) {
            short sw = e.getReason();
            resetSign();
            ISOException.throwIt(sw);
        } catch (RuntimeException e) {
            resetSign();
            ISOException.throwIt(ISO7816.SW_UNKNOWN);
        }
    }

    private short pinPayload(APDU apdu, byte[] buf) {
        requireP2Zero(buf);
        requireP1Zero(buf);
        short lc = apdu.setIncomingAndReceive();
        if (lc < PIN_MIN || lc > PIN_MAX) {
            ISOException.throwIt(ISO7816.SW_WRONG_LENGTH);
        }
        if (!isDigits(buf, ISO7816.OFFSET_CDATA, lc)) {
            ISOException.throwIt(ISO7816.SW_WRONG_DATA);
        }
        return lc;
    }

    private void insSetPin(APDU apdu) {
        byte[] buf = apdu.getBuffer();
        if (!hasKey) {
            ISOException.throwIt(SW_NO_KEY);
        }
        if (hasPin) {
            ISOException.throwIt(ISO7816.SW_CONDITIONS_NOT_SATISFIED);
        }
        short lc = pinPayload(apdu, buf);
        pin.update(buf, ISO7816.OFFSET_CDATA, (byte) lc);
        hasPin = true;
    }

    private void insVerify(APDU apdu) {
        byte[] buf = apdu.getBuffer();
        if (!hasPin) {
            ISOException.throwIt(ISO7816.SW_CONDITIONS_NOT_SATISFIED);
        }
        short lc = pinPayload(apdu, buf);
        if (pin.getTriesRemaining() == (byte) 0) {
            ISOException.throwIt(SW_PIN_BLOCKED);
        }
        if (pin.check(buf, ISO7816.OFFSET_CDATA, (byte) lc)) {
            return;
        }
        byte left = pin.getTriesRemaining();
        if (left == (byte) 0) {
            ISOException.throwIt(SW_PIN_BLOCKED);
        }
        ISOException.throwIt((short) (SW_PIN_TRIES | (left & 0x0F)));
    }

    private void insGetStatus(APDU apdu) {
        byte[] buf = apdu.getBuffer();
        requireP2Zero(buf);
        requireP1Zero(buf);
        buf[0] = hasKey ? (byte) 1 : (byte) 0;
        buf[1] = hasPin ? (byte) 1 : (byte) 0;
        buf[2] = hasPin ? pin.getTriesRemaining() : (byte) 0;
        apdu.setOutgoingAndSend((short) 0, STATUS_LEN);
    }

    private static boolean isDigits(byte[] buf, short off, short len) {
        short end = (short) (off + len);
        for (short i = off; i < end; i++) {
            byte b = buf[i];
            if (b < (byte) 0x30 || b > (byte) 0x39) {
                return false;
            }
        }
        return true;
    }

    private void appendLast(byte[] buf, short lc) {
        if (lc == 0) {
            if (off[0] == 0) {
                ISOException.throwIt(ISO7816.SW_WRONG_LENGTH);
            }
            return;
        }
        appendChunk(buf, lc);
    }

    private void signAndSend(APDU apdu, byte[] buf) {
        short n = 0;
        try {
            n = CryptoBaseX.sign(
                priv,
                CryptoBaseX.ALG_ED25519PH_SHA_512,
                msg, (short) 0, off[0],
                io, (short) 0);
        } catch (CryptoException e) {
            ISOException.throwIt(ISO7816.SW_UNKNOWN);
        }
        if (n != SIG_LEN) {
            ISOException.throwIt(ISO7816.SW_UNKNOWN);
        }
        reverse32(io, (short) 0);
        reverse32(io, PUB_LEN);
        resetSign();
        Util.arrayCopyNonAtomic(io, (short) 0, buf, (short) 0, SIG_LEN);
        apdu.setOutgoingAndSend((short) 0, SIG_LEN);
    }

    private void appendChunk(byte[] buf, short lc) {
        if (lc < (short) 1 || lc > CHUNK_MAX) {
            ISOException.throwIt(ISO7816.SW_WRONG_LENGTH);
        }
        if ((short) (off[0] + lc) > MSG_MAX) {
            ISOException.throwIt(ISO7816.SW_WRONG_DATA);
        }
        Util.arrayCopyNonAtomic(buf, ISO7816.OFFSET_CDATA, msg, off[0], lc);
        off[0] += lc;
    }

    private void rfcPub() {
        short n = (short) 0;
        try {
            n = exportW(pub, io, (short) 0);
        } catch (CryptoException e) {
            ISOException.throwIt(ISO7816.SW_UNKNOWN);
        }
        if (n != PUB_LEN) {
            ISOException.throwIt(ISO7816.SW_UNKNOWN);
        }
        reverse32(io, (short) 0);
    }

    private short exportW(Key key, byte[] dest, short destOff) {
        if (key instanceof ECPublicKeyWithPredefinedParameters) {
            return ((ECPublicKeyWithPredefinedParameters) key).getW(dest, destOff);
        }
        if (key instanceof ECPublicKey) {
            return ((ECPublicKey) key).getW(dest, destOff);
        }
        ISOException.throwIt(ISO7816.SW_UNKNOWN);
        return 0;
    }

    private void resetSign() {
        off[0] = 0;
        Util.arrayFillNonAtomic(msg, (short) 0, MSG_MAX, (byte) 0);
    }

    private static void reverse32(byte[] buf, short start) {
        short i = start;
        short j = (short) (start + 31);
        while (i < j) {
            byte t = buf[i];
            buf[i] = buf[j];
            buf[j] = t;
            i++;
            j--;
        }
    }
}
