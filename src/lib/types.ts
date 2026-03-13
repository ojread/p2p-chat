export interface Message {
    id: string;
    text: string;
    ts: number;
    fromSelf?: boolean;
    peerId?: string;
    system?: boolean;
}

export interface PeerState {
    ids: string[];
    names: Record<string, string>;
}