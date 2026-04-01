import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// Plan 01 tools (query-only)
import { gearTool, executeGearTool } from './gear';
import { tripsTool, executeTripsTool } from './trips';
import { locationsTool, executeLocationsTool } from './locations';
import { knowledgeTool, executeKnowledgeTool } from './knowledge';
import { weatherTool, executeWeatherTool } from './weather';

// Plan 02 tools (expanded read + write registry)
import { searchKnowledgeTool, executeSearchKnowledge } from './searchKnowledge';
// Plan 05-01 tools (recommendations)
import { recommendSpotsTool, executeRecommendSpots } from './recommend';
import { listGearTool, executeListGear } from './listGear';
import { updateGearTool, executeUpdateGear } from './updateGear';
import { listTripsTool, executeListTrips } from './listTrips';
import { getTripTool, executeGetTrip } from './getTrip';
import { createTripTool, executeCreateTrip } from './createTrip';
import { updateTripTool, executeUpdateTrip } from './updateTrip';
import { listLocationsTool, executeListLocations } from './listLocations';
import { getWeatherTool, executeGetWeather } from './getWeather';
import { togglePackingItemTool, executeTogglePackingItem } from './togglePackingItem';
import { deleteConfirmTool, executeDeleteConfirm } from './deleteConfirm';

// Legacy ALL_TOOLS export (Plan 01 pattern — kept for backward compat)
export const ALL_TOOLS: Tool[] = [
  gearTool,
  tripsTool,
  locationsTool,
  knowledgeTool,
  weatherTool,
];

// Plan 02: Full AGENT_TOOLS registry with all 11 tools
export const AGENT_TOOLS: Tool[] = [
  searchKnowledgeTool,
  listGearTool,
  updateGearTool,
  listTripsTool,
  getTripTool,
  createTripTool,
  updateTripTool,
  listLocationsTool,
  getWeatherTool,
  togglePackingItemTool,
  deleteConfirmTool,
  recommendSpotsTool, // Phase 05 Plan 01
];

type ToolInput = Record<string, unknown>;

// Legacy dispatcher (Plan 01 pattern)
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

// Plan 02: Full tool dispatcher for AGENT_TOOLS
export async function executeAgentTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case 'search_knowledge_base':
      return executeSearchKnowledge(input as Parameters<typeof executeSearchKnowledge>[0]);
    case 'list_gear':
      return executeListGear(input as Parameters<typeof executeListGear>[0]);
    case 'update_gear':
      return executeUpdateGear(input as Parameters<typeof executeUpdateGear>[0]);
    case 'list_trips':
      return executeListTrips(input as Parameters<typeof executeListTrips>[0]);
    case 'get_trip':
      return executeGetTrip(input as Parameters<typeof executeGetTrip>[0]);
    case 'create_trip':
      return executeCreateTrip(input as Parameters<typeof executeCreateTrip>[0]);
    case 'update_trip':
      return executeUpdateTrip(input as Parameters<typeof executeUpdateTrip>[0]);
    case 'list_locations':
      return executeListLocations(input as Parameters<typeof executeListLocations>[0]);
    case 'get_weather':
      return executeGetWeather(input as Parameters<typeof executeGetWeather>[0]);
    case 'toggle_packing_item':
      return executeTogglePackingItem(input as Parameters<typeof executeTogglePackingItem>[0]);
    case 'request_delete_confirmation':
      return executeDeleteConfirm(input as Parameters<typeof executeDeleteConfirm>[0]);
    case 'recommend_spots':
      return executeRecommendSpots(input as Parameters<typeof executeRecommendSpots>[0]);
    default:
      return `Error: Unknown tool: ${name}`;
  }
}
