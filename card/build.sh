#!/bin/sh
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
JC_HOME="${JC_HOME:-/tmp/oracle_javacard_sdks/jc305u4_kit}"
API="$JC_HOME/lib/api_classic.jar"
TOOLS="$JC_HOME/lib/tools.jar"
if [ ! -f "$API" ] || [ ! -f "$TOOLS" ]; then
  echo "Set JC_HOME to a Java Card 3.0.5 Classic kit (api_classic.jar + tools.jar)." >&2
  exit 1
fi
if [ -z "${JCOPX_JAR:-}" ] || [ ! -f "$JCOPX_JAR" ]; then
  echo "Set JCOPX_JAR to NXP JCOPx_API-R1.3.4.jar (compile-time API, not executed)." >&2
  exit 1
fi

CLASSES="$ROOT/build/classes"
CAPOUT="$ROOT/build/cap"
EXP="$ROOT/build/jcopx-export"
rm -rf "$CLASSES" "$CAPOUT" "$EXP"
mkdir -p "$CLASSES" "$CAPOUT" "$EXP"

unzip -qo "$JCOPX_JAR" "*.exp" -d "$EXP"

javac --release 8 -g -cp "$API:$JCOPX_JAR" -d "$CLASSES" "$ROOT/src/heirloom/HeirApplet.java"
# Converter 3.0.5 rejects 52.0; Java 6 class files (50) are what it accepts.
python3 - "$CLASSES" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
for path in root.rglob("*.class"):
    data = bytearray(path.read_bytes())
    if data[:4] != b"\xca\xfe\xba\xbe":
        raise SystemExit(f"not a class file: {path}")
    data[6:8] = b"\x00\x32"
    path.write_bytes(data)
PY

java -Djc.home="$JC_HOME" -cp "$TOOLS" com.sun.javacard.converter.Main \
  -classdir "$CLASSES" \
  -applet 0xF0:0x45:0x59:0x45:0x02:0x01 heirloom.HeirApplet \
  -d "$CAPOUT" \
  -out CAP \
  -exportpath "$JC_HOME/api_export_files:$EXP" \
  heirloom 0xF0:0x45:0x59:0x45:0x02 1.0

CAP="$(find "$CAPOUT" -name '*.cap' | head -n 1)"
if [ -z "$CAP" ]; then
  echo "converter did not write a .cap" >&2
  exit 1
fi
cp "$CAP" "$ROOT/build/heir.cap"
cp "$CAP" "$ROOT/heir.cap"
echo "wrote $ROOT/build/heir.cap"
