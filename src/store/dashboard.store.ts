import { create } from 'zustand';

interface DashboardState {
  selectedMonth: Date;
  setSelectedMonth: (d: Date) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  selectedMonth: new Date(),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
}));
