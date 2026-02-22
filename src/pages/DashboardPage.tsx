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

    const budgetStatuses: BudgetStatus[] = useMemo(() => {
        return config.branches.map((branch) => {
            const limit = config.budgetLimits[branch] || 0;
            const spent = currentMonthRecords
                .filter((r) => r.branch === branch)
                .reduce((sum, r) => sum + r.value, 0);
            const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            let status: 'safe' | 'warning' | 'danger' = 'safe';
            if (percentage >= 100) status = 'danger';
            else if (percentage >= 80) status = 'warning';
            return { branch, limit, spent: Math.round(spent * 100) / 100, percentage, status };
        });
    }, [config, currentMonthRecords]);

    const avgPerRecord = totalRecords > 0 ? (totalThisMonth / totalRecords).toFixed(2) : '0.00';

    const branchesOverBudget = budgetStatuses.filter((b) => b.status === 'danger').length;

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
                        <div className="stat-card-label">Sucursales sobre presupuesto</div>
                        <div className="stat-card-value">{branchesOverBudget}</div>
                        {branchesOverBudget > 0 && (
                            <span className="stat-card-change up">¡Atención requerida!</span>
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
                                    paddingAngle={3}
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

                {/* Budget Status */}
                <div className="card mb-24">
                    <div className="card-header">
                        <h3 className="card-title">Control de presupuesto</h3>
                        <span className="card-subtitle">
                            Límites mensuales por sucursal — {new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="budget-grid">
                        {budgetStatuses.map((b) => (
                            <div className="budget-card" key={b.branch}>
                                <div className="budget-header">
                                    <span className="budget-branch">{b.branch}</span>
                                    <span className="budget-values">
                                        Q{b.spent.toLocaleString()} / Q{b.limit.toLocaleString()}
                                    </span>
                                </div>
                                <div className="budget-bar-track">
                                    <div
                                        className={`budget-bar-fill ${b.status}`}
                                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                                    />
                                </div>
                                <div className={`budget-percentage ${b.status}`}>{b.percentage}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
