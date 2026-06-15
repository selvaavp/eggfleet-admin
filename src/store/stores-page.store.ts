import { create } from 'zustand';

type StoresPageStore = {
  openAddCustomerHandler: (() => void) | null;
  setOpenAddCustomerHandler: (fn: (() => void) | null) => void;
  openAddCustomer: () => void;
};

export const useStoresPageStore = create<StoresPageStore>((set, get) => ({
  openAddCustomerHandler: null,
  setOpenAddCustomerHandler: (fn) => set({ openAddCustomerHandler: fn }),
  openAddCustomer: () => get().openAddCustomerHandler?.(),
}));
