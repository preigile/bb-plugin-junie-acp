// Shared ACP transforms: flatten nested config options and filter thought_level
// values so that only bb-supported levels are passed through.
//
// Used by both the bridge script (junie-acp-bridge.mjs) and tests.

export const BB_SUPPORTED_LEVELS = new Set([
  "low", "medium", "high", "xhigh", "ultracode", "max", "ultra",
]);

export const LEVEL_BY_VALUE = {
  none: "none",
  minimal: "low",
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "xhigh",
  ultracode: "ultracode",
  max: "max",
  ultra: "ultra",
};

/**
 * Flatten ACP `configOptions` from Junie's nested group format to the flat
 * `{value, name}` array that bb's wire parser expects.
 *
 * Junie returns:
 *   [{group: "jetbrains-ai", options: [{name, value}, ...]}]
 *
 * bb expects:
 *   [{value, name}, ...]
 */
export function flattenSelectOptions(raw) {
  if (!Array.isArray(raw)) return [];
  const result = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if ("group" in item && Array.isArray(item.options)) {
      for (const opt of item.options) {
        if (opt && typeof opt === "object" && typeof opt.value === "string") {
          result.push({ value: opt.value, name: opt.name });
        }
      }
    } else if (typeof item.value === "string") {
      result.push({ value: item.value, name: item.name });
    }
  }
  return result;
}

/**
 * Filter thought_level config option, keeping only bb-supported values.
 * Returns a new config option object or null if nothing to filter.
 */
export function filterThoughtLevelConfigOption(configOption) {
  const options = configOption.options;
  if (!options || options.length === 0) return null;

  const filtered = [];
  for (const opt of options) {
    if (!opt || typeof opt !== "object") continue;
    const level = LEVEL_BY_VALUE[opt.value];
    if (level !== undefined && BB_SUPPORTED_LEVELS.has(level)) {
      filtered.push(opt);
    }
  }

  // If everything was filtered out (e.g. Qwen with only "none"), inject medium
  if (filtered.length === 0) {
    return {
      id: configOption.id ?? "effort",
      name: configOption.name ?? "Reasoning effort",
      category: "thought_level",
      type: configOption.type ?? "select",
      options: [{ value: "medium", name: "Medium" }],
      currentValue: "medium",
    };
  }

  // If currentValue was filtered out, pick the first remaining option
  let currentValue = configOption.currentValue;
  if (currentValue) {
    const currentLevel = LEVEL_BY_VALUE[currentValue];
    if (!currentLevel || !BB_SUPPORTED_LEVELS.has(currentLevel)) {
      currentValue = filtered[0].value;
    }
  } else {
    currentValue = filtered[0].value;
  }

  return {
    id: configOption.id,
    name: configOption.name,
    category: configOption.category,
    type: configOption.type,
    options: filtered,
    currentValue,
  };
}

/**
 * Recursively rewrite configOptions in an ACP message object:
 * - Flatten model options (nested groups → flat {value, name}[])
 * - Filter thought_level options to bb-supported values only
 */
export function rewriteConfigOptions(obj) {
  if (Array.isArray(obj)) {
    return obj.map(rewriteConfigOptions);
  }
  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === "configOptions" && Array.isArray(value)) {
        // Don't flatten the configOptions array itself — it contains config option objects.
        // Instead, flatten the inner `options` array of each config option.
        result[key] = value.map(co => {
          if (!co || typeof co !== "object") return rewriteConfigOptions(co);

          // Flatten model options (nested groups → flat {value, name}[])
          if ((co.category === "model" || co.id === "model") && Array.isArray(co.options)) {
            const flattened = flattenSelectOptions(co.options);
            if (flattened.length > 0) {
              return { ...co, options: flattened };
            }
          }

          // Filter thought_level options — drop values bb doesn't support (like "none")
          if (co.category === "thought_level" && Array.isArray(co.options)) {
            const filtered = filterThoughtLevelConfigOption(co);
            if (filtered) {
              return filtered;
            }
          }

          return rewriteConfigOptions(co);
        });
      } else {
        result[key] = rewriteConfigOptions(value);
      }
    }
    return result;
  }
  return obj;
}
