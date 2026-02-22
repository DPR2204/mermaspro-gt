import { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { useWasteRecords } from '../hooks/useWasteRecords';
import { useAppConfig } from '../hooks/useAppConfig';
import type { BudgetStatus, BranchSummary, CategorySummary, MonthlyTrend } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#00BCB4', '#6C5CE7', '#FF6B6B', '#FFB020', '#0984E3', '#E17055', '#00B894'];

export default function DashboardPage() {
    const { records, loading } = useWasteRecords();
    const { config } = useAppConfig();

    // --- Filters ---
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [filterBranch, setFilterBranch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState(`${defaultMonth}-01`);
    const [filterDateTo, setFilterDateTo] = useState('');

    // Filtered records
    const filteredRecords = useMemo(() => {
        return records.filter((r) => {
            if (filterBranch && r.branch !== filterBranch) return false;
            if (filterCategory && r.category !== filterCategory) return false;
            if (filterDateFrom && r.date < filterDateFrom) return false;
            if (filterDateTo && r.date > filterDateTo) return false;
            return true;
        });
    }, [records, filterBranch, filterCategory, filterDateFrom, filterDateTo]);

    const totalFiltered = useMemo(
        () => filteredRecords.reduce((sum, r) => sum + r.value, 0),
        [filteredRecords]
    );
    const totalCount = filteredRecords.length;

    // Branch summary
    const branchSummary: BranchSummary[] = useMemo(() => {
        const map: Record<string, { total: number; count: number }> = {};
        filteredRecords.forEach((r) => {
            if (!map[r.branch]) map[r.branch] = { total: 0, count: 0 };
            map[r.branch].total += r.value;
            map[r.branch].count++;
        });
        return Object.entries(map)
            .map(([branch, data]) => ({ branch, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [filteredRecords]);

    // Category summary
    const categorySummary: CategorySummary[] = useMemo(() => {
        const map: Record<string, { total: number; count: number }> = {};
        filteredRecords.forEach((r) => {
            if (!map[r.category]) map[r.category] = { total: 0, count: 0 };
            map[r.category].total += r.value;
            map[r.category].count++;
        });
        return Object.entries(map)
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [filteredRecords]);

    // Monthly trend (uses ALL records, filtered by branch/category only)
    const monthlyTrend: MonthlyTrend[] = useMemo(() => {
        const trendRecords = records.filter((r) => {
            if (filterBranch && r.branch !== filterBranch) return false;
            if (filterCategory && r.category !== filterCategory) return false;
            return true;
        });
        const map: Record<string, number> = {};
        trendRecords.forEach((r) => {
            const m = r.date.substring(0, 7);
            map[m] = (map[m] || 0) + r.value;
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([month, total]) => ({
                month: new Date(month + '-01').toLocaleDateString('es-GT', { month: 'short', year: '2-digit' }),
                rawMonth: month,
                total: Math.round(total * 100) / 100,
            }));
    }, [records, filterBranch, filterCategory]);

    const thresholdPct = config.wasteThreshold * 100;

    // Budget statuses for current filtered period
    const budgetStatuses: BudgetStatus[] = useMemo(() => {
        return config.branches
            .filter((b) => !filterBranch || b === filterBranch)
            .map((branch) => {
                const sales = config.monthlySales[branch] || 0;
                const waste = filteredRecords
                    .filter((r) => r.branch === branch)
                    .reduce((sum, r) => sum + r.value, 0);
                const percentage = sales > 0 ? Math.round((waste / sales) * 10000) / 100 : 0;
                let status: 'safe' | 'warning' | 'danger' = 'safe';
                if (percentage >= thresholdPct) status = 'danger';
                else if (percentage >= thresholdPct * 0.8) status = 'warning';
                return { branch, sales, waste: Math.round(waste * 100) / 100, percentage, threshold: thresholdPct, status };
            });
    }, [config, filteredRecords, filterBranch, thresholdPct]);

    // Global stats
    const relevantSales = filterBranch
        ? config.monthlySales[filterBranch] || 0
        : Object.values(config.monthlySales).reduce((sum, v) => sum + v, 0);
    const globalWastePct = relevantSales > 0 ? Math.round((totalFiltered / relevantSales) * 10000) / 100 : 0;
    const globalStatus = globalWastePct >= thresholdPct ? 'danger' : globalWastePct >= thresholdPct * 0.8 ? 'warning' : 'safe';

    const avgPerRecord = totalCount > 0 ? (totalFiltered / totalCount).toFixed(2) : '0.00';

    // Filter description for PDF header
    const getFilterDescription = () => {
        const parts: string[] = [];
        if (filterBranch) parts.push(`Sucursal: ${filterBranch}`);
        if (filterCategory) parts.push(`Categoría: ${filterCategory}`);
        if (filterDateFrom) parts.push(`Desde: ${filterDateFrom}`);
        if (filterDateTo) parts.push(`Hasta: ${filterDateTo}`);
        return parts.length > 0 ? parts.join(' · ') : 'Todos los datos del mes actual';
    };

    // --- PDF Generation ---
    const generatePDF = () => {
        const pdf = new jsPDF('p', 'mm', 'letter');
        const pageW = pdf.internal.pageSize.getWidth();
        let y = 15;

        // Header
        pdf.setFillColor(0, 188, 180);
        pdf.rect(0, 0, pageW, 32, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('MermasPro GT', 14, 14);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Informe de Mermas', 14, 21);
        pdf.setFontSize(8);
        pdf.text(`Generado: ${new Date().toLocaleString('es-GT')}`, 14, 27);
        y = 40;

        // Filters applied
        pdf.setTextColor(80, 80, 80);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Filtros aplicados:', 14, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(getFilterDescription(), 50, y);
        y += 8;

        // Summary stats
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(14, y, pageW - 28, 22, 3, 3, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 30, 30);
        const statsY = y + 9;
        const col1 = 20;
        const col2 = 65;
        const col3 = 115;
        const col4 = 165;
        pdf.text('Total mermas:', col1, statsY);
        pdf.text('Registros:', col2, statsY);
        pdf.text('Promedio:', col3, statsY);
        pdf.text('% de ventas:', col4, statsY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Q${totalFiltered.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, col1, statsY + 6);
        pdf.text(`${totalCount}`, col2, statsY + 6);
        pdf.text(`Q${avgPerRecord}`, col3, statsY + 6);
        pdf.text(`${globalWastePct}% (máx. ${thresholdPct}%)`, col4, statsY + 6);
        y += 30;

        // Branch breakdown table
        if (branchSummary.length > 0) {
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 30, 30);
            pdf.text('Mermas por Sucursal', 14, y);
            y += 2;

            autoTable(pdf, {
                startY: y,
                head: [['Sucursal', 'Registros', 'Total (Q)', 'Ventas (Q)', '% Merma', 'Estado']],
                body: branchSummary.map((b) => {
                    const sales = config.monthlySales[b.branch] || 0;
                    const pct = sales > 0 ? ((b.total / sales) * 100).toFixed(2) : '—';
                    const st = sales > 0 ? (parseFloat(pct) >= thresholdPct ? '⚠️ EXCEDE' : '✅ OK') : 'Sin ventas';
                    return [
                        b.branch,
                        b.count.toString(),
                        `Q${b.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
                        sales > 0 ? `Q${sales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : '—',
                        sales > 0 ? `${pct}%` : '—',
                        st,
                    ];
                }),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [0, 188, 180], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { left: 14, right: 14 },
            });
            y = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Category breakdown table
        if (categorySummary.length > 0) {
            if (y > 230) { pdf.addPage(); y = 20; }
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Mermas por Categoría', 14, y);
            y += 2;

            autoTable(pdf, {
                startY: y,
                head: [['Categoría', 'Registros', 'Total (Q)', '% del Total']],
                body: categorySummary.map((c) => [
                    c.category,
                    c.count.toString(),
                    `Q${c.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
                    `${totalFiltered > 0 ? ((c.total / totalFiltered) * 100).toFixed(1) : 0}%`,
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { left: 14, right: 14 },
            });
            y = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Monthly trend table
        if (monthlyTrend.length > 0) {
            if (y > 230) { pdf.addPage(); y = 20; }
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Evolución Mensual', 14, y);
            y += 2;

            autoTable(pdf, {
                startY: y,
                head: [['Mes', 'Total (Q)', 'Variación']],
                body: monthlyTrend.map((m, i) => {
                    const prev = i > 0 ? monthlyTrend[i - 1].total : null;
                    const change = prev !== null ? ((m.total - prev) / prev * 100).toFixed(1) : '—';
                    const changeStr = prev !== null ? `${Number(change) > 0 ? '+' : ''}${change}%` : '—';
                    return [
                        m.month,
                        `Q${m.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
                        changeStr,
                    ];
                }),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [9, 132, 227], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { left: 14, right: 14 },
            });
            y = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Sales vs waste table
        if (budgetStatuses.length > 0) {
            if (y > 210) { pdf.addPage(); y = 20; }
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Control de Mermas vs Ventas (máx. ${thresholdPct}%)`, 14, y);
            y += 2;

            autoTable(pdf, {
                startY: y,
                head: [['Sucursal', 'Ventas (Q)', 'Merma (Q)', '% Merma', `Umbral (${thresholdPct}%)`, 'Estado']],
                body: budgetStatuses.map((b) => [
                    b.branch,
                    b.sales > 0 ? `Q${b.sales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : '—',
                    `Q${b.waste.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
                    `${b.percentage}%`,
                    `${thresholdPct}%`,
                    b.status === 'danger' ? '⚠️ EXCEDE' : b.status === 'warning' ? '⚡ ALERTA' : '✅ OK',
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [0, 188, 180], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { left: 14, right: 14 },
            });
            y = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Footer
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(7);
            pdf.setTextColor(150, 150, 150);
            pdf.text(
                `MermasPro GT — Página ${i} de ${pageCount} — ${new Date().toLocaleDateString('es-GT')}`,
                pageW / 2, pdf.internal.pageSize.getHeight() - 8,
                { align: 'center' }
            );
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const branchStr = filterBranch ? `_${filterBranch.replace(/\s+/g, '_')}` : '';
        pdf.save(`Informe_Mermas${branchStr}_${dateStr}.pdf`);
    };

    // --- Reset filters ---
    const resetFilters = () => {
        setFilterBranch('');
        setFilterCategory('');
        setFilterDateFrom(`${defaultMonth}-01`);
        setFilterDateTo('');
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
                <div className="loading-text">Cargando dashboard...</div>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        Resumen de mermas — {getFilterDescription()}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={generatePDF}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    📄 Descargar informe PDF
                </button>
            </div>

            <div className="page-body">
                {/* Filter Bar */}
                <div className="filter-bar mb-24">
                    <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                        <option value="">Todas las sucursales</option>
                        {config.branches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        <option value="">Todas las categorías</option>
                        {config.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="date" value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)} />
                    <input type="date" value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)} />
                    <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
                        Limpiar filtros
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-icon teal">📉</div>
                        <div className="stat-card-label">Total mermas</div>
                        <div className="stat-card-value">Q{totalFiltered.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon purple">📋</div>
                        <div className="stat-card-label">Registros</div>
                        <div className="stat-card-value">{totalCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon orange">📊</div>
                        <div className="stat-card-label">Promedio por registro</div>
                        <div className="stat-card-value">Q{avgPerRecord}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon red">⚠️</div>
                        <div className="stat-card-label">Merma vs ventas</div>
                        <div className="stat-card-value">{globalWastePct}%</div>
                        {globalWastePct >= thresholdPct && (
                            <span className="stat-card-change up">¡Supera el {thresholdPct}%!</span>
                        )}
                    </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                    <div className="chart-card">
                        <h3 className="chart-title">Mermas por sucursal</h3>
                        {branchSummary.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={branchSummary} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                                    <XAxis
                                        dataKey="branch"
                                        tick={{ fontSize: 10, fill: '#65676B' }}
                                        tickFormatter={(v: string) => v.replace('Atitlán ', '')}
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: '#65676B' }} />
                                    <Tooltip
                                        formatter={(value: any) => [`Q${Number(value).toFixed(2)}`, 'Total']}
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E8E8' }}
                                    />
                                    <Bar dataKey="total" fill="#00BCB4" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state" style={{ padding: '40px 20px' }}>
                                <div className="empty-state-icon">📊</div>
                                <div className="empty-state-desc">No hay registros para estos filtros</div>
                            </div>
                        )}
                    </div>

                    <div className="chart-card">
                        <h3 className="chart-title">Evolución mensual{filterBranch ? ` — ${filterBranch}` : ''}</h3>
                        {monthlyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#65676B' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#65676B' }} />
                                    <Tooltip
                                        formatter={(value: any) => [`Q${Number(value).toFixed(2)}`, 'Total']}
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E8E8' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#6C5CE7"
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: '#6C5CE7' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state" style={{ padding: '40px 20px' }}>
                                <div className="empty-state-icon">📈</div>
                                <div className="empty-state-desc">Datos insuficientes</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Pie Chart */}
                {categorySummary.length > 0 && (
                    <div className="chart-card mb-24">
                        <h3 className="chart-title">Distribución por categoría</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={categorySummary}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={1}
                                    dataKey="total"
                                    nameKey="category"
                                    label={({ category, percent }: any) =>
                                        `${category.length > 20 ? category.substring(0, 20) + '…' : category} (${(percent * 100).toFixed(0)}%)`
                                    }
                                    labelLine={{ stroke: '#9B9DA1' }}
                                >
                                    {categorySummary.map((_, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => [`Q${Number(value).toFixed(2)}`, 'Total']}
                                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E8E8' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Mermas vs Ventas */}
                <div className="card mb-24">
                    <div className="card-header">
                        <h3 className="card-title">Mermas vs Ventas (máx. {thresholdPct}%)</h3>
                        <span className="card-subtitle">
                            Porcentaje de merma sobre ventas por sucursal
                        </span>
                    </div>

                    {/* Global summary bar */}
                    <div className="budget-card" style={{ marginBottom: 16, border: '2px solid var(--color-border)' }}>
                        <div className="budget-header">
                            <span className="budget-branch">🌐 {filterBranch || 'Global'}</span>
                            <span className="budget-values">
                                Merma: Q{totalFiltered.toLocaleString('es-GT', { minimumFractionDigits: 2 })} · Ventas: Q{relevantSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="budget-bar-track">
                            <div
                                className={`budget-bar-fill ${globalStatus}`}
                                style={{ width: `${Math.min((globalWastePct / thresholdPct) * 100, 100)}%` }}
                            />
                        </div>
                        <div className={`budget-percentage ${globalStatus}`}>{globalWastePct}% de {thresholdPct}% permitido</div>
                    </div>

                    <div className="budget-grid">
                        {budgetStatuses.map((b) => (
                            <div className="budget-card" key={b.branch}>
                                <div className="budget-header">
                                    <span className="budget-branch">{b.branch}</span>
                                    <span className="budget-values">
                                        {b.sales > 0 ? `Q${b.waste.toLocaleString()} / Q${b.sales.toLocaleString()}` : 'Sin ventas registradas'}
                                    </span>
                                </div>
                                <div className="budget-bar-track">
                                    <div
                                        className={`budget-bar-fill ${b.status}`}
                                        style={{ width: `${b.sales > 0 ? Math.min((b.percentage / thresholdPct) * 100, 100) : 0}%` }}
                                    />
                                </div>
                                <div className={`budget-percentage ${b.status}`}>
                                    {b.sales > 0 ? `${b.percentage}% de ${thresholdPct}% permitido` : '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
