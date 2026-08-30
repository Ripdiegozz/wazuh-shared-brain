---
id: DEV-TS-01
severity: HARD
category: TypeScript Standards
origin: "Wazuh Frontend Architecture Guideline"
wazuh_versions: [">=5.0.0"]
title: "Strict Type Safety in Server Routes and Public APIs"
---
# Strict Type Safety in Server Routes and Public APIs
Server route handlers and plugin public exports must never use `any` or loose type assertions. All external input from requests, query params, or OpenSearch/Wazuh API responses must be validated through explicit schemas (Zod or type guards) before processing.
