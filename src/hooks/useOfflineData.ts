import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineDb, CachedSite, CachedEquipment, CachedInspection, CachedGasMovement, CachedCylinder } from '@/lib/offline-db';
import { cacheCompanyData } from '@/lib/sync-service';
import { useAuth } from './useAuth';

// Hook to fetch and cache sites with offline fallback
export function useOfflineSites() {
  const { isOnline } = useNetworkStatus();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ['sites', companyId, 'offline'],
    queryFn: async () => {
      if (!companyId) return [];

      if (isOnline) {
        // Fetch from Supabase and cache
        const { data, error } = await supabase
          .from('sites')
          .select('*')
          .eq('company_id', companyId)
          .is('is_deleted', false)
          .order('name');

        if (error) throw error;

        // Cache for offline use
        if (data) {
          await offlineDb.sites.clear();
          await offlineDb.sites.bulkPut(data);
        }

        return data as CachedSite[];
      } else {
        // Return cached data when offline
        return await offlineDb.sites
          .where('company_id')
          .equals(companyId)
          .toArray();
      }
    },
    enabled: !!companyId,
    staleTime: isOnline ? 30000 : Infinity,
  });
}

// Hook to fetch and cache equipment with offline fallback
export function useOfflineEquipment(siteId?: string) {
  const { isOnline } = useNetworkStatus();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ['equipment', companyId, siteId, 'offline'],
    queryFn: async () => {
      if (!companyId) return [];

      if (isOnline) {
        let query = supabase
          .from('equipment')
          .select('*')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('name');

        if (siteId) {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Cache for offline use
        if (data) {
          if (siteId) {
            // Only update equipment for this site
            await offlineDb.equipment
              .where('site_id')
              .equals(siteId)
              .delete();
          } else {
            await offlineDb.equipment.clear();
          }
          await offlineDb.equipment.bulkPut(data);
        }

        return data as CachedEquipment[];
      } else {
        // Return cached data when offline
        if (siteId) {
          return await offlineDb.equipment
            .where('site_id')
            .equals(siteId)
            .toArray();
        }
        return await offlineDb.equipment
          .where('company_id')
          .equals(companyId)
          .toArray();
      }
    },
    enabled: !!companyId,
    staleTime: isOnline ? 30000 : Infinity,
  });
}

// Hook to fetch inspections with offline fallback
export function useOfflineInspections(equipmentId?: string) {
  const { isOnline } = useNetworkStatus();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ['inspections', companyId, equipmentId, 'offline'],
    queryFn: async () => {
      if (!companyId) return [];

      if (isOnline) {
        let query = supabase
          .from('inspections')
          .select('*')
          .eq('company_id', companyId)
          .order('inspection_date', { ascending: false });

        if (equipmentId) {
          query = query.eq('equipment_id', equipmentId);
        }

        const { data, error } = await query.limit(500);
        if (error) throw error;

        // Cache for offline use
        if (data && !equipmentId) {
          await offlineDb.inspections.clear();
          await offlineDb.inspections.bulkPut(data);
        }

        return data as CachedInspection[];
      } else {
        // Return cached data when offline (including pending sync items)
        if (equipmentId) {
          return await offlineDb.inspections
            .where('equipment_id')
            .equals(equipmentId)
            .reverse()
            .sortBy('inspection_date');
        }
        return await offlineDb.inspections
          .where('company_id')
          .equals(companyId)
          .reverse()
          .sortBy('inspection_date');
      }
    },
    enabled: !!companyId,
    staleTime: isOnline ? 30000 : Infinity,
  });
}

// Hook to fetch gas movements with offline fallback
export function useOfflineGasMovements() {
  const { isOnline } = useNetworkStatus();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ['gas-movements', companyId, 'offline'],
    queryFn: async () => {
      if (!companyId) return [];

      if (isOnline) {
        const { data, error } = await supabase
          .from('refrigerant_movements')
          .select('*')
          .eq('company_id', companyId)
          .order('movement_date', { ascending: false })
          .limit(500);

        if (error) throw error;

        // Cache for offline use
        if (data) {
          await offlineDb.gasMovements.clear();
          await offlineDb.gasMovements.bulkPut(data);
        }

        return data as CachedGasMovement[];
      } else {
        return await offlineDb.gasMovements
          .where('company_id')
          .equals(companyId)
          .reverse()
          .sortBy('movement_date');
      }
    },
    enabled: !!companyId,
    staleTime: isOnline ? 30000 : Infinity,
  });
}

// Hook to fetch cylinders with offline fallback
export function useOfflineCylinders() {
  const { isOnline } = useNetworkStatus();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ['cylinders', companyId, 'offline'],
    queryFn: async () => {
      if (!companyId) return [];

      if (isOnline) {
        const { data, error } = await supabase
          .from('refrigerant_cylinders')
          .select('*')
          .eq('company_id', companyId)
          .order('cylinder_code');

        if (error) throw error;

        // Cache for offline use
        if (data) {
          await offlineDb.cylinders.clear();
          await offlineDb.cylinders.bulkPut(data);
        }

        return data as CachedCylinder[];
      } else {
        return await offlineDb.cylinders
          .where('company_id')
          .equals(companyId)
          .toArray();
      }
    },
    enabled: !!companyId,
    staleTime: isOnline ? 30000 : Infinity,
  });
}

// Hook to pre-cache all data for offline use
export function useDataCaching() {
  const { isOnline } = useNetworkStatus();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const cacheAllData = useCallback(async () => {
    if (!profile?.company_id || !isOnline) return;
    
    try {
      await cacheCompanyData(profile.company_id);
      // Invalidate queries to refresh from cache
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['gas-movements'] });
      queryClient.invalidateQueries({ queryKey: ['cylinders'] });
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }, [profile?.company_id, isOnline, queryClient]);

  // Auto-cache on login and periodically
  useEffect(() => {
    if (profile?.company_id && isOnline) {
      cacheAllData();
      
      // Refresh cache every 15 minutes when online
      const interval = setInterval(cacheAllData, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [profile?.company_id, isOnline, cacheAllData]);

  return { cacheAllData };
}
