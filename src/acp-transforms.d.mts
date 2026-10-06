// Type declarations for acp-transforms.mjs

export const BB_SUPPORTED_LEVELS: Set<string>;
export const LEVEL_BY_VALUE: Readonly<Record<string, string>>;

export interface SelectOption {
  value: string;
  name?: string;
}

export interface ConfigOption {
  id?: string;
  name?: string;
  category?: string;
  type?: string;
  currentValue?: string;
  options?: SelectOption[];
}

export function flattenSelectOptions(raw: unknown): SelectOption[];
export function filterThoughtLevelConfigOption(configOption: ConfigOption): ConfigOption | null;
export function rewriteConfigOptions(obj: unknown): unknown;
