import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { useWasteRecords } from '../hooks/useWasteRecords';
import { useAppConfig } from '../hooks/useAppConfig';
import type { BudgetStatus, BranchSummary, CategorySummary, MonthlyTrend } from '../types';

const COLORS = ['#00BCB4', '#6C5CE7', '#FF6B6B', '#FFB020', '#0984E3', '#E17055', '#00B894'];

export default function DashboardPage() {
    const { records, loading } = useWasteRecords();
    const { config } = useAppConfig();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthRecords = useMemo(
        () => records.filter((r) => r.date.startsWith(currentMonth)),
        [records, currentMonth]
    );

    const totalThisMonth = useMemo(
        () => currentMonthRecords.reduce((sum, r) => sum + r.value, 0),
        [currentMonthRecords]
    );

    const totalRecords = currentMonthRecords.length;

    const branchSummary: BranchSummary[] = useMemo(() => {
        const map: Record<string, { total: number; count: number }> = {};
        currentMonthRecords.forEach((r) => {
            if (!map[r.branch]) map[r.branch] = { total: 0, count: 0 };
            map[r.branch].total += r.value;
            map[r.branch].count++;
        });
        return Object.entries(map)
            .map(([branch, data]) => ({ branch, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [currentMonthRecords]);

    const categorySummary: CategorySummary[] = useMemo(() => {
        const map: Record<string, { total: number; count: number }> = {};
        currentMonthRecords.forEach((r) => {
            if (!map[r.category]) map[r.category] = { total: 0, count: 0 };
            map[r.category].total += r.value;
            map[r.category].count++;
        });
        return Object.entries(map)
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [currentMonthRecords]);

    const monthlyTrend: MonthlyTrend[] = useMemo(() => {
        const map: Record<string, number> = {};
        records.forEach((r) => {
            const m = r.date.substring(0, 7);
            map[m] = (map[m] || 0) + r.value;
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, total]) => ({
                month: new Date(month + '-01').toLocaleDateString('es-GT', { month: 'short', year: '2-digit' }),
                total: Math.round(total * 100) / 100,
            }));
    }, [records]);

    const thresholdPct = config.wasteThreshold * 100; // e.g. 3

    const budgetStatuses: BudgetStatus[] = useMemo(() => {
        return config.branches.map((branch) => {
            const sales = config.monthlySales[branch] || 0;
            const waste = currentMonthRecords
                .filter((r) => r.branch === branch)
                .reduce((sum, r) => sum + r.value, 0);
            const percentage = sales > 0 ? Math.round((waste / sales) * 10000) / 100 : 0;
            let status: 'safe' | 'warning' | 'danger' = 'safe';
            if (percentage >= thresholdPct) status = 'danger';
            else if (percentage >= thresholdPct * 0.8) status = 'warning';
            return { branch, sales, waste: Math.round(waste * 100) / 100, percentage, threshold: thresholdPct, status };
        });
    }, [config, currentMonthRecords, thresholdPct]);

    // Global stats
    const totalSales = Object.values(config.monthlySales).reduce((sum, v) => sum + v, 0);
    const globalWastePct = totalSales > 0 ? Math.round((totalThisMonth / totalSales) * 10000) / 100 : 0;
    const globalStatus = globalWastePct >= thresholdPct ? 'danger' : globalWastePct >= thresholdPct * 0.8 ? 'warning' : 'safe';

    const avgPerRecord = totalRecords > 0 ? (totalThisMonth / totalRecords).toFixed(2) : '0.00';



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
                        Resumen de mermas — {new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="page-body">
                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-icon teal">📉</div>
                        <div className="stat-card-label">Total mermas del mes</div>
                        <div className="stat-card-value">Q{totalThisMonth.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon purple">📋</div>
                        <div className="stat-card-label">Registros este mes</div>
                        <div className="stat-card-value">{totalRecords}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon orange">📊</div>
                        <div className="stat-card-label">Promedio por registro</div>
                        <div className="stat-card-value">Q{avgPerRecord}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon red">⚠️</div>
                        <div className="stat-card-label">Merma global vs ventas</div>
                        <div className="stat-card-value">{globalWastePct}%</div>
                        {globalWastePct >= thresholdPct && (
                            <span className="stat-card-change up">¡Supera el {thresholdPct}%!</span>
                        )}
                    </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                    <div className="chart-card">
                        <h3 className="chart-title">Mermas por sucursal (mes actual)</h3>
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
                                <div className="empty-state-desc">No hay registros este mes</div>
                            </div>
                        )}
                    </div>

                    <div className="chart-card">
                        <h3 className="chart-title">Tendencia mensual (últimos 6 meses)</h3>
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
                        <h3 className="chart-title">Distribución por categoría (mes actual)</h3>
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
                            Porcentaje de merma sobre ventas por sucursal — {new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>

                    {/* Global summary bar */}
                    <div className="budget-card" style={{ marginBottom: 16, border: '2px solid var(--color-border)' }}>
                        <div className="budget-header">
                            <span className="budget-branch">🌐 Global</span>
                            <span className="budget-values">
                                Merma: Q{totalThisMonth.toLocaleString('es-GT', { minimumFractionDigits: 2 })} · Ventas: Q{totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
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
