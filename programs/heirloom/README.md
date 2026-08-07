# Heirloom

Solana inheritance protocol: lock assets in a PDA vault, and your heir can claim them if you stop checking in.

## Caveats

- **Freeze authority.** If a registered mint's issuer (e.g. USDC, USDT) freezes the vault's token account, that asset is stuck until they unfreeze it. Can't fix — trust assumption on the issuer, not a bug.

- **Transfer hooks.** All transfers use plain `transfer_checked`, no hook accounts. A mint that already has an active hook fails immediately at deposit, so it never gets in. Risk is narrow: a mint deposited hook-free whose authority later turns one on — that would then block exits for that asset. Fixable (resolve hook accounts dynamically), just not built yet.

- **Transfer fees.** Not handled, but not a real problem — just means smaller payouts, never a stuck transfer. Depositor's choice of mint.
