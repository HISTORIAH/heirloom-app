# Heirloom

A Solana-native inheritance protocol. Lock assets into a programmatic estate that transfers to a designated heir if you stop checking in.

## Programs

| Program | ID | Status |
|---------|----|--------|
| `heirloom` | `heirRS7LknVZiPvnZqEpfcAzFDvXgv96wMH7ByGHukg` | devnet |
| `heirloom-ika` | `9ede3aHXJiv14BNT67MWpgFGugtP1PSdBuLDuRX2D4sf` | devnet |

## Quick start

```bash
# Install dependencies
bun install

# Build the program and regenerate clients
anchor build
bun generate

# Run the app against localnet
bun dev:ui

# Run tests (requires local validator)
bun test
```

See [`app-ika/README.md`](./app-ika/README.md) for the cross-chain IKA variant.

## Security

The program has been independently audited. For responsible disclosure, contact `info@heirlm.xyz` or DM `@heirloom_app`.
