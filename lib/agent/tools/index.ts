import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { gearTool, executeGearTool } from './gear';
import { tripsTool, executeTripsTool } from './trips';
import { locationsTool, executeLocationsTool } from './locations';
import { knowledgeTool, executeKnowledgeTool } from './knowledge';
import { weatherTool, executeWeatherTool } from './weather';

export const ALL_TOOLS: Tool[] = [
  gearTool,
  tripsTool,
  locationsTool,
  knowledgeTool,
  weatherTool,
];

type ToolInput = Record<string, unknown>;

export async function executeTool(name: string, input: ToolInput): Promise<unknown> {
  switch (name) {
    case 'query_gear':
      return executeGearTool(input as Parameters<typeof executeGearTool>[0]);
    case 'query_trips':
      return executeTripsTool(input as Parameters<typeof executeTripsTool>[0]);
    case 'query_locations':
      return executeLocationsTool(input as Parameters<typeof executeLocationsTool>[0]);
    case 'search_knowledge':
      return executeKnowledgeTool(input as Parameters<typeof executeKnowledgeTool>[0]);
    case 'get_weather':
      return executeWeatherTool(input as Parameters<typeof executeWeatherTool>[0]);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
