export interface CinnamonCommand {
  rawText: string;
  name: string;
  args: string[];
}

export function parseCinnamonCommand(text: string | undefined): CinnamonCommand {
  const rawText = text?.trim() ?? "";
  const parts = rawText.length > 0 ? rawText.split(/\s+/) : [];
  const [name = "help", ...args] = parts;

  return {
    rawText,
    name: name.toLowerCase(),
    args
  };
}

export function renderCommandResponse(command: CinnamonCommand): string {
  switch (command.name) {
    case "help":
      return [
        "Cinnamon commands:",
        "`/cinnamon bootstrap <code>`",
        "`/cinnamon subscribe owner/repo pulls`",
        "`/cinnamon pr summary <url>`",
        "`/cinnamon logs recent`"
      ].join("\n");

    case "bootstrap":
      return "Bootstrap flow is wired next. This command is recognized.";

    case "subscribe":
      return "Repo subscription flow is wired after bootstrap storage. This command is recognized.";

    case "pr":
      return renderPrCommandResponse(command.args);

    case "logs":
      return "Log lookup flow is wired after JSONL query commands. This command is recognized.";

    default:
      return `Unknown Cinnamon command: \`${command.name}\`. Try \`/cinnamon help\`.`;
  }
}

export function parseRepoName(value: string | undefined): { owner: string; name: string } | undefined {
  if (!value) {
    return undefined;
  }

  const [owner, name] = value.split("/");

  if (!owner || !name) {
    return undefined;
  }

  return { owner, name };
}

function renderPrCommandResponse(args: string[]): string {
  if (args[0] === "summary") {
    return "PR summary flow is wired after the GitHub adapter. This command is recognized.";
  }

  return "Supported PR command for MVP: `/cinnamon pr summary <url>`.";
}
