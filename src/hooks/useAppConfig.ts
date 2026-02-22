import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { AppConfig } from '../types';

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
    budgetLimits: {
        'Atitlán Central': 5000,
        'Atitlán Mirador': 5000,
        'Atitlán San Juan': 5000,
        'Atitlán Santiago': 5000,
        'Atitlán Café': 3000,
        'Atitlán Café Bar': 3000,
        'Bodega Central': 8000,
    },
};

export function useAppConfig() {
    const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, 'app_config', 'settings');
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as AppConfig;
                setConfig({
                    categories: data.categories || DEFAULT_CONFIG.categories,
                    branches: data.branches || DEFAULT_CONFIG.branches,
                    budgetLimits: data.budgetLimits || DEFAULT_CONFIG.budgetLimits,
                });
            } else {
                // Initialize with defaults if doc doesn't exist
                setDoc(docRef, DEFAULT_CONFIG);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const updateConfig = async (newConfig: Partial<AppConfig>) => {
        const docRef = doc(db, 'app_config', 'settings');
        await setDoc(docRef, { ...config, ...newConfig }, { merge: true });
    };

    return { config, loading, updateConfig };
}
