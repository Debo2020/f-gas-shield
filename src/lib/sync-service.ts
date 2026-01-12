import { supabase } from '@/integrations/supabase/client';
import { offlineDb, SyncQueueItem } from './offline-db';
import { toast } from 'sonner';

// Generate a temporary local UUID for offline records
export function generateLocalId(): string {
  return `local_${crypto.randomUUID()}`;
}

// Cache all company data to IndexedDB for offline access
export async function cacheCompanyData(companyId: string): Promise<void> {
  try {
    console.log('[Sync] Caching company data for offline use...');
    
    const [sitesRes, equipmentRes, inspectionsRes, gasMovementsRes, cylindersRes] = await Promise.all([
      supabase.from('sites').select('*').eq('company_id', companyId).is('is_deleted', false),
      supabase.from('equipment').select('*').eq('company_id', companyId).is('deleted_at', null),
      supabase.from('inspections').select('*').eq('company_id', companyId).order('inspection_date', { ascending: false }).limit(500),
      supabase.from('refrigerant_movements').select('*').eq('company_id', companyId).order('movement_date', { ascending: false }).limit(500),
      supabase.from('refrigerant_cylinders').select('*').eq('company_id', companyId),
    ]);

    // Clear existing cached data and store new data
    await Promise.all([
      offlineDb.sites.clear().then(() => sitesRes.data && offlineDb.sites.bulkPut(sitesRes.data)),
      offlineDb.equipment.clear().then(() => equipmentRes.data && offlineDb.equipment.bulkPut(equipmentRes.data)),
      offlineDb.inspections.clear().then(() => inspectionsRes.data && offlineDb.inspections.bulkPut(inspectionsRes.data)),
      offlineDb.gasMovements.clear().then(() => gasMovementsRes.data && offlineDb.gasMovements.bulkPut(gasMovementsRes.data)),
      offlineDb.cylinders.clear().then(() => cylindersRes.data && offlineDb.cylinders.bulkPut(cylindersRes.data)),
    ]);

    console.log('[Sync] Data cached successfully', {
      sites: sitesRes.data?.length || 0,
      equipment: equipmentRes.data?.length || 0,
      inspections: inspectionsRes.data?.length || 0,
      gasMovements: gasMovementsRes.data?.length || 0,
      cylinders: cylindersRes.data?.length || 0,
    });
  } catch (error) {
    console.error('[Sync] Failed to cache company data:', error);
    throw error;
  }
}

// Queue a change for later sync
export async function queueChange(
  table: string,
  action: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>,
  localId: string
): Promise<void> {
  await offlineDb.syncQueue.add({
    table,
    action,
    data,
    local_id: localId,
    created_at: new Date().toISOString(),
    synced: false,
    sync_attempts: 0,
    last_error: null,
  });
  
  console.log('[Sync] Change queued for sync:', { table, action, localId });
}

// Sync all queued changes when online
export async function syncQueuedChanges(): Promise<{ success: number; failed: number }> {
  const pending = await offlineDb.syncQueue
    .where('synced')
    .equals(0)
    .toArray();

  if (pending.length === 0) {
    return { success: 0, failed: 0 };
  }

  console.log(`[Sync] Syncing ${pending.length} queued changes...`);
  
  let success = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await syncItem(item);
      
      // Mark as synced
      if (item.id) {
        await offlineDb.syncQueue.update(item.id, { synced: true });
      }
      
      // Update the local record if it was an insert
      if (item.action === 'insert' && item.data.id) {
        await updateLocalRecordAfterSync(item.table, item.local_id, item.data.id as string);
      }
      
      success++;
    } catch (error) {
      console.error('[Sync] Failed to sync item:', item, error);
      
      // Update attempt count and error
      if (item.id) {
        await offlineDb.syncQueue.update(item.id, {
          sync_attempts: (item.sync_attempts || 0) + 1,
          last_error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      
      failed++;
    }
  }

  if (success > 0) {
    toast.success(`Synced ${success} offline changes`);
  }
  
  if (failed > 0) {
    toast.error(`Failed to sync ${failed} changes`);
  }

  return { success, failed };
}

// Sync a single queued item
async function syncItem(item: SyncQueueItem): Promise<void> {
  const { table, action, data } = item;
  
  // Remove local fields before syncing
  const cleanData = { ...data };
  delete cleanData.pending_sync;
  delete cleanData.local_id;

  switch (action) {
    case 'insert': {
      // Generate a real UUID for the insert
      const realId = crypto.randomUUID();
      const insertData = { ...cleanData, id: realId };
      
      if (table === 'inspections') {
        const { error } = await supabase.from('inspections').insert(insertData as never);
        if (error) throw error;
      } else if (table === 'refrigerant_movements') {
        const { error } = await supabase.from('refrigerant_movements').insert(insertData as never);
        if (error) throw error;
      }
      
      // Store the real ID for later reference
      item.data.id = realId;
      break;
    }
    case 'update': {
      const { id, ...updateData } = cleanData;
      if (table === 'inspections') {
        const { error } = await supabase.from('inspections').update(updateData as never).eq('id', id as string);
        if (error) throw error;
      } else if (table === 'refrigerant_movements') {
        const { error } = await supabase.from('refrigerant_movements').update(updateData as never).eq('id', id as string);
        if (error) throw error;
      }
      break;
    }
    case 'delete': {
      if (table === 'inspections') {
        const { error } = await supabase.from('inspections').delete().eq('id', cleanData.id as string);
        if (error) throw error;
      } else if (table === 'refrigerant_movements') {
        const { error } = await supabase.from('refrigerant_movements').delete().eq('id', cleanData.id as string);
        if (error) throw error;
      }
      break;
    }
  }
}

// Update local IndexedDB record after successful sync
async function updateLocalRecordAfterSync(table: string, localId: string, realId: string): Promise<void> {
  switch (table) {
    case 'inspections': {
      const record = await offlineDb.inspections.where('local_id').equals(localId).first();
      if (record) {
        await offlineDb.inspections.delete(record.id);
        await offlineDb.inspections.put({ ...record, id: realId, pending_sync: false, local_id: undefined });
      }
      break;
    }
    case 'refrigerant_movements': {
      const record = await offlineDb.gasMovements.where('local_id').equals(localId).first();
      if (record) {
        await offlineDb.gasMovements.delete(record.id);
        await offlineDb.gasMovements.put({ ...record, id: realId, pending_sync: false, local_id: undefined });
      }
      break;
    }
  }
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  return await offlineDb.syncQueue.where('synced').equals(0).count();
}

// Clear synced items from queue
export async function clearSyncedItems(): Promise<void> {
  await offlineDb.syncQueue.where('synced').equals(1).delete();
}
