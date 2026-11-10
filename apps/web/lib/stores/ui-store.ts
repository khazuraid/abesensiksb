import { create } from "zustand";

interface UiState {
	isSidebarCollapsed: boolean;
	toggleSidebar: () => void;
	setSidebarCollapsed: (collapsed: boolean) => void;
	isMobileNavOpen: boolean;
	setMobileNavOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
	isSidebarCollapsed: false,
	toggleSidebar: () =>
		set((state) => {
			const next = !state.isSidebarCollapsed;
			try {
				localStorage.setItem("adms_sidebar_collapsed", String(next));
			} catch {}
			return { isSidebarCollapsed: next };
		}),
	setSidebarCollapsed: (collapsed: boolean) => {
		try {
			localStorage.setItem("adms_sidebar_collapsed", String(collapsed));
		} catch {}
		set({ isSidebarCollapsed: collapsed });
	},
	isMobileNavOpen: false,
	setMobileNavOpen: (open: boolean) => set({ isMobileNavOpen: open }),
}));
