#!/bin/sh
# Install heir.cap on the ACR122U. Deletes a previous product instance first (lab reset).
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
GP="${GP:-/tmp/gp.jar}"
CAP="$ROOT/build/heir.cap"
if [ ! -f "$GP" ]; then
  echo "Set GP to GlobalPlatformPro gp.jar (not the shell alias gp)." >&2
  exit 1
fi
if [ ! -f "$CAP" ]; then
  echo "Run sh card/build.sh first." >&2
  exit 1
fi

# Optional: free NVM from leftover packages from earlier loads.
java -jar "$GP" --delete F04559450101 --force || true
java -jar "$GP" --delete F045594501 --force || true

java -jar "$GP" --delete F04559450201 --force || true
java -jar "$GP" --delete F045594502 --force || true
java -jar "$GP" --install "$CAP"
echo "installed $CAP"
