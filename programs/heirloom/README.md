# heirloom

Anchor program implementing the Heirloom estate protocol: an authority locks assets into a PDA-owned vault, and a designated heir can claim them if the authority stops checking in within `heartbeat_interval + grace_period`.

## Known limitations

- **Mint freeze authority.** `register_asset` accepts any SPL/Token-2022 mint and does not require its freeze authority to be disabled, since doing so would exclude major regulated assets (e.g. USDC, USDT) that legitimately retain one. If a registered mint's freeze authority freezes the vault's token account after registration, transfers and closes for that asset in `claim`, `revoke`, and heir migration will fail at the token program until the issuer thaws it — the vault PDA cannot thaw its own account. This is inherent to custodying third-party SPL assets and is not something the program can enforce against; it is accepted as an issuer-trust risk rather than a program bug.
