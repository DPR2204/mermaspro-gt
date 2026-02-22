import React, { useState } from 'react';
import { useWasteRecords } from '../hooks/useWasteRecords';
import { useAppConfig } from '../hooks/useAppConfig';

export default function RegisterPage() {
    const { addRecord } = useWasteRecords();
    const { config } = useAppConfig();
    const [toast, setToast] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        branch: '',
        category: '',
        code: '',
        inventoryNumber: '',
        description: '',
        date: today,
        value: '',
        notes: '',
    });

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setForm({
            branch: '',
            category: '',
            code: '',
            inventoryNumber: '',
            description: '',
            date: today,
            value: '',
            notes: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.branch || !form.category || !form.value) return;

        setSubmitting(true);
        try {
            await addRecord({
                branch: form.branch,
                category: form.category,
                code: form.code,
                inventoryNumber: form.inventoryNumber,
                description: form.description,
                date: form.date,
                value: parseFloat(form.value),
                notes: form.notes,
            });
            setToast('✅ Merma registrada exitosamente');
            resetForm();
            setTimeout(() => setToast(''), 3000);
        } catch (err) {
            setToast('❌ Error al registrar la merma');
            setTimeout(() => setToast(''), 3000);
        }
        setSubmitting(false);
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Registrar merma</h1>
                    <p className="page-subtitle">Registra una nueva merma de inventario</p>
                </div>
            </div>

            <div className="page-body">
                <div className="card" style={{ maxWidth: 720 }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">
                                    Sucursal <span className="form-required">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={form.branch}
                                    onChange={(e) => updateField('branch', e.target.value)}
                                    required
                                >
                                    <option value="">Seleccionar sucursal...</option>
                                    {config.branches.map((b) => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Categoría <span className="form-required">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={form.category}
                                    onChange={(e) => updateField('category', e.target.value)}
                                    required
                                >
                                    <option value="">Seleccionar categoría...</option>
                                    {config.categories.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Número de inventario</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={form.inventoryNumber}
                                    onChange={(e) => updateField('inventoryNumber', e.target.value)}
                                    placeholder="Ej: INV-001"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Código</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => updateField('code', e.target.value)}
                                    placeholder="Ej: IC-6014"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Descripción</label>
                            <input
                                className="form-input"
                                type="text"
                                value={form.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                placeholder="Descripción del artículo"
                            />
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">
                                    Fecha <span className="form-required">*</span>
                                </label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => updateField('date', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Valor (Q) <span className="form-required">*</span>
                                </label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.value}
                                    onChange={(e) => updateField('value', e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notas</label>
                            <textarea
                                className="form-textarea"
                                value={form.notes}
                                onChange={(e) => updateField('notes', e.target.value)}
                                placeholder="Notas adicionales (opcional)"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
                                {submitting ? 'Registrando...' : '📝 Registrar merma'}
                            </button>
                            <button className="btn btn-secondary btn-lg" type="button" onClick={resetForm}>
                                Limpiar
                            </button>
                        </div>
                    </form>
                </div>

                {toast && <div className="toast">{toast}</div>}
            </div>
        </>
    );
}
