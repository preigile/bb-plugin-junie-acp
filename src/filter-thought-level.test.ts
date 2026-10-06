import { describe, expect, it } from "vitest";
import { filterThoughtLevelConfigOption, type ConfigOption, type SelectOption } from "./acp-transforms.mjs";

function thoughtLevel(options: SelectOption[], currentValue?: string): ConfigOption {
  return {
    id: "effort",
    name: "Reasoning effort",
    category: "thought_level",
    type: "select",
    options,
    ...(currentValue !== undefined ? { currentValue } : {}),
  };
}

describe("filterThoughtLevelConfigOption", () => {
  it("drops 'none' when other supported levels are present", () => {
    const input = thoughtLevel([
      { value: "none", name: "None" },
      { value: "low", name: "Low" },
      { value: "high", name: "High" },
      { value: "max", name: "Max" },
    ], "none");

    const result = filterThoughtLevelConfigOption(input);
    expect(result!.options).toHaveLength(3);
    expect(result!.options!.map((o) => o.value)).toEqual(["low", "high", "max"]);
    // currentValue was "none" → replaced with first remaining
    expect(result!.currentValue).toBe("low");
  });

  it("injects 'medium' when only 'none' is present (Qwen case)", () => {
    const input = thoughtLevel([{ value: "none", name: "None" }], "none");

    const result = filterThoughtLevelConfigOption(input);
    expect(result!.options).toEqual([{ value: "medium", name: "Medium" }]);
    expect(result!.currentValue).toBe("medium");
  });

  it("passes through supported levels without change", () => {
    const input = thoughtLevel([
      { value: "low", name: "Low" },
      { value: "medium", name: "Medium" },
      { value: "high", name: "High" },
      { value: "xhigh", name: "Extra High" },
      { value: "max", name: "Max" },
    ], "medium");

    const result = filterThoughtLevelConfigOption(input);
    expect(result!.options!.map((o) => o.value)).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(result!.currentValue).toBe("medium");
  });

  it("maps 'minimal' to low and keeps it", () => {
    const input = thoughtLevel([
      { value: "minimal", name: "Minimal" },
      { value: "medium", name: "Medium" },
    ], "minimal");

    const result = filterThoughtLevelConfigOption(input);
    expect(result!.options!.map((o) => o.value)).toEqual(["minimal", "medium"]);
    expect(result!.currentValue).toBe("minimal");
  });

  it("drops unknown values that don't map to a known level", () => {
    const input = thoughtLevel([
      { value: "turbo", name: "Turbo" },
      { value: "medium", name: "Medium" },
      { value: "deep-thought", name: "Deep" },
    ], "turbo");

    const result = filterThoughtLevelConfigOption(input);
    expect(result!.options!.map((o) => o.value)).toEqual(["medium"]);
    expect(result!.currentValue).toBe("medium");
  });

  it("returns null when options array is empty", () => {
    const input: ConfigOption = {
      id: "effort",
      category: "thought_level",
      type: "select",
      options: [],
    };

    const result = filterThoughtLevelConfigOption(input);
    expect(result).toBeNull();
  });

  it("returns null when options is undefined", () => {
    const input: ConfigOption = {
      id: "effort",
      category: "thought_level",
      type: "select",
    };

    const result = filterThoughtLevelConfigOption(input);
    expect(result).toBeNull();
  });

  it("keeps 'ultracode' and 'ultra' levels", () => {
    const input = thoughtLevel([
      { value: "ultracode", name: "Ultra Code" },
      { value: "ultra", name: "Ultra" },
    ], "ultra");

    const result = filterThoughtLevelConfigOption(input);
    expect(result!.options!.map((o) => o.value)).toEqual(["ultracode", "ultra"]);
    expect(result!.currentValue).toBe("ultra");
  });

  it("preserves non-thought_level fields", () => {
    const input = thoughtLevel([{ value: "none" }], "none");
    input.id = "custom-effort";
    input.name = "Custom Effort";

    const result = filterThoughtLevelConfigOption(input);
    expect(result!.id).toBe("custom-effort");
    expect(result!.name).toBe("Custom Effort");
    expect(result!.category).toBe("thought_level");
  });

  it("handles mixed none + supported with currentValue on a supported level", () => {
    const input = thoughtLevel([
      { value: "none", name: "None" },
      { value: "medium", name: "Medium" },
      { value: "high", name: "High" },
    ], "high");

    const result = filterThoughtLevelConfigOption(input);
    expect(result!.options!.map((o) => o.value)).toEqual(["medium", "high"]);
    expect(result!.currentValue).toBe("high");
  });
});
