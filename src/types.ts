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
    monthlySales: Record<string, number>;
    wasteThreshold: number; // e.g. 0.03 = 3%
}

export interface BudgetStatus {
    branch: string;
    sales: number;
    waste: number;
    percentage: number;
    threshold: number;
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
