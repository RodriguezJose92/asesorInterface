import { ResponseMesssagePeerConect } from "../../../components/utils";

interface BoxChatStoreProps {
    currentModeVoiceAsesor: 'interfaceAI' | 'videoConference'
    iframeRef: null | HTMLIFrameElement,
    containerCheapsRef: null | HTMLDivElement,
    textAreaRef: null | HTMLTextAreaElement,
    historyContainerRef: null | HTMLDivElement,
    listMessage: ResponseMesssagePeerConect[],
    listMultimedia: MultimediaProps[],
    currentStatusListMultimedia: 'img' | 'iframe' | 'null' | 'QR' | 'AR',
    statusMultimedia: '' | 'multimedia',
    setIframeRef: (iframeRef: HTMLIFrameElement) => void
    setContainerCheapsRef: (containerCheapsRef: HTMLDivElement) => void
    setTextAreaRef: (textAreaRef: HTMLTextAreaElement) => void
    setHistoryContainerRef: (historyContainerRef: HTMLDivElement) => void
    setListMessage: (listMessage: any[]) => void,
    setStatusMultimedia: (statusMultimedia: '' | 'multimedia') => void,
    setListMultimedia: (listMultimedia: ListMultimediaProps[]) => void,
    setCurrentStatusListMultimedia: (currentStatusListMultimedia: 'img' | 'iframe' | 'AR' | 'QR') => void,
    setCurrentModeVoiceAsesor: (currentStatusListMultimedia: 'interfaceAI' | 'videoConference') => void,
};

interface CompanyStoreProps {

    idCompany: string,
    primaryColor: string;
    secondaryColor: string;
    thirdColor: string;
    logo: string;
    setIdCompany: (idCompany: string) => void;
    setPrimaryColor: (primaryColor: string) => void;
    setSecondaryColor: (secondaryColor: string) => void;
    setThirdColor: (thirdColor: string) => void;
    setLogo: (logo: string) => void;

};

interface EnvironmentStoreProps {
    lng: string,
    elementMain: null | HTMLElement,
    elementBoxChat: null | HTMLElement,
    elementContentMedia: null | HTMLElement,
    viewInterfaceCall: boolean,
    setLng: (lng: string) => void,
    setElementMain: (elementMain: HTMLElement) => void,
    setElementBoxChat: (elementMain: HTMLElement) => void,
    setViewInterfaceCall: (viewInterfaceCall: boolean) => void,
    setElementContentMedia: (elementMain: HTMLElement) => void,
};

interface CallConectionStoreProps {

    ephemeralKey: string,
    user: RTCPeerConnection | null,
    refAudioResponseAI: null | HTMLAudioElement,
    refAudioRequestUSer: null | HTMLVideoElement,
    micUser: MediaStream | null,
    dataChanel: RTCDataChannel | null,
    statusMic: boolean,
    profileAsesor: null | HTMLDivElement,
    profileUser: null | HTMLDivElement,
    statusSpeak: 'thinking' | 'user' | 'assitent' | 'standBy',
    setUser: (user: RTCPeerConnection | null) => void,
    setEphemeralKey: (ephemeralKey: string) => void,
    setRefAudioResponseAI: (refAudioResponseAI: HTMLAudioElement) => void,
    setRefAudioRequestUSer: (refAudioResponseAI: HTMLVideoElement) => void,
    setMicUser: (micUser: MediaStream) => void,
    setDataChanel: (dataChanel: RTCDataChannel) => void
    setStatusMic: (statusMic: boolean) => void,
    setProfileAsesor: (profileAsesor: HTMLDivElement) => void,
    setProfileUser: (profileUser: HTMLDivElement) => void,
    setStatusSpeak: (statusSpeak: 'thinking' | 'user' | 'assitent' | 'standBy') => void
};

type SocketsStoreProps = {
    mySocket: null | SocketService,
    setMySocket: (mySocket: SocketService) => void
}

type MultimediaProps = {
    type: "image" | "video" | "pdf" | "3D" | "AR" | "QR"
    link: string
}


export {
    BoxChatStoreProps,
    CompanyStoreProps,
    EnvironmentStoreProps,
    CallConectionStoreProps,
    MultimediaProps,
    SocketsStoreProps
}