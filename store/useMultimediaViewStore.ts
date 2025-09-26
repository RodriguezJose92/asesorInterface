import { create } from 'zustand';

type ViewType = "3D" | "IMAGENES" | "VIDEO" | "AR";

interface MultimediaViewState {
  activeView: ViewType | string;
  setActiveView: (view: ViewType | string) => void;
}

export const useMultimediaViewStore = create<MultimediaViewState>((set) => ({
  activeView: "IMAGENES",
  setActiveView: (view) => set({ activeView: view }),
}));