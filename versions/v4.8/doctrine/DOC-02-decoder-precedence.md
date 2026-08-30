---
id: DOC-02
status: ACTIVE
date: "2026-08-26"
title: "Decoder Precedence Ordering Hierarchy"
scope: "decoders, analysisd"
thread_ref: "https://github.com/wazuh/wazuh/issues/19401"
wazuh_versions: [">=4.8"]
---
Custom plugin decoders must execute after core system decoders (syslog, json, windows-event) unless explicitly tagged with `priority: pre_core`.
