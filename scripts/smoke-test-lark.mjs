#!/usr/bin/env node

const [appId, appSecret] = process.argv.slice(2);

if (!appId || !appSecret) {
  console.error("Usage: node scripts/smoke-test-lark.mjs <app-id> <app-secret>");
  process.exit(1);
}

const tokenResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    app_id: appId,
    app_secret: appSecret,
  }),
});

if (!tokenResponse.ok) {
  console.error(`Lark auth request failed (${tokenResponse.status})`);
  process.exit(1);
}

const payload = await tokenResponse.json();

if (payload.code !== 0 || !payload.tenant_access_token) {
  console.error(`Lark credentials rejected: ${payload.msg ?? "unknown error"}`);
  process.exit(1);
}

console.log("Lark credentials look valid.");
