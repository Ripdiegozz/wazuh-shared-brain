---
id: DOC-DEV-02
status: ACTIVE
date: "2026-08-29"
title: "Server API Client Error Serialization & Envelope Standard"
scope: "server/services/server-api-client.ts"
thread_ref: "https://github.com/wazuh/wazuh-dashboard-plugins/pull/6250"
wazuh_versions: [">=4.10.0"]
---
All HTTP communication with the Wazuh Manager REST API must flow through `server-api-client.ts`. Upstream 4xx/5xx responses, connection timeouts, and authentication errors must be caught and transformed into standard `{ error: number, message: string, detail?: unknown }` envelopes before sending to the client browser.
