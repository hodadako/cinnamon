import { getConfigIssues, loadCinnamonConfig, summarizeConfig } from "@cinnamon/core";

async function main(): Promise<void> {
  const config = loadCinnamonConfig(process.env);
  const issues = getConfigIssues(config);

  console.log("Cinnamon Slack bot starting with config:");
  console.log(JSON.stringify(summarizeConfig(config), null, 2));

  if (issues.length > 0) {
    console.log("Configuration is incomplete for live Slack/GitHub traffic:");
    for (const issue of issues) {
      console.log(`- ${issue.key}: ${issue.message}`);
    }
  }

  console.log("Slack Bolt wiring is scheduled for the Slack command handling ticket.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
