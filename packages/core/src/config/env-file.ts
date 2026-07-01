export function parseEnvFile(input: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    result[key] = unquoteEnvValue(rawValue);
  }

  return result;
}

export function serializeEnvFile(values: Record<string, string | undefined>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }

    lines.push(`${key}=${quoteEnvValue(value)}`);
  }

  return `${lines.join("\n")}\n`;
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function quoteEnvValue(value: string): string {
  if (/^[A-Za-z0-9_./:@,-]*$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}
