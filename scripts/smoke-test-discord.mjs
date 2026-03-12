#!/usr/bin/env node

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const token = process.env.VA_CLAW_DISCORD_TOKEN;
const clientId = process.env.VA_CLAW_DISCORD_CLIENT_ID;

const masked = {
  token: token ? `${token.slice(0, 8)}...${token.slice(-4)}` : "missing",
  clientId,
};

console.log("Discord smoke test");
console.log("Token:", masked.token);
console.log("Client ID:", masked.clientId);
console.log("Dry run:", dryRun ? "yes" : "no");

if (dryRun) {
  console.log("Discord smoke test config looks valid ✓");
  process.exit(0);
}

if (!token || !clientId) {
  console.error("Discord smoke test requires VA_CLAW_DISCORD_TOKEN and VA_CLAW_DISCORD_CLIENT_ID.");
  process.exit(1);
}

const response = await fetch("https://discord.com/api/v10/gateway/bot", {
  headers: {
    Authorization: `Bot ${token}`,
  },
});

if (!response.ok) {
  const text = await response.text();
  console.error(`Discord API request failed (${response.status}): ${text}`);
  process.exit(1);
}

const payload = await response.json();
if (!payload.url) {
  console.error("Discord token validation did not return gateway url.");
  process.exit(1);
}

console.log("Discord bot token valid ✓");
console.log(`Gateway URL: ${payload.url}`);
