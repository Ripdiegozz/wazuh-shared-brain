---
id: DEV-CYPRESS-01
severity: WARN
category: E2E Automation
origin: "Wazuh Cypress Best Practices"
wazuh_versions: [">=4.8.0"]
title: "Robust Data-Test-Subj Selector Contract"
---
# Robust Data-Test-Subj Selector Contract
Cypress functional and visual integration tests must query UI elements exclusively through `data-test-subj` attributes or dedicated Page Object models. Selecting elements via unstable CSS utility classes (e.g. `.euiButton`, `.wz-flex`) is prohibited.
