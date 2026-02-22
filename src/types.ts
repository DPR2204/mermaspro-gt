import type { Timestamp } from 'firebase/firestore';

export interface WasteRecord {
    id: string;
    branch: string;
    category: string;
    code: string;
    inventoryNumber: string;
    description: string;
    date: string;
    value: number;
    notes: string;
    createdAt: Timestamp | Date;
}

export interface AppConfig {
    categories: string[];
    branches: string[];
    budgetLimits: Record<string, number>;
}

export interface BudgetStatus {
    branch: string;
    limit: number;
    spent: number;
    percentage: number;
    status: 'safe' | 'warning' | 'danger';
}

export interface MonthlyTrend {
    month: string;
    total: number;
}

export interface BranchSummary {
    branch: string;
    total: number;
    count: number;
}

export interface CategorySummary {
    category: string;
    total: number;
    count: number;
}

export type FilterState = {
    branch: string;
    category: string;
    dateFrom: string;
    dateTo: string;
    search: string;
};
