import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '@common/utils/axiosetup';

interface OfflineData {
  id: string;
  type: 'permit' | 'approval' | 'photo' | 'signature';
  data: any;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: string | null;
  syncProgress: number;
}

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    syncProgress: 0
  });

  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('ptw_offline_data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setOfflineData(data);
        setSyncStatus(prev => ({ ...prev, pendingCount: data.filter((item: OfflineData) => !item.synced).length }));
      } catch (error) {
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      if (offlineData.some(item => !item.synced)) {
        syncOfflineData();
      }
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineData]);

  const saveOfflineData = useCallback((data: OfflineData[]) => {
    try {
      localStorage.setItem('ptw_offline_data', JSON.stringify(data));
      setOfflineData(data);
      setSyncStatus(prev => ({ 
        ...prev, 
        pendingCount: data.filter(item => !item.synced).length 
      }));
    } catch (error) {
      message.error('Failed to save data offline');
    }
  }, []);

  const addOfflineData = useCallback((type: OfflineData['type'], data: any) => {
    const newItem: OfflineData = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      },
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0
    };

    const updatedData = [...offlineData, newItem];
    saveOfflineData(updatedData);
    
    message.info('Data saved offline - will sync when connection is restored');
    return newItem.id;
  }, [offlineData, saveOfflineData]);

  const syncOfflineData = useCallback(async () => {
    if (!syncStatus.isOnline || syncStatus.isSyncing) {
      return;
    }

    const pendingItems = offlineData.filter(item => !item.synced);
    if (pendingItems.length === 0) {
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));

    try {
      let syncedCount = 0;
      const maxRetries = 3;

      for (const item of pendingItems) {
        try {
          if (item.retryCount >= maxRetries) {
            continue;
          }

          let success = false;
          switch (item.type) {
            case 'permit':
              success = await syncPermit(item);
              break;
            case 'approval':
              success = await syncApproval(item);
              break;
            case 'photo':
              success = await syncPhoto(item);
              break;
            case 'signature':
              success = await syncSignature(item);
              break;
            default:
          }

          if (success) {
            const updatedData = offlineData.map(dataItem =>
              dataItem.id === item.id
                ? { ...dataItem, synced: true }
                : dataItem
            );
            saveOfflineData(updatedData);
            syncedCount++;
          } else {
            const updatedData = offlineData.map(dataItem =>
              dataItem.id === item.id
                ? { ...dataItem, retryCount: dataItem.retryCount + 1 }
                : dataItem
            );
            saveOfflineData(updatedData);
          }

          const progress = Math.round(((syncedCount + 1) / pendingItems.length) * 100);
          setSyncStatus(prev => ({ ...prev, syncProgress: progress }));

          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          
          const updatedData = offlineData.map(dataItem =>
            dataItem.id === item.id
              ? { ...dataItem, retryCount: dataItem.retryCount + 1 }
              : dataItem
          );
          saveOfflineData(updatedData);
        }
      }

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date().toISOString(),
        syncProgress: 100
      }));

      if (syncedCount > 0) {
        message.success(`Successfully synced ${syncedCount} items`);
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const cleanedData = offlineData.filter(item => 
        !item.synced || new Date(item.timestamp) > sevenDaysAgo
      );
      
      if (cleanedData.length !== offlineData.length) {
        saveOfflineData(cleanedData);
      }

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false, syncProgress: 0 }));
      message.error('Sync failed - will retry automatically');
    }
  }, [syncStatus.isOnline, syncStatus.isSyncing, offlineData, saveOfflineData]);

  const syncPermit = async (item: OfflineData): Promise<boolean> => {
    try {
      const response = await api.post('/api/permits', {
        ...item.data,
        offline_id: item.id,
        sync_timestamp: new Date().toISOString()
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return false;
    }
  };

  const syncApproval = async (item: OfflineData): Promise<boolean> => {
    try {
      const response = await api.post(`/api/permits/${item.data.permitId}/approve`, {
        ...item.data,
        offline_id: item.id,
        sync_timestamp: new Date().toISOString()
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return false;
    }
  };

  const syncPhoto = async (item: OfflineData): Promise<boolean> => {
    try {
      const formData = new FormData();
      
      if (item.data.photo && item.data.photo.startsWith('data:')) {
        const response = await api.get(item.data.photo, { responseType: 'blob' });
        const blob = response.data;
        formData.append('photo', blob, `photo_${item.id}.jpg`);
      }
      
      formData.append('permitId', item.data.permitId);
      formData.append('offline_id', item.id);
      formData.append('sync_timestamp', new Date().toISOString());

      const response = await api.post('/api/permits/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return false;
    }
  };

  const syncSignature = async (item: OfflineData): Promise<boolean> => {
    try {
      const response = await api.post('/api/permits/signatures', {
        ...item.data,
        offline_id: item.id,
        sync_timestamp: new Date().toISOString()
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return false;
    }
  };

  const forcSync = useCallback(() => {
    if (syncStatus.isOnline) {
      syncOfflineData();
    } else {
      message.warning('Cannot sync while offline');
    }
  }, [syncStatus.isOnline, syncOfflineData]);

  const clearOfflineData = useCallback(() => {
    localStorage.removeItem('ptw_offline_data');
    setOfflineData([]);
    setSyncStatus(prev => ({ ...prev, pendingCount: 0 }));
    message.success('Offline data cleared');
  }, []);

  const getOfflineDataByType = useCallback((type: OfflineData['type']) => {
    return offlineData.filter(item => item.type === type);
  }, [offlineData]);

  useEffect(() => {
    if (!syncStatus.isOnline) return;

    const interval = setInterval(() => {
      if (offlineData.some(item => !item.synced)) {
        syncOfflineData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [syncStatus.isOnline, offlineData, syncOfflineData]);

  return {
    syncStatus,
    offlineData,
    addOfflineData,
    syncOfflineData,
    forcSync,
    clearOfflineData,
    getOfflineDataByType
  };
};