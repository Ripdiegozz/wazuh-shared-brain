---
id: DOC-01
status: ACTIVE
date: "2026-08-25"
title: "Single Worker Queue Allocation for High-Throughput Decoders"
scope: "analysisd, remoted"
thread_ref: "https://github.com/wazuh/wazuh/pull/18920"
wazuh_versions: [">=4.8"]
---
Decoders processing over 10,000 events per second (EPS) must utilize dedicated ring-buffer channels rather than the generic event dispatch queue to avoid backpressure.
