import { create } from 'zustand';
import { CallConectionStoreProps } from './index';

export const CallConectionStore = create<CallConectionStoreProps>(set => ({
    ephemeralKey: '',
    user: null,
    refAudioResponseAI: null,
    refAudioRequestUSer: null,
    micUser: null,
    dataChanel: null,
    statusMic: false,
    profileAsesor: null,
    profileUser: null,
    statusSpeak: 'standBy',
    setEphemeralKey: (ephemeralKey) => set(() => ({ ephemeralKey })),
    setUser: (user) => set(() => ({ user })),
    setRefAudioResponseAI: (refAudioResponseAI) => set(() => ({ refAudioResponseAI })),
    setRefAudioRequestUSer: (refAudioResponseAI) => set(() => ({ refAudioResponseAI })),
    setMicUser: (micUser) => set(() => ({ micUser })),
    setDataChanel: (dataChanel: RTCDataChannel) => set(() => ({ dataChanel })),
    setStatusMic: (statusMic) => set(() => ({ statusMic })),
    setProfileAsesor: (profileAsesor) => set(() => ({ profileAsesor })),
    setProfileUser: (profileUser) => set(() => ({ profileUser })),
    setStatusSpeak: (statusSpeak) => set(() => ({ statusSpeak }))
}));