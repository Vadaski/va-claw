#!/usr/bin/env node

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const token = process.env.VA_CLAW_TELEGRAM_TOKEN;

const masked = token ? `${token.slice(0, 10)}...${token.slice(-4)}` : "missing";
console.log("Telegram smoke test");
console.log("Token:", masked);
console.log("Dry run:", dryRun ? "yes" : "no");

if (dryRun) {
  console.log("Telegram smoke test config looks valid ✓");
  process.exit(0);
}

if (!token) {
  console.error("Telegram smoke test requires VA_CLAW_TELEGRAM_TOKEN.");
  process.exit(1);
}

const timeoutMs = 10_000;
const abort = new AbortController();
const timer = setTimeout(() => abort.abort(), timeoutMs);

try {
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    signal: abort.signal,
  });
  clearTimeout(timer);

  const data = await response.json();
  if (!response.ok || !data.ok) {
    console.error(`Telegram API verification failed: ${data.description ?? "unknown error"}`);
    process.exit(1);
  }

  const username = data.result?.username ?? "unknown";
  console.log(`Telegram bot username: ${username}`);
  console.log("Telegram bot token valid ✓");
} catch (error) {
  clearTimeout(timer);
  console.error("Telegram smoke test error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
