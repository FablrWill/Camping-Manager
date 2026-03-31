import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const deleteConfirmTool: Tool = {
  name: 'request_delete_confirmation',
  description: 'Request user confirmation before deleting. Returns a confirmation prompt — never deletes directly.',
  input_schema: {
    type: 'object',
    properties: {
      itemType: {
        type: 'string',
        enum: ['gear', 'trip', 'location'],
        description: 'Type of item to delete',
      },
      itemId: {
        type: 'string',
        description: 'ID of the item to delete',
      },
      itemName: {
        type: 'string',
        description: 'Human-readable name of the item',
      },
      description: {
        type: 'string',
        description: 'Brief description of what will be deleted and why',
      },
    },
    required: ['itemType', 'itemId', 'itemName', 'description'],
  },
};

export async function executeDeleteConfirm(input: {
  itemType: 'gear' | 'trip' | 'location';
  itemId: string;
  itemName: string;
  description: string;
}): Promise<string> {
  // This tool NEVER deletes. It returns a structured JSON signal that the
  // ChatClient detects and renders as an inline confirmation card.
  // The user's reply ("yes, delete it" / "keep it") triggers actual deletion
  // in the next conversation turn if confirmed.
  return JSON.stringify({
    action: 'confirm_delete',
    itemType: input.itemType,
    itemId: input.itemId,
    itemName: input.itemName,
    description: input.description,
  });
}
