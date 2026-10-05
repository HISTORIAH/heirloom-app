# Heirloom signer applet

Package AID `F045594502`, applet AID `F04559450201`. APDUs in [apdu.md](apdu.md).

## Build

Needs a Java Card **3.0.5 Classic** kit and NXP **JCOPx_API-R1.3.4.jar** (NDA, not in git).

```bash
export JC_HOME=/path/to/jc305u4_kit
export JCOPX_JAR=/path/to/JCOPx_API-R1.3.4.jar
sh card/build.sh
```

Writes `card/build/heir.cap`. Do not commit the NXP jar.

## Install (ACR122U)

Your shell `gp` is git push. Use the jar:

```bash
java -jar /tmp/gp.jar --install card/build/heir.cap
```

Or `sh card/load.sh` (deletes a previous product instance first). Ping package `F045594501` is removed only if NVM is tight; `load.sh` tries that delete too.

Test keys `4041..4F`, SCP03 `i=10`. GlobalPlatform stays on the PC.

## Prove

The ACR122U PICC field idles out if the card sits too long. PC/SC then reports no card or MUTE with no ATR. Unplug the reader, plug it back, lift the JCOP and place it again until the LED is green. Do that immediately before `load.sh` / `prove.sh`.

```bash
sh card/prove.sh
```

Host verify of one vector:

```bash
bun card/verify.mjs <pubHex> <sigHex> <msgHex>
```
