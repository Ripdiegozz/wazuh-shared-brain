import { describe, it, expect } from 'vitest';
import {
  RuleSchema,
  DoctrineSchema,
  NodeSchema,
  ConnectionSchema,
  PluginManifestSchema
} from '../../src/core/schema.js';

describe('Core Entity Schemas', () => {
  it('validates a Rule object', () => {
    const validRule = {
      id: 'WZ-01',
      severity: 'HARD',
      category: 'Ingestion & Parsing',
      origin: 'Wazuh Core #1420',
      wazuh_versions: ['4.8.x'],
      title: 'Unified Output Contract',
      body: 'Decoders must adhere to event schema.'
    };
    expect(RuleSchema.parse(validRule)).toEqual(validRule);
  });

  it('rejects invalid Rule severity', () => {
    const invalidRule = {
      id: 'WZ-01',
      severity: 'UNKNOWN',
      category: 'Ingestion',
      title: 'Title',
      body: 'Body'
    };
    expect(() => RuleSchema.parse(invalidRule)).toThrow();
  });

  it('validates a Doctrine object', () => {
    const validDoctrine = {
      id: 'DOC-01',
      status: 'ACTIVE',
      date: '2026-08-25',
      title: 'Single Worker Queue Allocation',
      scope: 'analysisd, remoted',
      thread_ref: 'https://github.com/wazuh/wazuh/pull/18920',
      wazuh_versions: ['>=4.8'],
      body: 'Decoders processing over 10k EPS must utilize dedicated ring-buffer channels.'
    };
    expect(DoctrineSchema.parse(validDoctrine)).toEqual(validDoctrine);
  });

  it('validates Node and Connection objects', () => {
    const node = {
      id: 'analysisd',
      type: 'daemon',
      label: 'Analysis Engine',
      package: 'wazuh-core',
      file_path: 'src/analysisd/main.c',
      description: 'Core analysis engine'
    };
    expect(NodeSchema.parse(node)).toEqual(node);

    const connection = {
      from: 'remoted',
      to: 'analysisd',
      type: 'INVOKES',
      weight: 'CRITICAL',
      description: 'Forwards encrypted raw agent payloads'
    };
    expect(ConnectionSchema.parse(connection)).toEqual(connection);
  });

  it('validates a Plugin Manifest', () => {
    const plugin = {
      id: 'threat-intel',
      name: 'Threat Intelligence Overlay',
      version: '1.2.0',
      description: 'IOC reputation enrichment',
      wazuh_versions: ['>=4.8 <4.11']
    };
    expect(PluginManifestSchema.parse(plugin)).toEqual(plugin);
  });
});
