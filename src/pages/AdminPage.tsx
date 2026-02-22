import React, { useState } from 'react';
import { useAppConfig } from '../hooks/useAppConfig';

export default function AdminPage() {
    const { config, updateConfig } = useAppConfig();
    const [toast, setToast] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newBranch, setNewBranch] = useState('');
    const [budgetEdits, setBudgetEdits] = useState<Record<string, number>>({});

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    // --- Categories ---
    const addCategory = async () => {
        if (!newCategory.trim()) return;
        if (config.categories.includes(newCategory.trim())) {
            showToast('⚠️ Esta categoría ya existe');
            return;
        }
        await updateConfig({ categories: [...config.categories, newCategory.trim()] });
        setNewCategory('');
        showToast('✅ Categoría agregada');
    };

    const removeCategory = async (cat: string) => {
        if (!confirm(`¿Eliminar la categoría "${cat}"?`)) return;
        await updateConfig({ categories: config.categories.filter((c) => c !== cat) });
        showToast('🗑️ Categoría eliminada');
    };

    // --- Branches ---
    const addBranch = async () => {
        if (!newBranch.trim()) return;
        if (config.branches.includes(newBranch.trim())) {
            showToast('⚠️ Esta sucursal ya existe');
            return;
        }
        const updatedBranches = [...config.branches, newBranch.trim()];
        const updatedLimits = { ...config.budgetLimits, [newBranch.trim()]: 5000 };
        await updateConfig({ branches: updatedBranches, budgetLimits: updatedLimits });
        setNewBranch('');
        showToast('✅ Sucursal agregada');
    };

    const removeBranch = async (branch: string) => {
        if (!confirm(`¿Eliminar la sucursal "${branch}"? Esto no elimina los registros existentes.`)) return;
        const updatedBranches = config.branches.filter((b) => b !== branch);
        const updatedLimits = { ...config.budgetLimits };
        delete updatedLimits[branch];
        await updateConfig({ branches: updatedBranches, budgetLimits: updatedLimits });
        showToast('🗑️ Sucursal eliminada');
    };

    // --- Budget Limits ---
    const handleBudgetChange = (branch: string, value: string) => {
        setBudgetEdits((prev) => ({ ...prev, [branch]: parseFloat(value) || 0 }));
    };

    const saveBudgets = async () => {
        const updatedLimits = { ...config.budgetLimits, ...budgetEdits };
        await updateConfig({ budgetLimits: updatedLimits });
        setBudgetEdits({});
        showToast('✅ Presupuestos actualizados');
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Administración</h1>
                    <p className="page-subtitle">Configura categorías, sucursales y presupuestos</p>
                </div>
            </div>

            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
                    {/* Categories */}
                    <div className="card">
                        <div className="config-section">
                            <h3 className="config-section-title">📁 Categorías de merma</h3>
                            <div className="config-list">
                                {config.categories.map((cat) => (
                                    <div className="config-item" key={cat}>
                                        <span className="config-item-name">{cat}</span>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => removeCategory(cat)}
                                            style={{ color: 'var(--color-danger)', fontSize: '11px' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="config-add-row">
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="Nueva categoría..."
                                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                                />
                                <button className="btn btn-primary btn-sm" onClick={addCategory}>
                                    + Agregar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Branches */}
                    <div className="card">
                        <div className="config-section">
                            <h3 className="config-section-title">🏪 Sucursales</h3>
                            <div className="config-list">
                                {config.branches.map((branch) => (
                                    <div className="config-item" key={branch}>
                                        <span className="config-item-name">{branch}</span>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => removeBranch(branch)}
                                            style={{ color: 'var(--color-danger)', fontSize: '11px' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="config-add-row">
                                <input
                                    type="text"
                                    value={newBranch}
                                    onChange={(e) => setNewBranch(e.target.value)}
                                    placeholder="Nueva sucursal..."
                                    onKeyDown={(e) => e.key === 'Enter' && addBranch()}
                                />
                                <button className="btn btn-primary btn-sm" onClick={addBranch}>
                                    + Agregar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Budget Limits */}
                <div className="card mt-24" style={{ maxWidth: 900 }}>
                    <div className="config-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 className="config-section-title" style={{ marginBottom: 0 }}>💰 Presupuestos mensuales</h3>
                            <button className="btn btn-primary btn-sm" onClick={saveBudgets}>
                                💾 Guardar cambios
                            </button>
                        </div>
                        <div className="budget-config-list">
                            {config.branches.map((branch) => (
                                <div className="budget-config-item" key={branch}>
                                    <span className="budget-config-branch">{branch}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>Q</span>
                                        <input
                                            className="budget-config-input"
                                            type="number"
                                            step="100"
                                            min="0"
                                            value={budgetEdits[branch] ?? config.budgetLimits[branch] ?? 0}
                                            onChange={(e) => handleBudgetChange(branch, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {toast && <div className="toast">{toast}</div>}
            </div>
        </>
    );
}
