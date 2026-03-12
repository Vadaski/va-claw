#!/usr/bin/env node

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const botToken = process.env.VA_CLAW_SLACK_BOT_TOKEN;
const appToken = process.env.VA_CLAW_SLACK_APP_TOKEN;

const masked = {
  botToken: botToken ? `${botToken.slice(0, 8)}...${botToken.slice(-4)}` : "missing",
  appToken: appToken ? `${appToken.slice(0, 8)}...${appToken.slice(-4)}` : "missing",
};

console.log("Slack smoke test");
console.log("Bot token:", masked.botToken);
console.log("App token:", masked.appToken);
console.log("Dry run:", dryRun ? "yes" : "no");

if (dryRun) {
  console.log("Slack smoke test config looks valid ✓");
  process.exit(0);
}

if (!botToken || !appToken) {
  console.error("Slack smoke test requires VA_CLAW_SLACK_BOT_TOKEN and VA_CLAW_SLACK_APP_TOKEN.");
  process.exit(1);
}

const response = await fetch("https://slack.com/api/auth.test", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${botToken}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "",
});

const payload = await response.json();

if (!response.ok || payload.ok !== true) {
  const description = payload && typeof payload === "object" && "error" in payload ? payload.error : "unknown error";
  console.error(`Slack API verification failed (${response.status}): ${description}`);
  process.exit(1);
}

console.log("Slack app token valid ✓");
console.log(`Team: ${payload.team}`);
