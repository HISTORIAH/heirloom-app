import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";

const INPUT = join(
  __dirname,
  "../heirloom-program/target/idl/heirloom_program.json",
);
const OUTPUT = join(dirname(INPUT), "heirloom_program.anchor.json");

// Source Quasar IDL emits `{"defined": "Option"}` with no inner type.
// Per-field override so codama generates correct codecs.
// Outer key = instruction name, inner key = arg name.
const INSTRUCTION_ARG_OPTION_INNER: Record<string, Record<string, string>> = {
  updateFields: {
    heartbeatInterval: "i64",
    gracePeriod: "i64",
    pauseDuration: "i64",
  },
};

// Default inner type for { defined: "Option" } when no override exists.
const DEFAULT_OPTION_INNER = "pubkey";

function convertType(type: unknown, optionInner: string = DEFAULT_OPTION_INNER): unknown {
  if (typeof type !== "object" || type === null) return type;

  const t = type as Record<string, unknown>;

  // { "defined": "Option" } → { "option": <inner> }
  if ("defined" in t && t.defined === "Option") {
    return { option: optionInner };
  }

  // { "string": { "maxLength": N } } → "string"
  if ("string" in t && typeof t.string === "object") {
    return "string";
  }

  // Recurse
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(t)) {
    result[key] = convertType(value, optionInner);
  }
  return result;
}

function convertField(field: unknown, optionInner: string = DEFAULT_OPTION_INNER): unknown {
  if (typeof field !== "object" || field === null) return field;
  const f = field as Record<string, unknown>;
  return { ...f, type: convertType(f.type, optionInner) };
}

function convertArgs(ixName: string, args: unknown[]): unknown[] {
  const overrides = INSTRUCTION_ARG_OPTION_INNER[ixName] ?? {};
  return args.map((a) => {
    if (typeof a !== "object" || a === null) return a;
    const rec = a as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name : "";
    const inner = overrides[name] ?? DEFAULT_OPTION_INNER;
    return convertField(a, inner);
  });
}

function walkFields(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(walkFields);
  if (typeof obj !== "object" || obj === null) return obj;

  const o = obj as Record<string, unknown>;

  // Instruction object: { name, args, accounts, ... }
  if (Array.isArray(o.args) && typeof o.name === "string") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(o)) {
      if (key === "args") {
        result[key] = convertArgs(o.name as string, value as unknown[]);
      } else {
        result[key] = walkFields(value);
      }
    }
    return result;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(o)) {
    if (key === "fields" && Array.isArray(value)) {
      result[key] = value.map((f) => convertField(f));
    } else {
      result[key] = walkFields(value);
    }
  }

  return result;
}

const idl = JSON.parse(readFileSync(INPUT, "utf-8"));
const converted = walkFields(idl);
writeFileSync(OUTPUT, JSON.stringify(converted, null, 2));
console.log(`Written to ${OUTPUT}`);
