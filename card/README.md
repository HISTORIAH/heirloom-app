# Heirloom signer applet

One Ed25519 key on an NXP J3R452 (JCOP 4.5). GENERATE once, then GET_PUB and chunked SIGN. Pubkey and signature on the wire are RFC 8032. APDUs live in [apdu.md](apdu.md).

Package AID `F045594502`. Applet AID `F04559450201`. SELECT that AID first. The applet is not default-selected.

`card/src/heirloom/HeirApplet.java` is the source. `sh card/build.sh` turns it into `card/build/heir.cap`. One CAP is shared. Each card gets its own key the first time GENERATE runs.

## What you need

- The card (dual interface: USB reader or phone NFC)
- An ACS ACR122U, or any PC/SC reader that can talk the PICC
- [GlobalPlatformPro](https://github.com/martinpaljak/GlobalPlatformPro) `gp.jar`. Scripts default to `GP=/tmp/gp.jar`. Do not run the shell command `gp`. In this repo that alias is git push.
- A Java Card **3.0.5 Classic** kit (`JC_HOME`, needs `lib/api_classic.jar` and `lib/tools.jar`)
- NXP `JCOPx_API-R1.3.4.jar` on `JCOPX_JAR`. NDA, not in git, compile-time only. Do not commit it.

Factory cards ship with ISD test keys `4041..4F` and SCP03 `i=10`. Load stays on the PC.

## Build

Compiles the applet and converts it to a CAP. `javac --release 8`, then class files patched to major 50 so converter 3.0.5 accepts them.

```bash
export JC_HOME=/path/to/jc305u4_kit
export JCOPX_JAR=/path/to/JCOPx_API-R1.3.4.jar
sh card/build.sh
```

Prints `wrote …/card/build/heir.cap`. That file is what load installs.

## Load

Installs the CAP on the card. Deletes a previous product instance first (lab reset of the key slot). Override the jar with `GP=/path/to/gp.jar`.

```bash
sh card/load.sh
```

Prints `installed …/card/build/heir.cap`. The slot is empty until GENERATE. GET_PUB then returns `6A88`.

Install without deleting first:

```bash
java -jar /tmp/gp.jar --install card/build/heir.cap
```

## Prove

USB check that the applet on the chip actually signs. Not a provisioning step. You do not run it after every load. Run it when the applet or CAP changed, or when you want to confirm GENERATE / GET_PUB / SIGN on this card.

SELECT, GET_PUB empty (`6A88`), GENERATE, GET_PUB match, occupied GENERATE (`6985`), SIGN 32 / 64 / 200 / 512 with host verify.

```bash
sh card/prove.sh
```

Prints `prove passed` and `pub=…`. That GENERATE fills the slot. Create-estate tap needs an empty slot, so `sh card/load.sh` again before using the card in the app.

One-off host verify:

```bash
bun card/verify.mjs <pubHex> <sigHex> <msgHex>
```
