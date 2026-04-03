import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import { listGearTool, executeListGear } from './listGear';
import { getWeatherTool, executeGetWeather } from './getWeather';
import { listLocationsTool, executeListLocations } from './listLocations';
import { webSearchCampsitesTool, executeWebSearchCampsites } from './webSearchCampsites';

/**
 * Restricted tool set for the trip planner agent.
 * Exactly 4 tools — no write operations, no trip creation.
 * Trip creation happens client-side after user confirmation.
 */
export const TRIP_PLANNER_TOOLS: Tool[] = [
  listGearTool,
  getWeatherTool,
  listLocationsTool,
  webSearchCampsitesTool,
];

type ToolInput = Record<string, unknown>;

/**
 * Dispatch trip planner tool calls to the appropriate executor.
 */
export async function executeTripPlannerTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case 'list_gear':
      return executeListGear(input as Parameters<typeof executeListGear>[0]);
    case 'get_weather':
      return executeGetWeather(input as Parameters<typeof executeGetWeather>[0]);
    case 'list_locations':
      return executeListLocations(input as Parameters<typeof executeListLocations>[0]);
    case 'web_search_campsites':
      return executeWebSearchCampsites(input as Parameters<typeof executeWebSearchCampsites>[0]);
    default:
      return `Error: Unknown tool: ${name}`;
  }
}
