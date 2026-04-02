import { get, set, del, keys, createStore } from 'idb-keyval'

const queueStore = createStore('outland-queue', 'writes')

export interface QueuedWrite {
  id: string
  checklistId: string
  itemId: string
  checked: boolean
  queuedAt: string
}

export async function queueCheckOff(
  checklistId: string,
  itemId: string,
  checked: boolean
): Promise<void> {
  const id = `check:${checklistId}:${itemId}`
  const write: QueuedWrite = {
    id,
    checklistId,
    itemId,
    checked,
    queuedAt: new Date().toISOString(),
  }
  await set(id, write, queueStore)
}

export async function getPendingWrites(): Promise<QueuedWrite[]> {
  const allKeys = await keys(queueStore)
  const writes: QueuedWrite[] = []
  for (const key of allKeys) {
    const write = await get(key, queueStore)
    if (write) writes.push(write as QueuedWrite)
  }
  return writes
}

export async function removeWrite(id: string): Promise<void> {
  await del(id, queueStore)
}

export async function clearQueue(): Promise<void> {
  const allKeys = await keys(queueStore)
  for (const key of allKeys) {
    await del(key, queueStore)
  }
}
