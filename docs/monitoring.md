# External Uptime Monitoring

The app exposes a public health-check endpoint that external uptime services
can poll without any authentication header.

## Endpoint

```
GET https://vktulbeswsoschfvmrlx.supabase.co/functions/v1/health-check
```

- **No `apikey`, `Authorization`, or CORS preflight required.**
- Response time target: < 500 ms.
- Polling interval: 1–5 minutes recommended.

## Response contract

| Scenario              | HTTP | Body                                                                |
| --------------------- | ---- | ------------------------------------------------------------------- |
| Healthy               | 200  | `{ "status": "ok",       "db": "connected", "timestamp": "..." }`   |
| Database unreachable  | 503  | `{ "status": "degraded", "db": "error",     "timestamp": "..." }`   |
| Function crash        | 500  | `{ "status": "error",                       "timestamp": "..." }`   |

Configure the monitor to alert on:
- Any non-2xx HTTP status, **or**
- Response body NOT containing the string `"status":"ok"`.

## Quick verification

```bash
curl -i https://vktulbeswsoschfvmrlx.supabase.co/functions/v1/health-check
```

Expect `HTTP/2 200` and `{"status":"ok",...}`.

---

## Setup instructions

### UptimeRobot (free tier supports this)

1. Sign in at https://uptimerobot.com → **+ Add New Monitor**.
2. Monitor Type: **HTTP(s) - Keyword**.
3. Friendly Name: `FTrack health-check`.
4. URL: `https://vktulbeswsoschfvmrlx.supabase.co/functions/v1/health-check`
5. Keyword Type: **Exists**. Keyword: `"status":"ok"`.
6. Monitoring Interval: **5 minutes**.
7. Alert Contacts: add your email / Slack / SMS channel.
8. **Create Monitor.**

### BetterStack (Better Uptime)

1. **Monitors → Create monitor**.
2. URL to monitor: the endpoint above.
3. Check frequency: **1 minute** (paid) or **3 minutes** (free).
4. Expected status code: `200`.
5. Required response body: `"status":"ok"`.
6. Regions: at least 2 (e.g. EU + US).
7. On-call escalation: link to your team.
8. **Save.**

### Pingdom

1. **Experience Monitoring → Uptime → Add new check**.
2. Check type: **HTTP**.
3. URL: the endpoint above.
4. Should contain: `"status":"ok"`.
5. Check interval: **1 minute**.
6. Alert policy: assign integration.

### Self-hosted (Healthchecks.io, Cronitor, custom cron)

Run this every minute from your monitoring host:

```bash
curl -fsS https://vktulbeswsoschfvmrlx.supabase.co/functions/v1/health-check \
  | grep -q '"status":"ok"' \
  || curl -fsS https://hc-ping.com/<your-uuid>/fail
```

---

## Status pages

Most providers (BetterStack, UptimeRobot Pro, Pingdom) can publish a public
status page directly from this monitor. Useful URL conventions:

- `https://status.ftrack.uk` — recommended subdomain to CNAME to the
  provider's status page host.

## Troubleshooting

- **Monitor reports 503 but the app works**: the DB connectivity probe
  (`profile_type_config` SELECT) failed. Check Lovable Cloud status in
  Settings → Cloud and the edge function logs for `health-check`.
- **Monitor reports timeouts**: edge functions cold-start can occasionally
  exceed 1s. Set the monitor timeout to **10 seconds** to avoid false
  positives.
- **Sudden 401 from the provider**: do NOT add an `Authorization` or
  `apikey` header — this endpoint is intentionally public.
