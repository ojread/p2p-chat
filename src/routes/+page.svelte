<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { connect, selfId } from "$lib/trystero";
  import { messages, peers, myName, roomId, connected } from "$lib/chatStore";

  let input = $state("");
  let nameInput = $state($myName);
  let roomInput = $state(window.location.hash.slice(1) ?? "");
  let messagesEl: HTMLElement;
  let chat: ReturnType<typeof connect> | null = null;

  $effect(() => {
    if ($messages.length) {
      tick().then(() => {
        messagesEl?.scrollTo({
          top: messagesEl.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  });

  async function join() {
    if (!roomInput.trim()) return;
    roomId.set(roomInput.trim());
    window.location.hash = roomInput.trim();
    connected.set(true);
    chat = await connect($roomId);
  }

  function send() {
    if (!input.trim() || !chat) return;
    chat.send(input.trim());
    input = "";
  }

  function updateName() {
    chat?.updateName(nameInput);
    myName.set(nameInput);
  }

  function leave() {
    chat?.leave();
    chat = null;
    connected.set(false);
    messages.clear();
    window.location.hash = "";
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  onDestroy(() => chat?.leave());
</script>

{#if !$connected}
  <!-- JOIN SCREEN -->
  <main class="join">
    <h1>p2p chat</h1>
    <p class="sub">serverless · encrypted · ephemeral</p>

    <div class="card">
      <label for="name">your name</label>
      <input
        id="name"
        type="text"
        bind:value={nameInput}
        placeholder="Anonymous"
        maxlength="32"
      />

      <label for="room">room id</label>
      <input
        id="room"
        type="text"
        bind:value={roomInput}
        placeholder="e.g. my-room-123"
        maxlength="64"
        onkeydown={(e) => e.key === "Enter" && join()}
      />

      <button onclick={join} disabled={!roomInput.trim()}> join room </button>

      <p class="hint">
        Share the room ID with others to connect. No account needed.
      </p>
    </div>
  </main>
{:else}
  <!-- CHAT SCREEN -->
  <div class="layout">
    <header>
      <div class="room-info">
        <span class="room-label">#{$roomId}</span>
        <span class="peer-count">
          {$peers.ids.length} peer{$peers.ids.length === 1 ? "" : "s"}
        </span>
      </div>
      <div class="header-right">
        <input
          class="name-input"
          type="text"
          bind:value={nameInput}
          onblur={updateName}
          onkeydown={(e) => e.key === "Enter" && updateName()}
          title="Your display name"
          maxlength="32"
        />
        <button class="leave" onclick={leave}>leave</button>
      </div>
    </header>

    <ul class="messages" bind:this={messagesEl}>
      {#each $messages as msg (msg.id)}
        {#if msg.system}
          <li class="system">{msg.text}</li>
        {:else}
          <li class="message" class:self={msg.fromSelf}>
            {#if !msg.fromSelf}
              <span class="sender">
                {$peers.names[msg.peerId ?? ""] ?? "Anonymous"}
              </span>
            {/if}
            <span class="bubble">{msg.text}</span>
            <time
              >{new Date(msg.ts).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}</time
            >
          </li>
        {/if}
      {/each}

      {#if $messages.length === 0}
        <li class="empty">
          Waiting for others to join room <strong>#{$roomId}</strong>…
        </li>
      {/if}
    </ul>

    <footer>
      <textarea
        bind:value={input}
        onkeydown={handleKey}
        placeholder="Type a message… (Enter to send)"
        rows="1"
      ></textarea>
      <button onclick={send} disabled={!input.trim()}>send</button>
    </footer>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, sans-serif;
    background: #0f0f0f;
    color: #e8e8e8;
    height: 100dvh;
  }

  /* --- JOIN --- */
  .join {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    padding: 2rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 300;
    letter-spacing: 0.15em;
    margin: 0 0 0.25rem;
  }

  .sub {
    font-size: 0.8rem;
    color: #666;
    letter-spacing: 0.1em;
    margin: 0 0 2rem;
  }

  .card {
    background: #181818;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .card label {
    font-size: 0.75rem;
    color: #666;
    letter-spacing: 0.08em;
    margin-top: 0.5rem;
  }

  .card input {
    background: #0f0f0f;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    padding: 0.6rem 0.75rem;
    color: #e8e8e8;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .card input:focus {
    border-color: #555;
  }

  .card button {
    margin-top: 1rem;
    padding: 0.7rem;
    background: #e8e8e8;
    color: #0f0f0f;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .card button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .hint {
    font-size: 0.75rem;
    color: #555;
    text-align: center;
    margin: 0.5rem 0 0;
  }

  /* --- CHAT LAYOUT --- */
  .layout {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100dvh;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid #1e1e1e;
    background: #141414;
    gap: 1rem;
  }

  .room-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .room-label {
    font-size: 0.95rem;
    font-weight: 500;
  }

  .peer-count {
    font-size: 0.75rem;
    color: #555;
    background: #1e1e1e;
    padding: 0.2rem 0.6rem;
    border-radius: 99px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .name-input {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    color: #aaa;
    font-size: 0.85rem;
    width: 140px;
    outline: none;
    transition:
      border-color 0.15s,
      color 0.15s;
  }

  .name-input:hover,
  .name-input:focus {
    border-color: #2a2a2a;
    color: #e8e8e8;
  }

  .leave {
    background: transparent;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    color: #666;
    font-size: 0.8rem;
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .leave:hover {
    color: #e8e8e8;
    border-color: #555;
  }

  /* --- MESSAGES --- */
  .messages {
    list-style: none;
    margin: 0;
    padding: 1.25rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .system {
    text-align: center;
    font-size: 0.75rem;
    color: #444;
    padding: 0.25rem 0;
  }

  .empty {
    text-align: center;
    font-size: 0.85rem;
    color: #444;
    margin: auto;
  }

  .message {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
    max-width: 70%;
  }

  .message.self {
    align-self: flex-end;
    align-items: flex-end;
  }

  .sender {
    font-size: 0.7rem;
    color: #555;
    padding: 0 0.25rem;
  }

  .bubble {
    background: #1e1e1e;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    padding: 0.5rem 0.85rem;
    font-size: 0.9rem;
    line-height: 1.5;
    word-break: break-word;
  }

  .self .bubble {
    background: #e8e8e8;
    color: #0f0f0f;
    border-color: transparent;
  }

  time {
    font-size: 0.65rem;
    color: #444;
    padding: 0 0.25rem;
  }

  /* --- FOOTER --- */
  footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid #1e1e1e;
    background: #141414;
    align-items: flex-end;
  }

  footer textarea {
    flex: 1;
    background: #1e1e1e;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 0.6rem 0.85rem;
    color: #e8e8e8;
    font-size: 0.9rem;
    font-family: inherit;
    resize: none;
    outline: none;
    line-height: 1.5;
    transition: border-color 0.15s;
    field-sizing: content; /* auto-grows with content in modern browsers */
    max-height: 8rem;
  }

  footer textarea:focus {
    border-color: #444;
  }

  footer button {
    background: #e8e8e8;
    color: #0f0f0f;
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1.1rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: opacity 0.15s;
    white-space: nowrap;
    align-self: flex-end;
  }

  footer button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
