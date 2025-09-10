export interface ChatUser {
    UserSub: string;
    name: string,
    thumb: string,
    profileImg: string,
    onlineStatus: boolean,
    ChatStatus: "Active" | "Inactive";
}

export interface Chat {
    id: string;
    users: ChatUser[];
    amOwner: boolean;
    aiEnabled: boolean
}

export interface ChatMessage {
    messageId: string;
    userSub: string;
    message: string;
    UpdateTime: Date;
    audio: string | null;
    audioVoiceId: string | null;
}

export interface GetMyChatsResponse {
    data: Chat[];
}

export interface GetChatMessages {
    data: ChatMessage[];
}


export enum ResponseStatus {
    Success = 'success',
    Error = 'error',
}

export interface BackendResponse<T> {
    [x: string]: any;
    statusCode: number;
    status: ResponseStatus;
    message: string;
    data: T;
}

export interface BackendErrorResponse {
    statusCode: number;
    status: ResponseStatus.Error;
    message: string;
    developmentMessage?: string;
    data?: any;
}

export type EnvironmentStoreProps = {
    color: string,
    secondColor: string,
    thirdColor: string
    urlSocketConection: string,
    lng: string,
    setLng: (lng: string) => void,
    audio: HTMLAudioElement | null,
    setAudio: (audio: HTMLAudioElement) => void
}

export type ControllerMultimediaMinProps = {
    id: string,
    doc: string, // debería ser un HTMLDIC IFRAME ETC pero fue .. así es más rápido
    thumb: string,
    name: string
};