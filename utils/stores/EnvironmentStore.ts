import { create } from 'zustand';
import { EnvironmentStoreProps } from '@/types/type';

export const EnvironmentStore = create<EnvironmentStoreProps>((set) => ({
    color: "#d52b1e",
    secondColor: "#d52b1e",
    thirdColor: '#f37f00',
    urlSocketConection: "https://mudi.asesoria.mudi.com.co",
    lng: '',
    setLng: (lng) => {
        set(state => ({
            ...state, lng: lng
        })
        )
    },
    audio: null,
    setAudio: (audio) => {
        set(state => ({
            ...state, audio: audio
        }))
    }
}));