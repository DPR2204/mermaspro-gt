import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection,
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
        // Simple collection listener — no orderBy to avoid needing a composite index
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
                // Sort client-side by date desc (most recent first)
                data.sort((a, b) => b.date.localeCompare(a.date));
                setRecords(data);
                setLoading(false);
            },
            (error) => {
                console.error('Firestore error:', error);
                setLoading(false);
            }
        );
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
