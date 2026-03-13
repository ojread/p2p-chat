/*
    Wrap Trystero in a module that exposes reactive Svelte stores rather than 
    leaking raw WebRTC callbacks into components.

    appId is unique to your app — Trystero uses it to namespace peer discovery
    makeAction is generic so TypeScript knows the shape of your data
    You broadcast your name on each peer join, so late-joiners always learn existing names too
    Messages are added to the local store immediately (optimistic UI) before sending
*/

import { joinRoom, selfId } from 'trystero/mqtt';
import { get } from 'svelte/store';
import { peers, messages, myName } from './chatStore';
import type { Message } from './types';

let room: ReturnType<typeof joinRoom> | null = null;

async function getIceServers(): Promise<RTCIceServer[]> {
    try {
        const res = await fetch(
            'https://olliechat.metered.live/api/v1/turn/credentials?apiKey=c596d4ba7d0751365a495965846bc5323f5a'
        );
        return await res.json();
    } catch {
        // Fall back to Google STUN only — better than nothing
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
}

export { selfId };

export async function connect(roomId: string) {
    // Clean up any existing room
    room?.leave();

    const iceServers = await getIceServers();

    const config = {
        appId: 'my-silly-p2p-chat-v1',
        rtcConfig: { iceServers }
    };

    room = joinRoom(config, roomId);

    const [sendMessage, receiveMessage] = room.makeAction<Message>('msg');
    const [sendName, receiveName] = room.makeAction<string>('name');

    // Announce your name when someone joins
    room.onPeerJoin(peerId => {
        peers.addPeer(peerId);
        sendName(get(myName), peerId);
    });

    room.onPeerLeave(peerId => {
        peers.removePeer(peerId);
        messages.addSystem(`${get(peers).names[peerId] ?? 'Someone'} left`);
    });

    // Receive name updates
    receiveName((name, peerId) => {
        peers.setName(peerId, name);
    });

    // Receive chat messages
    receiveMessage((data, peerId) => {
        messages.add({ ...data, fromSelf: false, peerId });
    });

    return {
        send(text: string) {
            const msg: Message = {
                id: crypto.randomUUID(),
                text,
                ts: Date.now(),
                fromSelf: true,
                peerId: selfId,
            };
            messages.add(msg);
            sendMessage(msg); // broadcast to room
        },

        updateName(name: string) {
            myName.set(name);
            sendName(name); // broadcast to all peers
        },

        leave() {
            room?.leave();
            room = null;
            peers.reset();
        }
    };
}