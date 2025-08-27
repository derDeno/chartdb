import React from 'react';
import { IndexedDBStorageProvider } from './indexeddb-storage-provider';
import { VolumeStorageProvider } from './volume-storage-provider';

const useVolume = import.meta.env.VITE_USE_VOLUME_STORAGE === 'true';

export const StorageProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    return useVolume ? (
        <VolumeStorageProvider>{children}</VolumeStorageProvider>
    ) : (
        <IndexedDBStorageProvider>{children}</IndexedDBStorageProvider>
    );
};
