---
id: DEV-RBAC-01
severity: HARD
category: Security & Authorization
origin: "Wazuh Dashboard RBAC Specification #12"
wazuh_versions: [">=4.10.0"]
title: "Mandatory Endpoint Permission Registration"
---
# Mandatory Endpoint Permission Registration
Every new server route registered in `server/routes/` must declare its corresponding permission in `common/api-info/security-actions.json`. Endpoints must invoke `tryCatchForIndexPermissionError` or RBAC preflight middleware before dispatching requests to the Wazuh Manager.
