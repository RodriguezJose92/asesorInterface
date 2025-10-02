import { create } from 'zustand';

interface RefElementsState {
  hiddenMessagePolitices: HTMLElement | null;
  muted: HTMLElement | null;
  stopCall: HTMLElement | null;
  shop: HTMLElement | null;
  multimedia: HTMLElement | null;
  view3D: HTMLElement | null;
  viewImages: HTMLElement | null;
  viewTechnicalDetails: HTMLElement | null;
  viewAR: HTMLElement | null;
  viewVideo: HTMLElement | null;
  hiddenQuickQuestions: HTMLElement | null;

  setHiddenMessagePolitices: (element: HTMLElement | null) => void;
  setMutedStorage: (element: HTMLElement | null) => void;
  setStopCall: (element: HTMLElement | null) => void;
  setShop: (element: HTMLElement | null) => void;
  setMultimedia: (element: HTMLElement | null) => void;
  setView3D: (element: HTMLElement | null) => void;
  setViewImages: (element: HTMLElement | null) => void;
  setViewTechnicalDetails: (element: HTMLElement | null) => void;
  setViewAR: (element: HTMLElement | null) => void;
  setViewVideo: (element: HTMLElement | null) => void;
  setHiddenQuickQuestions: (element: HTMLElement | null) => void;
}

export const useRefElementsStore = create<RefElementsState>((set) => ({
  hiddenMessagePolitices: null,
  muted: null,
  stopCall: null,
  shop: null,
  multimedia: null,
  view3D: null,
  viewImages: null,
  viewTechnicalDetails: null,
  viewAR: null,
  viewVideo: null,
  hiddenQuickQuestions: null,

  setHiddenMessagePolitices: (element) => set({ hiddenMessagePolitices: element }),
  setMutedStorage: (element) => set({ muted: element }),
  setStopCall: (element) => set({ stopCall: element }),
  setShop: (element) => set({ shop: element }),
  setMultimedia: (element) => set({ multimedia: element }),
  setView3D: (element) => set({ view3D: element }),
  setViewImages: (element) => set({ viewImages: element }),
  setViewTechnicalDetails: (element) => set({ viewTechnicalDetails: element }),
  setViewAR: (element) => set({ viewAR: element }),
  setViewVideo: (element) => set({ viewVideo: element }),
  setHiddenQuickQuestions: (element) => set({ hiddenQuickQuestions: element }),
}));