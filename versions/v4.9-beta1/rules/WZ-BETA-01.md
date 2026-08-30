---
id: WZ-BETA-01
severity: HARD
category: Experimental Pipeline
origin: "Wazuh v4.9-beta1 RFC"
wazuh_versions: ["4.9.0-beta1"]
title: "Lock-Free Ringbuffer Invariant"
---
# Lock-Free Ringbuffer Invariant
Beta builds enabling the lock-free ringbuffer must reserve 64MB shared memory pages per worker core.
