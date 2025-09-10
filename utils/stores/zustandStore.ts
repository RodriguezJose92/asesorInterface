import { create } from 'zustand';


interface MultimediaStoreProps {
    multimediaStatus: boolean;
    setMultimediaStatus: (multimediaStatus: boolean) => void;
}

export const MultimediaStore = create<MultimediaStoreProps>((set) => ({
    multimediaStatus: false,
    setMultimediaStatus: (value) => set({ multimediaStatus: value }),
}));