import { useState, useMemo } from 'react';
import { useWasteRecords } from '../hooks/useWasteRecords';
import { useAppConfig } from '../hooks/useAppConfig';
import type { FilterState, WasteRecord } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RecordsPage() {
    const { records, loading, filterRecords, deleteRecord } = useWasteRecords();
    const { config } = useAppConfig();
    const [toast, setToast] = useState('');
    const [sortField, setSortField] = useState<string>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [appliedFilters, setAppliedFilters] = useState<FilterState>({
        branch: '',
        category: '',
        dateFrom: '',
        dateTo: '',
        search: '',
    });
    const [filters, setFilters] = useState<FilterState>({
        branch: '',
        category: '',
        dateFrom: '',
        dateTo: '',
        search: '',
    });

    const updateFilter = (field: keyof FilterState, value: string) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const applyFilters = () => {
        setAppliedFilters({ ...filters });
    };

    const filteredRecords = useMemo(() => {
        const filtered = filterRecords(appliedFilters);
        return filtered.sort((a: WasteRecord, b: WasteRecord) => {
            let cmp = 0;
            if (sortField === 'date') cmp = a.date.localeCompare(b.date);
            else if (sortField === 'value') cmp = a.value - b.value;
            else if (sortField === 'branch') cmp = a.branch.localeCompare(b.branch);
            else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
            return sortDir === 'desc' ? -cmp : cmp;
        });
    }, [filterRecords, appliedFilters, sortField, sortDir]);

    const totalValue = useMemo(
        () => filteredRecords.reduce((sum, r) => sum + r.value, 0),
        [filteredRecords]
    );

    const toggleSort = (field: string) => {
        if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const sortIndicator = (field: string) => {
        if (sortField !== field) return '';
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;
        try {
            await deleteRecord(id);
            setToast('🗑️ Registro eliminado');
            setTimeout(() => setToast(''), 3000);
        } catch {
            setToast('❌ Error al eliminar');
            setTimeout(() => setToast(''), 3000);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF('landscape');

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('MermasPro GT', 14, 20);

        doc.setFontSize(14);
        doc.text('Reporte de Mermas', 14, 30);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);

        const filterParts: string[] = [];
        if (appliedFilters.branch) filterParts.push(`Sucursal: ${appliedFilters.branch}`);
        if (appliedFilters.category) filterParts.push(`Categoría: ${appliedFilters.category}`);
        if (appliedFilters.dateFrom) filterParts.push(`Desde: ${appliedFilters.dateFrom}`);
        if (appliedFilters.dateTo) filterParts.push(`Hasta: ${appliedFilters.dateTo}`);
        if (appliedFilters.search) filterParts.push(`Búsqueda: ${appliedFilters.search}`);

        const filterText = filterParts.length > 0 ? filterParts.join(' | ') : 'Sin filtros aplicados';
        doc.text(filterText, 14, 37);
        doc.text(`Generado: ${new Date().toLocaleString('es-GT')}`, 14, 43);

        doc.setDrawColor(200);
        doc.line(14, 46, 283, 46);

        // Table
        const tableData = filteredRecords.map((r) => [
            r.date,
            r.branch,
            r.category,
            r.code || '—',
            r.inventoryNumber || '—',
            r.description || '—',
            `Q${r.value.toFixed(2)}`,
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['Fecha', 'Sucursal', 'Categoría', 'Código', 'No. Inventario', 'Descripción', 'Valor']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [0, 188, 180],
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
            },
            bodyStyles: { fontSize: 7.5 },
            alternateRowStyles: { fillColor: [247, 248, 252] },
            columnStyles: {
                6: { halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 14, right: 14 },
        });

        // Total row
        const finalY = (doc as any).lastAutoTable?.finalY || 200;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 35, 41);
        doc.text(`Total: Q${totalValue.toFixed(2)}`, 14, finalY + 10);
        doc.text(`${filteredRecords.length} registros`, 14, finalY + 16);

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150);
            doc.text(
                `MermasPro GT — Reporte generado el ${new Date().toLocaleString('es-GT')} — Página ${i} de ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        doc.save(`mermas_reporte_${new Date().toISOString().split('T')[0]}.pdf`);
        setToast('📄 Reporte PDF descargado');
        setTimeout(() => setToast(''), 3000);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
                <div className="loading-text">Cargando registros...</div>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Registros</h1>
                    <p className="page-subtitle">
                        {filteredRecords.length} de {records.length} registros
                    </p>
                </div>
                <button className="btn btn-primary" onClick={exportPDF}>
                    📄 Exportar PDF
                </button>
            </div>

            <div className="page-body">
                {/* Filters */}
                <div className="filter-bar">
                    <select
                        value={filters.branch}
                        onChange={(e) => updateFilter('branch', e.target.value)}
                    >
                        <option value="">Todas las sucursales</option>
                        {config.branches.map((b) => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>

                    <select
                        value={filters.category}
                        onChange={(e) => updateFilter('category', e.target.value)}
                    >
                        <option value="">Todas las categorías</option>
                        {config.categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    />
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => updateFilter('dateTo', e.target.value)}
                    />

                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            type="text"
                            value={filters.search}
                            onChange={(e) => updateFilter('search', e.target.value)}
                            placeholder="Buscar por código, descripción..."
                        />
                    </div>

                    <button className="btn btn-primary btn-sm" onClick={applyFilters}>
                        🔍 Buscar
                    </button>

                    {(appliedFilters.branch || appliedFilters.category || appliedFilters.dateFrom || appliedFilters.dateTo || appliedFilters.search) && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                const empty = { branch: '', category: '', dateFrom: '', dateTo: '', search: '' };
                                setFilters(empty);
                                setAppliedFilters(empty);
                            }}
                        >
                            ✕ Limpiar filtros
                        </button>
                    )}
                </div>

                {/* Summary bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                        {filteredRecords.length} registros
                    </span>
                    <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>
                        Total: Q{totalValue.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Table */}
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => toggleSort('date')}>Fecha{sortIndicator('date')}</th>
                                <th onClick={() => toggleSort('branch')}>Sucursal{sortIndicator('branch')}</th>
                                <th onClick={() => toggleSort('category')}>Categoría{sortIndicator('category')}</th>
                                <th>Código</th>
                                <th>No. Inv.</th>
                                <th>Descripción</th>
                                <th onClick={() => toggleSort('value')} className="text-right">Valor{sortIndicator('value')}</th>
                                <th>Notas</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className="table-empty">
                                            <div className="table-empty-icon">📋</div>
                                            <div>No se encontraron registros con los filtros seleccionados</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => (
                                    <tr key={r.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                                        <td>
                                            <span className="badge badge-teal">{r.branch.replace('Atitlán ', '')}</span>
                                        </td>
                                        <td style={{ fontSize: 'var(--font-size-xs)' }}>{r.category}</td>
                                        <td className="font-mono">{r.code || '—'}</td>
                                        <td className="font-mono">{r.inventoryNumber || '—'}</td>
                                        <td>{r.description || '—'}</td>
                                        <td className="text-right fw-600">Q{r.value.toFixed(2)}</td>
                                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {r.notes || '—'}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => handleDelete(r.id)}
                                                title="Eliminar"
                                                style={{ color: 'var(--color-danger)', fontSize: '12px' }}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {toast && <div className="toast">{toast}</div>}
            </div>
        </>
    );
}
