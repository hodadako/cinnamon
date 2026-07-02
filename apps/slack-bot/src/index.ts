import { createJsonlLogger, getConfigIssues, loadCinnamonConfig, openCinnamonDatabase, summarizeConfig } from "@cinnamon/core";
import { createCinnamonSlackApp } from "./slack-app";

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

    if (!config.slack.botToken || !config.slack.appToken) {
      console.log("Slack bot did not start because Slack Socket Mode credentials are missing.");
      return;
    }
  }

  const logger = createJsonlLogger(config.logDir);
  const openedDatabase = openCinnamonDatabase(config.dbPath);
  const slackApp = createCinnamonSlackApp(config, {
    database: openedDatabase.database,
    logger
  });
  await slackApp.start();
  console.log("Slack bot is running in Socket Mode.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
