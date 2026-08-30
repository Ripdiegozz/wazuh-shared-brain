---
id: DOC-50-01
status: ACTIVE
date: "2026-08-28"
title: "Rust Engine v2 Multi-Threaded Execution Model"
scope: "wazuh-engine, wazuh-manager"
thread_ref: "https://github.com/wazuh/wazuh/pull/22100"
wazuh_versions: [">=5.0.0"]
---
Wazuh 5.0 replaces the legacy single-threaded C analysis loop with a multi-threaded Rust execution engine utilizing lock-free queues and vectorized rule evaluation.
