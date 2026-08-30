---
id: DOC-50-02
status: ACTIVE
date: "2026-08-29"
title: "Decoupled Plugin Architecture in Wazuh Dashboard 5.0"
scope: "wazuh-dashboard, wazuh-security-dashboards-plugin, wazuh-dashboard-security-analytics"
thread_ref: "https://github.com/wazuh/wazuh-dashboard-plugins/issues/6400"
wazuh_versions: [">=5.0.0"]
---
Dashboard plugins in 5.0 communicate via standalone micro-frontend interfaces and decoupled REST API contracts, removing hard compile-time couplings with OpenSearch core.
