import { writable, derived } from 'svelte/store';
import type { Message, PeerState } from './types';

// --- My identity ---
export const myName = writable<string>(
    localStorage.getItem('p2p-chat-name') ?? 'Anonymous'
);
myName.subscribe(n => localStorage.setItem('p2p-chat-name', n));

// --- Peers ---
function createPeers() {
    const { subscribe, update, set } = writable<PeerState>({ ids: [], names: {} });
    return {
        subscribe,
        addPeer: (id: string) =>
            update(s => ({ ...s, ids: [...s.ids, id] })),
        removePeer: (id: string) =>
            update(s => ({ ...s, ids: s.ids.filter(p => p !== id) })),
        setName: (id: string, name: string) =>
            update(s => ({ ...s, names: { ...s.names, [id]: name } })),
        reset: () => set({ ids: [], names: {} }),
    };
}
export const peers = createPeers();
export const peerCount = derived(peers, $p => $p.ids.length);

// --- Messages ---
function createMessages() {
    const { subscribe, update, set } = writable<Message[]>([]);
    return {
        subscribe,
        add: (msg: Message) => update(ms => [...ms, msg]),
        addSystem: (text: string) =>
            update(ms => [
                ...ms,
                { id: crypto.randomUUID(), text, ts: Date.now(), system: true }
            ]),
        clear: () => set([]),
    };
}
export const messages = createMessages();

// --- Room ---
export const roomId = writable<string>('');
export const connected = writable<boolean>(false);