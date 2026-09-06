# heirloom-client

Rust client for the Heirloom program, generated with [Codama](https://github.com/codama-idl/codama).

Provides typed accounts, instructions, and errors for interacting with the program.

## Usage

```toml
[dependencies]
heirloom-client = { path = "../clients/heirloom/rust" }
```

## Toolchain

This crate requires Rust 1.98.0+, pinned via its own `rust-toolchain.toml` (separate from the workspace root, which stays on an older toolchain for on-chain program builds).
