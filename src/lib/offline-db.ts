import Dexie, { Table } from 'dexie';

// Types for offline storage
export interface CachedProfile {
  user_id: string;
  profile: {
    id: string;
    user_id: string;
    company_id: string | null;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    f_gas_certificate_number: string | null;
    f_gas_certificate_expiry: string | null;
    f_gas_certificate_url: string | null;
  };
  roles: string[];
  license_status: string | null;
  cached_at: string;
  credential_hash: string;
  password_hash: string;
}

export interface CachedSite {
  id: string;
  company_id: string;
  name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CachedEquipment {
  id: string;
  site_id: string;
  company_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  refrigerant_type: string;
  refrigerant_charge_kg: number;
  co2_equivalent_tonnes: number | null;
  gwp: number | null;
  installation_date: string | null;
  last_inspection_date: string | null;
  next_inspection_due: string | null;
  inspection_frequency_months: number | null;
  location_description: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CachedInspection {
  id: string;
  equipment_id: string;
  company_id: string;
  inspection_date: string;
  inspector_name: string;
  inspector_id: string | null;
  inspector_certificate_number: string | null;
  result: string;
  leak_check_performed: boolean;
  leak_detected: boolean;
  leak_location: string | null;
  leak_repaired: boolean | null;
  refrigerant_added_kg: number | null;
  refrigerant_recovered_kg: number | null;
  findings: string | null;
  recommendations: string | null;
  next_inspection_due: string | null;
  created_at: string;
  updated_at: string;
  pending_sync?: boolean;
  local_id?: string;
}

export interface CachedGasMovement {
  id: string;
  company_id: string;
  engineer_id: string;
  engineer_name: string;
  equipment_id: string | null;
  cylinder_id: string | null;
  cylinder_reference: string | null;
  movement_type: string;
  refrigerant_type: string;
  weight_kg: number;
  source: string | null;
  notes: string | null;
  movement_date: string;
  created_at: string;
  updated_at: string;
  pending_sync?: boolean;
  local_id?: string;
}

export interface CachedCylinder {
  id: string;
  company_id: string;
  cylinder_code: string;
  refrigerant_type: string;
  initial_weight_kg: number;
  current_weight_kg: number;
  tare_weight_kg: number | null;
  status: string;
  supplier: string | null;
  batch_number: string | null;
  purchase_date: string | null;
  expiry_date: string | null;
  checked_out_to: string | null;
  checked_out_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  local_id: string;
  created_at: string;
  synced: boolean;
  sync_attempts: number;
  last_error: string | null;
}

class FTrackOfflineDatabase extends Dexie {
  cachedProfile!: Table<CachedProfile>;
  sites!: Table<CachedSite>;
  equipment!: Table<CachedEquipment>;
  inspections!: Table<CachedInspection>;
  gasMovements!: Table<CachedGasMovement>;
  cylinders!: Table<CachedCylinder>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('FTrackOffline');
    
    this.version(1).stores({
      cachedProfile: 'user_id',
      sites: 'id, company_id, name',
      equipment: 'id, site_id, company_id, name',
      inspections: 'id, equipment_id, company_id, inspection_date, local_id',
      gasMovements: 'id, engineer_id, company_id, movement_date, local_id',
      cylinders: 'id, company_id, cylinder_code, status',
      syncQueue: '++id, table, local_id, synced, created_at'
    });
  }
}

export const offlineDb = new FTrackOfflineDatabase();

// Utility function to generate a simple hash for credential verification
export async function hashCredentials(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  await Promise.all([
    offlineDb.cachedProfile.clear(),
    offlineDb.sites.clear(),
    offlineDb.equipment.clear(),
    offlineDb.inspections.clear(),
    offlineDb.gasMovements.clear(),
    offlineDb.cylinders.clear(),
    offlineDb.syncQueue.clear(),
  ]);
}

// Get offline data stats
export async function getOfflineStats(): Promise<{
  sites: number;
  equipment: number;
  inspections: number;
  gasMovements: number;
  pendingSync: number;
  lastCached: string | null;
}> {
  const [sites, equipment, inspections, gasMovements, pendingSync, profile] = await Promise.all([
    offlineDb.sites.count(),
    offlineDb.equipment.count(),
    offlineDb.inspections.count(),
    offlineDb.gasMovements.count(),
    offlineDb.syncQueue.where('synced').equals(0).count(),
    offlineDb.cachedProfile.toCollection().first(),
  ]);

  return {
    sites,
    equipment,
    inspections,
    gasMovements,
    pendingSync,
    lastCached: profile?.cached_at || null,
  };
}
