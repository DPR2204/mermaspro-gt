import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    setDoc,
    Timestamp,
} from 'firebase/firestore';
import type { WasteRecord, FilterState, AppConfig } from '../types';

const DEFAULT_CONFIG: AppConfig = {
    categories: [
        'Usadas sin control de inventario',
        'Mermas restaurantes',
        'Mermas Bodega',
    ],
    branches: [
        'Atitlán Central',
        'Atitlán Mirador',
        'Atitlán San Juan',
        'Atitlán Santiago',
        'Atitlán Café',
        'Atitlán Café Bar',
        'Bodega Central',
    ],
    monthlySales: {
        'Atitlán Central': 0,
        'Atitlán Mirador': 0,
        'Atitlán San Juan': 0,
        'Atitlán Santiago': 0,
        'Atitlán Café': 0,
        'Atitlán Café Bar': 0,
        'Bodega Central': 0,
    },
    wasteThreshold: 0.03,
};

interface DataContextType {
    records: WasteRecord[];
    recordsLoading: boolean;
    addRecord: (record: Omit<WasteRecord, 'id' | 'createdAt'>) => Promise<void>;
    deleteRecord: (id: string) => Promise<void>;
    filterRecords: (filters: FilterState) => WasteRecord[];
    config: AppConfig;
    configLoading: boolean;
    updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [records, setRecords] = useState<WasteRecord[]>([]);
    const [recordsLoading, setRecordsLoading] = useState(true);
    const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
    const [configLoading, setConfigLoading] = useState(true);

    // Single subscription for waste_records — lives for the entire authenticated session
    useEffect(() => {
        const colRef = collection(db, 'waste_records');
        const unsubscribe = onSnapshot(
            colRef,
            (snapshot) => {
                const data = snapshot.docs.map((d) => {
                    const raw = d.data();
                    return {
                        id: d.id,
                        branch: raw.branch || '',
                        category: raw.category || '',
                        code: raw.code || '',
                        inventoryNumber: raw.inventoryNumber || '',
                        description: raw.description || '',
                        date: raw.date || '',
                        value: raw.value || 0,
                        notes: raw.notes || '',
                        createdAt: raw.createdAt || new Date(),
                    } as WasteRecord;
                });
                data.sort((a, b) => b.date.localeCompare(a.date));
                setRecords(data);
                setRecordsLoading(false);
            },
            (error) => {
                console.error('Firestore waste_records error:', error);
                setRecordsLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    // Single subscription for app_config
    useEffect(() => {
        const docRef = doc(db, 'app_config', 'settings');
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as AppConfig;
                setConfig({
                    categories: data.categories || DEFAULT_CONFIG.categories,
                    branches: data.branches || DEFAULT_CONFIG.branches,
                    monthlySales: data.monthlySales || DEFAULT_CONFIG.monthlySales,
                    wasteThreshold: data.wasteThreshold ?? DEFAULT_CONFIG.wasteThreshold,
                });
            } else {
                setDoc(docRef, DEFAULT_CONFIG);
            }
            setConfigLoading(false);
        });
        return unsubscribe;
    }, []);

    const addRecord = async (record: Omit<WasteRecord, 'id' | 'createdAt'>) => {
        await addDoc(collection(db, 'waste_records'), {
            ...record,
            createdAt: Timestamp.now(),
        });
    };

    const deleteRecord = async (id: string) => {
        await deleteDoc(doc(db, 'waste_records', id));
    };

    const filterRecords = useCallback(
        (filters: FilterState) => {
            return records.filter((r) => {
                if (filters.branch && r.branch !== filters.branch) return false;
                if (filters.category && r.category !== filters.category) return false;
                if (filters.dateFrom && r.date < filters.dateFrom) return false;
                if (filters.dateTo && r.date > filters.dateTo) return false;
                if (filters.search) {
                    const s = filters.search.toLowerCase();
                    const match =
                        r.code.toLowerCase().includes(s) ||
                        r.description.toLowerCase().includes(s) ||
                        r.inventoryNumber.toLowerCase().includes(s) ||
                        r.notes.toLowerCase().includes(s);
                    if (!match) return false;
                }
                return true;
            });
        },
        [records]
    );

    const updateConfig = async (newConfig: Partial<AppConfig>) => {
        const docRef = doc(db, 'app_config', 'settings');
        await setDoc(docRef, { ...config, ...newConfig }, { merge: true });
    };

    return (
        <DataContext.Provider
            value={{
                records,
                recordsLoading,
                addRecord,
                deleteRecord,
                filterRecords,
                config,
                configLoading,
                updateConfig,
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

export function useDataContext() {
    const ctx = useContext(DataContext);
    if (ctx === undefined) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return ctx;
}
