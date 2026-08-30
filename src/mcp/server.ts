import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { openDatabase } from '../compiler/db.js';
import { tools, executeTool } from './tools.js';

export interface McpServerOptions {
  dbPath?: string;
}

function getObjectProperties(schema: unknown): Record<string, unknown> {
  if (schema && typeof schema === 'object' && 'shape' in schema && schema.shape && typeof schema.shape === 'object') {
    return schema.shape as Record<string, unknown>;
  }
  return {};
}

export async function startMcpServer(options: McpServerOptions = {}): Promise<void> {
  const db = openDatabase(options.dbPath);

  const server = new Server(
    {
      name: 'wazuh-shared-brain',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: {
          type: 'object',
          properties: getObjectProperties(t.parameters),
        },
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const toolArgs = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
      const result = executeTool(db, name, toolArgs);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name}: ${message}`,
          },
        ],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
