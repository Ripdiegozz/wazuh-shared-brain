---
id: DEV-TEST-01
severity: HARD
category: Testing Discipline
origin: "Wazuh Quality Assurance Standard QA-04"
wazuh_versions: [">=4.8.0"]
title: "Co-located Unit Test Coverage for Routes and Services"
---
# Co-located Unit Test Coverage for Routes and Services
Every file in `server/routes/`, `server/services/`, and `public/services/` must have a co-located `.test.ts` unit test suite using Jest. Mocking the Wazuh API client is required; testing against live external ports in unit tests is forbidden.
