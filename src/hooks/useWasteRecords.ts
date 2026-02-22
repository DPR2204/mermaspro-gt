import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    Timestamp,
} from 'firebase/firestore';
import type { WasteRecord, FilterState } from '../types';

export function useWasteRecords() {
    const [records, setRecords] = useState<WasteRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'waste_records'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => {
                const d = doc.data();
                return {
                    id: doc.id,
                    branch: d.branch || '',
                    category: d.category || '',
                    code: d.code || '',
                    inventoryNumber: d.inventoryNumber || '',
                    description: d.description || '',
                    date: d.date || '',
                    value: d.value || 0,
                    notes: d.notes || '',
                    createdAt: d.createdAt || new Date(),
                } as WasteRecord;
            });
            setRecords(data);
            setLoading(false);
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

    return { records, loading, addRecord, deleteRecord, filterRecords };
}
