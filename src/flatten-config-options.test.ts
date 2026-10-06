import { describe, it, expect } from "vitest";
import { flattenSelectOptions, type SelectOption } from "./acp-transforms.mjs";

describe("flattenSelectOptions", () => {
  it("returns empty array for non-array input", () => {
    expect(flattenSelectOptions(null)).toEqual([]);
    expect(flattenSelectOptions(undefined)).toEqual([]);
    expect(flattenSelectOptions("not an array")).toEqual([]);
    expect(flattenSelectOptions({})).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(flattenSelectOptions([])).toEqual([]);
  });

  it("passes through already-flat options", () => {
    const input: SelectOption[] = [
      { value: "model-a", name: "Model A" },
      { value: "model-b", name: "Model B" },
    ];
    const result = flattenSelectOptions(input);
    expect(result).toEqual([
      { value: "model-a", name: "Model A" },
      { value: "model-b", name: "Model B" },
    ]);
  });

  it("flattens a single group", () => {
    const input = [
      {
        group: "jetbrains-ai",
        options: [
          { value: "gpt-4o", name: "GPT-4o" },
          { value: "claude-sonnet-4", name: "Claude Sonnet 4" },
        ],
      },
    ];
    const result = flattenSelectOptions(input);
    expect(result).toEqual([
      { value: "gpt-4o", name: "GPT-4o" },
      { value: "claude-sonnet-4", name: "Claude Sonnet 4" },
    ]);
  });

  it("flattens multiple groups", () => {
    const input = [
      {
        group: "group-a",
        options: [
          { value: "a1", name: "A1" },
          { value: "a2", name: "A2" },
        ],
      },
      {
        group: "group-b",
        options: [
          { value: "b1", name: "B1" },
        ],
      },
    ];
    const result = flattenSelectOptions(input);
    expect(result).toEqual([
      { value: "a1", name: "A1" },
      { value: "a2", name: "A2" },
      { value: "b1", name: "B1" },
    ]);
  });

  it("handles mixed flat and group items", () => {
    const input = [
      { value: "standalone", name: "Standalone" },
      {
        group: "group-x",
        options: [{ value: "nested-1", name: "Nested 1" }],
      },
      { value: "another-flat", name: "Another Flat" },
    ];
    const result = flattenSelectOptions(input);
    expect(result).toEqual([
      { value: "standalone", name: "Standalone" },
      { value: "nested-1", name: "Nested 1" },
      { value: "another-flat", name: "Another Flat" },
    ]);
  });

  it("skips options without a string value", () => {
    const input = [
      {
        group: "mixed",
        options: [
          { value: "valid", name: "Valid" },
          { name: "No value" },
          { value: 123, name: "Number value" },
          { value: undefined, name: "Undefined value" },
        ],
      },
    ];
    const result = flattenSelectOptions(input);
    expect(result).toEqual([{ value: "valid", name: "Valid" }]);
  });

  it("handles options without name", () => {
    const input = [
      {
        group: "minimal",
        options: [
          { value: "model-x" },
          { value: "model-y", name: "Model Y" },
        ],
      },
    ];
    const result = flattenSelectOptions(input);
    expect(result).toEqual([
      { value: "model-x", name: undefined },
      { value: "model-y", name: "Model Y" },
    ]);
  });

  it("handles real Junie-like response with many models", () => {
    const models = Array.from({ length: 18 }, (_, i) => ({
      value: `model-${i}`,
      name: `Model ${i}`,
    }));
    const input = [{ group: "jetbrains-ai", options: models }];
    const result = flattenSelectOptions(input);
    expect(result).toHaveLength(18);
    expect(result[0]).toEqual({ value: "model-0", name: "Model 0" });
    expect(result[17]).toEqual({ value: "model-17", name: "Model 17" });
  });

  it("skips null/non-object items in the array", () => {
    const input: unknown[] = [
      null,
      "string",
      42,
      { value: "real", name: "Real" },
    ];
    const result = flattenSelectOptions(input);
    expect(result).toEqual([{ value: "real", name: "Real" }]);
  });
});
