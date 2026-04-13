import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";

const INPUT = join(
  __dirname,
  "../heirloom-program/target/idl/heirloom_program.json",
);
const OUTPUT = join(dirname(INPUT), "heirloom_program.anchor.json");

function convertType(type: unknown): unknown {
  if (typeof type !== "object" || type === null) return type;

  const t = type as Record<string, unknown>;

  // { "defined": "Option" } → { "option": "pubkey" }
  if ("defined" in t && t.defined === "Option") {
    return { option: "pubkey" };
  }

  // { "string": { "maxLength": N } } → "string"
  if ("string" in t && typeof t.string === "object") {
    return "string";
  }

  // Recurse into known wrapper types (option, vec, array, defined)
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(t)) {
    result[key] = convertType(value);
  }
  return result;
}

function convertField(field: unknown): unknown {
  if (typeof field !== "object" || field === null) return field;
  const f = field as Record<string, unknown>;
  return { ...f, type: convertType(f.type) };
}

function walkFields(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(walkFields);
  if (typeof obj !== "object" || obj === null) return obj;

  const o = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(o)) {
    if (key === "fields" && Array.isArray(value)) {
      result[key] = value.map(convertField);
    } else if (key === "args" && Array.isArray(value)) {
      result[key] = value.map(convertField);
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
