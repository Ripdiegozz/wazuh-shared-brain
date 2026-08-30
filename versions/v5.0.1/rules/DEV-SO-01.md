---
id: DEV-SO-01
severity: HARD
category: Data Migrations
origin: "OpenSearch Dashboards SavedObjects Spec"
wazuh_versions: [">=4.10.0"]
title: "SavedObjects Migration Task Isolation"
---
# SavedObjects Migration Task Isolation
Any change to user preferences, configuration stores, or saved dashboard objects schemas must include a versioned migration script in `server/migration-tasks/`. Destructive schema modifications without backward compatibility transformation functions are blocked by CI.
