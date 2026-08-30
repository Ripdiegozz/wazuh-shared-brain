---
id: DOC-03
status: ACTIVE
date: "2026-08-28"
title: "Engine v2 Architecture Transition"
scope: "analysisd, engine-v2"
thread_ref: "https://github.com/wazuh/wazuh/issues/20100"
wazuh_versions: [">=4.9"]
---
Engine v2 introduces multi-threaded event pipelines with lock-free ring buffers, superseding the legacy single-threaded analysis loop.
