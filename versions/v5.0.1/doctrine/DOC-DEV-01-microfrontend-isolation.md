---
id: DOC-DEV-01
status: ACTIVE
date: "2026-08-28"
title: "Micro-Frontend and Standalone Plugin Isolation in Dashboard 5.x"
scope: "wazuh-dashboard-plugins, wazuh-security-dashboards-plugin"
thread_ref: "https://github.com/wazuh/wazuh-dashboard-plugins/issues/6400"
wazuh_versions: [">=5.0.0"]
---
Dashboard plugins in 5.x must operate as isolated micro-frontends. Cross-plugin dependencies are permitted only through registered plugin service contracts in `plugin.ts` (`setup` and `start` lifecycle methods), never through direct relative module imports across repository boundaries.
