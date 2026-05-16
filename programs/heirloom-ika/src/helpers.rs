use anchor_lang::prelude::*;

use crate::error::HeirloomIkaError;

/// Parse a hex ETH address string (with or without 0x prefix) into 20 bytes.
pub fn parse_eth_address_str(s: &[u8]) -> Result<[u8; 20]> {
    let hex = if s.starts_with(b"0x") || s.starts_with(b"0X") {
        &s[2..]
    } else {
        s
    };
    if hex.len() != 40 {
        return Err(HeirloomIkaError::InvalidHeirAddress.into());
    }
    let mut out = [0u8; 20];
    for i in 0..20 {
        let hi = hex_nibble(hex[i * 2])?;
        let lo = hex_nibble(hex[i * 2 + 1])?;
        out[i] = (hi << 4) | lo;
    }
    Ok(out)
}

fn hex_nibble(b: u8) -> Result<u8> {
    match b {
        b'0'..=b'9' => Ok(b - b'0'),
        b'a'..=b'f' => Ok(b - b'a' + 10),
        b'A'..=b'F' => Ok(b - b'A' + 10),
        _ => Err(HeirloomIkaError::InvalidHeirAddress.into()),
    }
}

/// Returns `(program_id_bytes, instruction_data)` for the instruction at `index`
/// from the Instructions sysvar buffer.
///
/// Sysvar layout:
///   [0..2]:   num_instructions (u16 LE)
///   [2..]:    offset table — one u16 LE per instruction
///   Each instruction entry:
///     [0..2]: num_accounts (u16 LE)
///     [2..2+num_accounts*33]: account metas (1 flag byte + 32-byte pubkey)
///     then: program_id (32 bytes)
///     then: data_len (u16 LE)
///     then: data (data_len bytes)
pub fn load_instruction_at(data: &[u8], index: usize) -> Result<(&[u8], &[u8])> {
    if data.len() < 2 {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }
    let num_ixs = u16::from_le_bytes([data[0], data[1]]) as usize;
    if index >= num_ixs {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }
    let offset_pos = 2 + index * 2;
    if data.len() < offset_pos + 2 {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }
    let ix_start = u16::from_le_bytes([data[offset_pos], data[offset_pos + 1]]) as usize;
    if data.len() < ix_start + 2 {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }
    let num_accounts = u16::from_le_bytes([data[ix_start], data[ix_start + 1]]) as usize;
    let accounts_end = ix_start + 2 + num_accounts * 33;
    let program_id_end = accounts_end + 32;
    if data.len() < program_id_end + 2 {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }
    let program_id = &data[accounts_end..program_id_end];
    let data_len = u16::from_le_bytes([data[program_id_end], data[program_id_end + 1]]) as usize;
    let data_start = program_id_end + 2;
    if data.len() < data_start + data_len {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }
    Ok((program_id, &data[data_start..data_start + data_len]))
}

/// Returns just the instruction data for the instruction at `index`.
pub fn load_ix_data(data: &[u8], index: usize) -> Result<&[u8]> {
    let (_, ix_data) = load_instruction_at(data, index)?;
    Ok(ix_data)
}
