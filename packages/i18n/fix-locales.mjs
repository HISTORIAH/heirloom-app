import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, "src/locales/app");

// Keys that were renamed in English: oldKey -> newKey
// We need to rename these in other locales too
const RENAMED_KEYS = {
  whoInherits: "whoInheritsTitle",
};

function extractKeysFromSection(lines, startIdx, endIdx) {
  const keys = new Set();
  for (let i = startIdx; i < endIdx; i++) {
    const match = lines[i].match(/^\s{4}(\w+):/);
    if (match) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function extractWizardKeys(lines, startIdx, endIdx) {
  const keys = new Set();
  for (let i = startIdx; i < endIdx; i++) {
    const match = lines[i].match(/^\s{6}(\w+):/);
    if (match) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function parseEnKeys(content) {
  const lines = content.split("\n");

  // Find createVault section
  let createVaultStart = -1;
  let createVaultEnd = -1;
  let wizardStart = -1;
  let wizardEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^  createVault: \{/)) {
      createVaultStart = i;
    } else if (createVaultStart >= 0 && wizardStart < 0 && lines[i].match(/^    wizard: \{/)) {
      wizardStart = i;
    } else if (wizardStart >= 0 && wizardEnd < 0 && lines[i].match(/^    \},/)) {
      wizardEnd = i;
    } else if (createVaultStart >= 0 && createVaultEnd < 0 && lines[i].match(/^  \},/)) {
      createVaultEnd = i;
      break;
    }
  }

  const topLevelKeys = extractKeysFromSection(lines, createVaultStart + 1, wizardStart);
  const wizardKeys = extractWizardKeys(lines, wizardStart + 1, wizardEnd);

  return { topLevelKeys, wizardKeys };
}

function fixLocale(filename, enTopKeys, enWizardKeys) {
  const filepath = join(localesDir, filename);
  const content = readFileSync(filepath, "utf-8");
  const lines = content.split("\n");

  // Find createVault section boundaries
  let createVaultStart = -1;
  let createVaultEnd = -1;
  let wizardStart = -1;
  let wizardEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^  createVault: \{/)) {
      createVaultStart = i;
    } else if (createVaultStart >= 0 && wizardStart < 0 && lines[i].match(/^    wizard: \{/)) {
      wizardStart = i;
    } else if (wizardStart >= 0 && wizardEnd < 0 && lines[i].match(/^    \},/)) {
      wizardEnd = i;
    } else if (createVaultStart >= 0 && createVaultEnd < 0 && lines[i].match(/^  \},/)) {
      createVaultEnd = i;
      break;
    }
  }

  if (createVaultStart < 0) {
    console.log(`  ${filename}: No createVault section found, skipping`);
    return;
  }

  const result = [];
  let removed = 0;
  let renamed = 0;

  // Process top-level createVault keys (before wizard)
  for (let i = 0; i < lines.length; i++) {
    if (i > createVaultStart && i < wizardStart) {
      const match = lines[i].match(/^\s{4}(\w+):/);
      if (match) {
        let key = match[1];
        // Check for renames
        if (RENAMED_KEYS[key]) {
          // Skip old key (will be handled by new key if it exists)
          if (!enTopKeys.has(key)) {
            removed++;
            continue;
          }
        }
        if (!enTopKeys.has(key)) {
          removed++;
          continue;
        }
      }
    }

    // Process wizard keys
    if (wizardStart >= 0 && wizardEnd >= 0 && i > wizardStart && i < wizardEnd) {
      const match = lines[i].match(/^\s{6}(\w+):/);
      if (match) {
        const key = match[1];
        if (!enWizardKeys.has(key)) {
          removed++;
          continue;
        }
      }
    }

    result.push(lines[i]);
  }

  // Now handle renames: if old key exists but new key doesn't, rename it
  const finalLines = [];
  for (let i = 0; i < result.length; i++) {
    const line = result[i];
    const wizardMatch = line.match(/^(\s{6})(\w+):/);
    const topMatch = line.match(/^(\s{4})(\w+):/);

    if (wizardMatch && RENAMED_KEYS[wizardMatch[2]]) {
      const oldKey = wizardMatch[2];
      const newKey = RENAMED_KEYS[oldKey];
      // Check if new key already exists in the file
      const newKeyExists = result.some((l) => l.match(new RegExp(`^\\s{6}${newKey}:`)));
      if (!newKeyExists && enWizardKeys.has(newKey)) {
        finalLines.push(line.replace(oldKey, newKey));
        renamed++;
        continue;
      }
    }

    if (topMatch && RENAMED_KEYS[topMatch[2]]) {
      const oldKey = topMatch[2];
      const newKey = RENAMED_KEYS[oldKey];
      const newKeyExists = result.some((l) => l.match(new RegExp(`^\\s{4}${newKey}:`)));
      if (!newKeyExists && enTopKeys.has(newKey)) {
        finalLines.push(line.replace(oldKey, newKey));
        renamed++;
        continue;
      }
    }

    finalLines.push(line);
  }

  writeFileSync(filepath, finalLines.join("\n"), "utf-8");
  console.log(`  ${filename}: removed ${removed} stale keys, renamed ${renamed} keys`);
}

// Main
const enContent = readFileSync(join(localesDir, "en.ts"), "utf-8");
const { topLevelKeys, wizardKeys } = parseEnKeys(enContent);

console.log(`English createVault top-level keys: ${topLevelKeys.size}`);
console.log(`English createVault.wizard keys: ${wizardKeys.size}`);

const locales = ["es.ts", "ja.ts", "ko.ts", "pt.ts", "tr.ts", "vi.ts", "zh-CN.ts", "zh-TW.ts"];

for (const locale of locales) {
  fixLocale(locale, topLevelKeys, wizardKeys);
}

console.log("Done!");
