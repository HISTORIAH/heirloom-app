#!/usr/bin/env bash
#
# Builds heirloom-stocks and publishes its artifacts where the rest of the repo
# expects them.
#
# This program is its own Cargo workspace: anchor-lang 2.0.0-rc.1 resolves
# `wincode` 0.5 while the other programs' dependency graphs pull 0.6, and the two
# cannot share a lockfile. Isolating it lets both build, at the cost of `anchor
# build` at the repo root not seeing it — hence this script.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$here/../.." && pwd)"

cargo build-sbf --manifest-path "$here/Cargo.toml"

mkdir -p "$repo_root/target/deploy" "$repo_root/target/idl"
cp "$here/target/deploy/heirloom_stocks.so" "$repo_root/target/deploy/heirloom_stocks.so"
(cd "$here" && anchor idl build) > "$repo_root/target/idl/heirloom_stocks.json"

echo "built $(du -h "$repo_root/target/deploy/heirloom_stocks.so" | cut -f1) -> target/deploy/heirloom_stocks.so"
