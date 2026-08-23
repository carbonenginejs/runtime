import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsRealtimeClient,
    CjsRealtimeError,
    CjsRealtimeProtocol,
    CjsRealtimeSubscription,
    REALTIME_SUBPROTOCOL
} from "@carbonenginejs/tools-browser/realtime";
import {
    CjsRealtimeError as CjsRealtimeWireError,
    CjsRealtimeProtocol as CjsRealtimeWireProtocol,
    REALTIME_SUBPROTOCOL as WIRE_SUBPROTOCOL
} from "@carbonenginejs/tools-browser/realtime/wire";
import {
    CjsChatBlockList,
    CjsChatClient
} from "@carbonenginejs/tools-browser/chat";

const SERVICE = Object.freeze({
    family: "synthetic.state",
    familyVersion: 1,
    kind: "synthetic.memory",
    id: "synthetic-main"
});

class CjsRealtimeTestSocket
{

    static initialBufferedAmount = 0;
    static responder = null;
    static selectedProtocol = null;
    static sockets = [];

    #listeners;

    constructor(url, protocol)
    {
        this.url = url;
        this.protocol = CjsRealtimeTestSocket.selectedProtocol ?? protocol;
        this.readyState = 0;
        this.bufferedAmount = CjsRealtimeTestSocket.initialBufferedAmount;
        this.sent = [];
        this.#listeners = new Map();
        CjsRealtimeTestSocket.sockets.push(this);
        queueMicrotask(() => this.ServerOpen());
    }

    addEventListener(type, listener)
    {
        const listeners = this.#listeners.get(type) ?? [];

        listeners.push(listener);
        this.#listeners.set(type, listeners);
    }

    send(text)
    {
        if (this.readyState !== 1)
        {
            throw new Error("Test socket is not open");
        }

        const message = JSON.parse(text);

        this.sent.push(message);
        CjsRealtimeTestSocket.responder?.(this, message);
    }

    close(code = 1000, reason = "")
    {
        if (this.readyState === 3)
        {
            return;
        }

        this.readyState = 3;
        this.#Dispatch("close", { code, reason });
    }

    ServerOpen()
    {
        if (this.readyState !== 0)
        {
            return;
        }

        this.readyState = 1;
        this.#Dispatch("open", {});
    }

    ServerMessage(message)
    {
        if (this.readyState === 1)
        {
            this.#Dispatch("message", { data: JSON.stringify(message) });
        }
    }

    #Dispatch(type, event)
    {
        for (const listener of this.#listeners.get(type) ?? [])
        {
            listener(event);
        }
    }

    static Reset(responder, {
        bufferedAmount = 0,
        protocol = null
    } = {})
    {
        CjsRealtimeTestSocket.sockets = [];
        CjsRealtimeTestSocket.responder = responder;
        CjsRealtimeTestSocket.initialBufferedAmount = bufferedAmount;
        CjsRealtimeTestSocket.selectedProtocol = protocol;
    }

}

test("constructs and validates the shared v1 client wire messages", () =>
{
    const hello = CjsRealtimeProtocol.createHello("secret-capability", {
        id: "facade-one",
        kind: "facade"
    });

    assert.equal(hello.type, "hello");
    assert.equal(hello.protocolVersion, 1);
    assert.equal(hello.capability, "secret-capability");
    assert.throws(() => CjsRealtimeProtocol.normalizeServerMessage({
        type: "hello",
        protocol: "carbon.tools.realtime",
        protocolVersion: 2
    }), error => error.code === "unsupported_version");
    assert.equal(
        CjsRealtimeProtocol.normalizeCursor(Cursor("stream-one", 4, 2)).sequence,
        4
    );
});

test("exports one narrow browser-safe v1 wire authority", () =>
{
    assert.equal(CjsRealtimeWireProtocol, CjsRealtimeProtocol);
    assert.equal(CjsRealtimeWireError, CjsRealtimeError);
    assert.equal(WIRE_SUBPROTOCOL, REALTIME_SUBPROTOCOL);
    assert.deepEqual(CjsRealtimeWireProtocol.normalizeClientMessage({
        type: "hello",
        protocolVersion: 1,
        capability: "secret-capability",
        client: { id: "facade-one", kind: "facade" }
    }), {
        type: "hello",
        protocolVersion: 1,
        capability: "secret-capability",
        client: { id: "facade-one", kind: "facade" }
    });

    const targeted = CjsRealtimeWireProtocol.normalizeClientMessage({
        type: "subscribe-targeted",
        requestId: "target-one",
        serviceId: "primary-chat",
        topics: [ "chat.message.received" ],
        target: {
            room: {
                provider: "twitch",
                login: "fenriscreations"
            }
        }
    }, { authenticated: true });

    assert.equal(targeted.type, "subscribe");
    assert.deepEqual(targeted.target, {
        room: {
            provider: "twitch",
            login: "fenriscreations"
        }
    });
    assert.notEqual(targeted.target, null);
    assert.throws(() => CjsRealtimeWireProtocol.normalizeClientMessage({
        type: "subscribe",
        requestId: "target-two",
        serviceId: "primary-chat",
        topics: [ "chat.message.received" ]
    }), error => error instanceof CjsRealtimeWireError
        && error.code === "hello_required"
        && error.closeCode === 1002);
});

test("bounds malformed, oversized, deep, dense, and cyclic wire JSON", () =>
{
    assert.throws(
        () => CjsRealtimeWireProtocol.parseText("{"),
        error => error.code === "invalid_json" && error.closeCode === 1002
    );
    assert.throws(
        () => CjsRealtimeWireProtocol.parseText(JSON.stringify({ value: "12345" }), {
            maxBytes: 5
        }),
        error => error.code === "message_too_large" && error.closeCode === 1009
    );

    const cyclic = {};

    cyclic.self = cyclic;
    assert.throws(
        () => CjsRealtimeWireProtocol.validateJson(cyclic),
        error => error.code === "invalid_request"
    );
    assert.throws(
        () => CjsRealtimeWireProtocol.validateJson({ one: { two: true } }, {
            maxDepth: 1
        }),
        error => error.code === "invalid_request"
    );
    assert.throws(
        () => CjsRealtimeWireProtocol.validateJson([ true, false ], {
            maxNodes: 2
        }),
        error => error.code === "invalid_request"
    );
});

test("reconciles a snapshot before applying only newer buffered events", async () =>
{
    const applied = [];
    const subscription = new CjsRealtimeSubscription({
        serviceId: SERVICE.id,
        topics: [ "synthetic.state.changed" ],
        recovery: "snapshot",
        onSnapshot: snapshot => applied.push([ "snapshot", snapshot.payload.data.value ]),
        onEvent: event => applied.push([ "event", event.payload.data.value ])
    });

    subscription.Begin("subscription-one", Cursor("stream-one", 2, 1));
    await subscription.Receive(Event({ sequence: 3, topicSequence: 2, value: "covered" }));
    await subscription.Receive(Event({ sequence: 4, topicSequence: 3, value: "future" }));
    await subscription.InstallSnapshot(Snapshot({ sequence: 3, topicSequence: 2 }));
    await subscription.WhenActive();

    assert.deepEqual(applied, [ [ "snapshot", "current" ], [ "event", "future" ] ]);
    assert.deepEqual(subscription.GetCursor(), Cursor("stream-one", 4, 3));
    await assert.rejects(
        subscription.Receive(Event({ sequence: 6, topicSequence: 5, value: "gap" })),
        error => error.code === "resync_required" && error.closeCode === 4409
    );
});

test("connects, subscribes future-only, and replaces capabilities by reconnecting", async () =>
{
    const capabilities = [];

    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            capabilities.push(message.capability);
            queueMicrotask(() => socket.ServerMessage(Hello(`connection-${capabilities.length}`)));
        }

        if (message.type === "subscribe")
        {
            queueMicrotask(() => socket.ServerMessage(SubscribeResult(message.requestId, {
                subscriptionId: `subscription-${capabilities.length}`,
                cursor: Cursor(`stream-${capabilities.length}`, 0, 0)
            })));
        }
    });

    const delivered = [];
    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "capability-one",
        webSocketClass: CjsRealtimeTestSocket,
        reconnect: { minimumDelayMs: 0, maximumDelayMs: 0 },
        onError: error => assert.notEqual(error.code, "internal_error")
    });
    const subscription = client.Subscribe({
        serviceId: SERVICE.id,
        topics: [ "synthetic.state.changed" ],
        onEvent: event => delivered.push(event.payload.data.value)
    });

    await client.Connect();
    assert.equal(client.IsConnected(), true);
    assert.equal(CjsRealtimeTestSocket.sockets[0].protocol, REALTIME_SUBPROTOCOL);
    assert.equal(CjsRealtimeTestSocket.sockets[0].url, "ws://127.0.0.1:3000/v1/realtime");
    CjsRealtimeTestSocket.sockets[0].ServerMessage(Event({
        subscriptionId: "subscription-1",
        streamId: "stream-1",
        sequence: 1,
        topicSequence: 1,
        value: "first"
    }));
    await WaitFor(() => delivered.length === 1);

    await client.ReplaceCapability("capability-two");
    assert.deepEqual(capabilities, [ "capability-one", "capability-two" ]);
    assert.equal(CjsRealtimeTestSocket.sockets.length, 2);
    assert.equal(subscription.GetCursor().streamId, "stream-2");
    client.Close();
});

test("requires the negotiated subprotocol before hello and resumes only when asked", async () =>
{
    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            queueMicrotask(() => socket.ServerMessage(Hello("connection-resumed")));
        }
    }, { protocol: "" });

    const errors = [];
    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "must-not-be-sent",
        webSocketClass: CjsRealtimeTestSocket,
        onError: error => errors.push(error)
    });

    await assert.rejects(
        client.Connect(),
        error => error.code === "subprotocol_mismatch" && error.closeCode === 1002
    );
    assert.equal(client.state, "stopped");
    assert.deepEqual(CjsRealtimeTestSocket.sockets[0].sent, []);
    assert.equal(errors.at(-1).code, "subprotocol_mismatch");

    CjsRealtimeTestSocket.selectedProtocol = REALTIME_SUBPROTOCOL;
    await client.Connect();

    assert.equal(client.IsConnected(), true);
    assert.equal(CjsRealtimeTestSocket.sockets.length, 2);
    assert.equal(client.GetMetrics().connectionGenerations, 2);
    client.Close();
});

test("bounds server hello and exposes secret-free timeout metrics", async () =>
{
    CjsRealtimeTestSocket.Reset(() => {});
    const errors = [];
    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "hello-timeout-capability",
        webSocketClass: CjsRealtimeTestSocket,
        helloTimeoutMs: 5,
        reconnect: { minimumDelayMs: 1000, maximumDelayMs: 1000 },
        onError: error => errors.push(error)
    });
    const ready = client.Connect();

    await WaitFor(() => errors.some(error => error.code === "hello_timeout"));

    const metrics = client.GetMetrics();

    assert.equal(metrics.helloTimeouts, 1);
    assert.equal(metrics.reconnectAttempts, 1);
    assert.doesNotMatch(JSON.stringify(metrics), /capability|hello-timeout/u);
    client.Close();
    await assert.rejects(ready, error => error.code === "client_closed");
});

test("stops automatic retry when the server rejects authentication", async () =>
{
    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            queueMicrotask(() => socket.ServerMessage({
                type: "error",
                code: "unauthorized",
                message: "Realtime capability was rejected",
                retryable: false,
                connectionUsable: false
            }));
        }
    });

    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "rejected-capability",
        webSocketClass: CjsRealtimeTestSocket,
        reconnect: { minimumDelayMs: 0, maximumDelayMs: 0 }
    });

    await assert.rejects(
        client.Connect(),
        error => error.code === "unauthorized" && error.retryable === false
    );
    assert.equal(client.state, "stopped");
    assert.equal(client.GetMetrics().connectionGenerations, 1);
    assert.equal(client.GetMetrics().reconnectAttempts, 0);
    client.Close();
});

test("times out one request, closes its generation, and never records its body", async () =>
{
    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            queueMicrotask(() => socket.ServerMessage(Hello("connection-request-timeout")));
        }
    });

    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "request-timeout-capability",
        webSocketClass: CjsRealtimeTestSocket,
        requestTimeoutMs: 5,
        reconnect: { minimumDelayMs: 1000, maximumDelayMs: 1000 }
    });

    await client.Connect();
    let errorRecord = null;

    await assert.rejects(
        client.Command("synthetic-main", "state.change", {
            secretPayload: "must-not-be-recorded"
        }),
        error =>
        {
            errorRecord = error.ToRecord();
            return error.code === "request_timeout"
                && error.retryable === true
                && error.connectionUsable === false;
        }
    );

    const metrics = client.GetMetrics();

    assert.equal(metrics.requestTimeouts, 1);
    assert.doesNotMatch(
        JSON.stringify({ metrics, errorRecord }),
        /request-timeout-capability|must-not-be-recorded/u
    );
    client.Close();
});

test("bounds browser buffered bytes and the caller operation queue", async () =>
{
    let pendingCommand = null;

    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            queueMicrotask(() => socket.ServerMessage(Hello("connection-pressure")));
        }

        if (message.type === "command")
        {
            pendingCommand = { socket, message };
        }
    });

    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "pressure-capability",
        webSocketClass: CjsRealtimeTestSocket,
        requestTimeoutMs: 1000,
        outbound: {
            maximumBufferedBytes: 512,
            maximumQueuedOperations: 1
        }
    });

    await client.Connect();
    const first = client.Command("synthetic-main", "state.change", { value: "first" });

    await WaitFor(() => pendingCommand !== null);
    await assert.rejects(
        client.Command("synthetic-main", "state.change", { value: "queued" }),
        error => error.code === "outbound_pressure" && error.retryable === true
    );
    pendingCommand.socket.ServerMessage({
        type: "result",
        requestId: pendingCommand.message.requestId,
        status: "completed",
        data: { accepted: true }
    });
    assert.deepEqual(await first, { accepted: true });

    CjsRealtimeTestSocket.sockets[0].bufferedAmount = 512;
    await assert.rejects(
        client.Command("synthetic-main", "state.change", { value: "buffered" }),
        error => error.code === "outbound_pressure"
            && error.connectionUsable === false
            && error.closeCode === 1013
    );
    assert.equal(client.GetMetrics().outboundPressure, 2);
    client.Close();
});

test("buffers socket events while the authenticated snapshot request is pending", async () =>
{
    const snapshotResponse = Deferred();
    const fetches = [];
    const applied = [];

    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            queueMicrotask(() => socket.ServerMessage(Hello("connection-snapshot")));
        }

        if (message.type === "subscribe")
        {
            queueMicrotask(() => socket.ServerMessage(SubscribeResult(message.requestId, {
                subscriptionId: "subscription-snapshot",
                cursor: Cursor("stream-snapshot", 0, 0)
            })));
            queueMicrotask(() => socket.ServerMessage(Event({
                subscriptionId: "subscription-snapshot",
                streamId: "stream-snapshot",
                sequence: 1,
                topicSequence: 1,
                value: "after-snapshot"
            })));
        }
    });

    const client = new CjsRealtimeClient({
        url: "ws://127.0.0.1:3000/v1/realtime",
        capability: "snapshot-capability",
        webSocketClass: CjsRealtimeTestSocket,
        fetch: (url, options) =>
        {
            fetches.push({ url, options });
            return snapshotResponse.promise;
        },
        reconnect: { minimumDelayMs: 0, maximumDelayMs: 0 }
    });
    client.Subscribe({
        serviceId: SERVICE.id,
        topics: [ "synthetic.state.changed" ],
        recovery: "snapshot",
        onSnapshot: () => applied.push("snapshot"),
        onEvent: event => applied.push(event.payload.data.value)
    });
    const connected = client.Connect();

    await WaitFor(() => fetches.length === 1);
    assert.equal(fetches[0].url,
        "http://127.0.0.1:3000/v1/realtime/services/synthetic-main/snapshot");
    assert.equal(fetches[0].options.headers.authorization, "Bearer snapshot-capability");
    assert.deepEqual(applied, []);
    snapshotResponse.resolve({
        ok: true,
        json: async () => Snapshot({ streamId: "stream-snapshot", sequence: 0, topicSequence: 0 })
    });
    await connected;

    assert.deepEqual(applied, [ "snapshot", "after-snapshot" ]);
    assert.equal(client.GetMetrics().snapshotRecoveries, 1);
    client.Close();
});

test("counts sequence-gap resynchronization before reconnecting", async () =>
{
    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            queueMicrotask(() => socket.ServerMessage(Hello("connection-gap")));
        }

        if (message.type === "subscribe")
        {
            queueMicrotask(() => socket.ServerMessage(SubscribeResult(message.requestId, {
                subscriptionId: "subscription-gap",
                cursor: Cursor("stream-gap", 0, 0)
            })));
        }
    });

    const errors = [];
    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "gap-capability",
        webSocketClass: CjsRealtimeTestSocket,
        reconnect: { minimumDelayMs: 1000, maximumDelayMs: 1000 },
        onError: error => errors.push(error)
    });

    client.Subscribe({
        serviceId: SERVICE.id,
        topics: [ "synthetic.state.changed" ]
    });
    await client.Connect();
    CjsRealtimeTestSocket.sockets[0].ServerMessage(Event({
        subscriptionId: "subscription-gap",
        streamId: "stream-gap",
        sequence: 2,
        topicSequence: 2,
        value: "gap"
    }));
    await WaitFor(() => errors.some(error => error.code === "resync_required"));

    assert.equal(client.GetMetrics().sequenceGapResyncs, 1);
    client.Close();
});

test("keeps multiple targeted chat rooms independent on one realtime service", async () =>
{
    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            queueMicrotask(() => socket.ServerMessage(Hello("connection-chat")));
        }

        if (message.type === "subscribe-targeted")
        {
            const login = message.target.room.login;

            queueMicrotask(() => socket.ServerMessage(SubscribeResult(message.requestId, {
                subscriptionId: `subscription-${login}`,
                cursor: ChatCursor("stream-chat", 0, 0),
                target: {
                    room: {
                        ...message.target.room,
                        id: login === "fenriscreations" ? "200" : "201",
                        kind: "channel",
                        displayName: login,
                        assets: {
                            icon: {
                                id: `twitch-channel-${login}`,
                                url: `https://example.test/${login}.png`,
                                contentType: "image/png",
                                animated: false
                            }
                        }
                    }
                }
            })));
        }

        if (message.type === "unsubscribe")
        {
            queueMicrotask(() => socket.ServerMessage({
                type: "result",
                requestId: message.requestId,
                status: "completed",
                data: { subscriptionId: message.subscriptionId }
            }));
        }
    });

    const delivered = [];
    const realtime = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "chat-capability",
        webSocketClass: CjsRealtimeTestSocket,
        reconnect: { minimumDelayMs: 0, maximumDelayMs: 0 }
    });
    const chat = new CjsChatClient({
        realtimeClient: realtime,
        serviceId: SERVICE.id,
        blockList: {
            terms: [ "blocked phrase" ],
            users: [ {
                provider: "twitch",
                id: "ignored-user"
            } ]
        }
    });

    assert.equal(new CjsChatBlockList().IsEmpty(), true);
    const fenris = chat.ListenRoom({
        provider: "twitch",
        login: "fenriscreations"
    }, {
        onMessage: message => delivered.push(message)
    });
    const caldari = chat.ListenRoom({
        provider: "twitch",
        kind: "channel",
        login: "caldariprimeponyclub"
    }, {
        onMessage: message => delivered.push(message)
    });

    await realtime.Connect();
    assert.equal(realtime.GetSubscriptions(SERVICE.id).length, 2);
    assert.deepEqual(
        CjsRealtimeTestSocket.sockets[0].sent
            .filter(message => message.type === "subscribe-targeted")
            .map(message => message.target.room.login),
        [ "fenriscreations", "caldariprimeponyclub" ]
    );
    assert.equal(
        fenris.GetRoom().assets.icon.url,
        "https://example.test/fenriscreations.png"
    );
    CjsRealtimeTestSocket.sockets[0].ServerMessage(ChatEvent({
        subscriptionId: "subscription-fenriscreations",
        login: "fenriscreations",
        messageId: "fenris-message"
    }));
    CjsRealtimeTestSocket.sockets[0].ServerMessage(ChatEvent({
        subscriptionId: "subscription-caldariprimeponyclub",
        login: "caldariprimeponyclub",
        messageId: "caldari-message"
    }));
    await WaitFor(() => delivered.length === 2);
    CjsRealtimeTestSocket.sockets[0].ServerMessage(ChatEvent({
        subscriptionId: "subscription-fenriscreations",
        login: "fenriscreations",
        messageId: "ignored-message",
        authorId: "ignored-user",
        sequence: 2
    }));
    CjsRealtimeTestSocket.sockets[0].ServerMessage(ChatEvent({
        subscriptionId: "subscription-fenriscreations",
        login: "fenriscreations",
        messageId: "blocked-term-message",
        text: "A BLOCKED PHRASE appeared",
        sequence: 3
    }));
    CjsRealtimeTestSocket.sockets[0].ServerMessage(ChatEvent({
        subscriptionId: "subscription-fenriscreations",
        login: "fenriscreations",
        messageId: "emote-only-message",
        text: "",
        sequence: 4
    }));
    await WaitFor(() => delivered.length === 3);

    assert.equal(delivered.length, 3);
    assert.equal(delivered[0].fragments[1].type, "emote");
    assert.equal(delivered[0].fragments[1].emote.id, "animated-one");
    assert.deepEqual(delivered[0].fragments[1].emote.formats, [
        "animated",
        "static"
    ]);
    assert.equal(delivered[2].text, "");
    await assert.rejects(
        realtime.Unsubscribe(SERVICE.id),
        error => error.code === "subscription_ambiguous"
    );
    assert.equal(await fenris.Close(), true);
    assert.equal(fenris.IsActive(), false);
    assert.equal(caldari.IsActive(), true);
    assert.equal(realtime.GetSubscriptions(SERVICE.id).length, 1);
    realtime.Close();
});

test("releases a targeted room closed while its server subscription activates", async () =>
{
    let pendingSubscribe = null;

    CjsRealtimeTestSocket.Reset((socket, message) =>
    {
        if (message.type === "hello")
        {
            queueMicrotask(() => socket.ServerMessage(Hello("connection-cancel")));
        }

        if (message.type === "subscribe-targeted")
        {
            pendingSubscribe = { socket, message };
        }

        if (message.type === "unsubscribe")
        {
            queueMicrotask(() => socket.ServerMessage({
                type: "result",
                requestId: message.requestId,
                status: "completed",
                data: { subscriptionId: message.subscriptionId }
            }));
        }
    });

    const realtime = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "chat-capability",
        webSocketClass: CjsRealtimeTestSocket,
        reconnect: { minimumDelayMs: 0, maximumDelayMs: 0 }
    });
    const chat = new CjsChatClient({
        realtimeClient: realtime,
        serviceId: SERVICE.id
    });
    const room = chat.ListenRoom({
        provider: "twitch",
        kind: "channel",
        login: "example-channel"
    });
    const connected = realtime.Connect();

    await WaitFor(() => pendingSubscribe !== null);
    assert.equal(await room.Close(), true);
    pendingSubscribe.socket.ServerMessage(SubscribeResult(
        pendingSubscribe.message.requestId,
        {
            subscriptionId: "subscription-cancelled",
            cursor: ChatCursor("stream-chat", 0, 0),
            target: {
                room: {
                    ...pendingSubscribe.message.target.room,
                    id: "202",
                    displayName: "Example Channel"
                }
            }
        }
    ));

    await connected;
    assert.equal(realtime.GetSubscriptions(SERVICE.id).length, 0);
    assert.equal(room.IsActive(), false);
    assert.equal(
        pendingSubscribe.socket.sent.some(message =>
            message.type === "unsubscribe"
            && message.subscriptionId === "subscription-cancelled"),
        true
    );
    realtime.Close();
});

function Hello(connectionId)
{
    return {
        type: "hello",
        protocol: "carbon.tools.realtime",
        protocolVersion: 1,
        connectionId,
        actor: { id: "facade-one", kind: "facade" },
        scopes: {},
        discoveryRef: "/v1/realtime",
        limits: {},
        heartbeat: {}
    };
}

function SubscribeResult(requestId, { subscriptionId, cursor, target = null })
{
    const data = { subscriptionId, service: SERVICE, cursor };

    if (target !== null)
    {
        data.target = target;
    }

    return {
        type: "result",
        requestId,
        status: "completed",
        data
    };
}

function Cursor(streamId, sequence, topicSequence)
{
    return {
        streamId,
        sequence,
        topicSequences: { "synthetic.state.changed": topicSequence }
    };
}

function Event({
    subscriptionId = "subscription-one",
    streamId = "stream-one",
    sequence,
    topicSequence,
    value
})
{
    return {
        type: "event",
        subscriptionId,
        eventId: `event-${sequence}`,
        service: SERVICE,
        streamId,
        sequence,
        topic: "synthetic.state.changed",
        topicSequence,
        occurredAt: "2026-07-23T00:00:00.000Z",
        publishedAt: "2026-07-23T00:00:00.000Z",
        actor: { id: "service", kind: "service" },
        payload: {
            schema: "synthetic.state.event",
            version: 1,
            data: { value }
        }
    };
}

function Snapshot({ streamId = "stream-one", sequence, topicSequence })
{
    return {
        schema: "carbon.tools.realtime.snapshot",
        version: 1,
        service: SERVICE,
        cursor: Cursor(streamId, sequence, topicSequence),
        payload: {
            schema: "synthetic.state.snapshot",
            version: 1,
            data: { value: "current" }
        }
    };
}

function ChatCursor(streamId, sequence, topicSequence)
{
    return {
        streamId,
        sequence,
        topicSequences: {
            "chat.message.received": topicSequence,
            "chat.status.changed": 0
        }
    };
}

function ChatEvent({
    subscriptionId,
    login,
    messageId,
    authorId = "viewer-one",
    text = "hello Kappa",
    sequence = 1
})
{
    return {
        type: "event",
        subscriptionId,
        eventId: `event-${messageId}`,
        service: SERVICE,
        streamId: "stream-chat",
        sequence,
        topic: "chat.message.received",
        topicSequence: sequence,
        occurredAt: "2026-07-23T00:00:00.000Z",
        publishedAt: "2026-07-23T00:00:00.000Z",
        actor: { id: "service", kind: "service" },
        payload: {
            schema: "chat.event",
            version: 1,
            data: {
                id: messageId,
                text,
                room: {
                    provider: "twitch",
                    integrationId: null,
                    space: null,
                    id: login === "fenriscreations" ? "200" : "201",
                    kind: "channel",
                    parentRoomId: null,
                    login,
                    displayName: login,
                    assets: {
                        icon: {
                            id: `twitch-channel-${login}`,
                            url: `https://example.test/${login}.png`,
                            contentType: "image/png",
                            animated: false
                        }
                    }
                },
                author: {
                    id: authorId,
                    login: authorId,
                    displayName: authorId,
                    color: null,
                    roles: []
                },
                fragments: [
                    { type: "text", text: "hello " },
                    {
                        type: "emote",
                        text: "Kappa",
                        emote: {
                            id: "animated-one",
                            setId: null,
                            ownerId: null,
                            formats: [ "animated", "static" ],
                            asset: {
                                id: "twitch-emote-animated-one",
                                url: "https://example.test/animated-one.gif",
                                contentType: "image/gif",
                                animated: true
                            }
                        }
                    }
                ],
                extensions: {
                    twitch: {
                        transport: "irc",
                        emoteAnimation: "animated"
                    }
                }
            }
        }
    };
}

function Deferred()
{
    const result = {};

    result.promise = new Promise((resolve, reject) =>
    {
        result.resolve = resolve;
        result.reject = reject;
    });
    return result;
}

async function WaitFor(predicate)
{
    for (let index = 0; index < 100; index++)
    {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    throw new Error("Timed out waiting for realtime test condition");
}

test("Register merges reconnect policy live, and rejects an invalid one whole", () =>
{
    // Live rather than pre-Initialize only: the reconnect loop reads the policy
    // each time round, and the reason to reach for this is usually a console
    // already being flooded by a server that is not there. Having to restart the
    // client to quieten it would defeat the purpose.
    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "policy-capability",
        webSocketClass: CjsRealtimeTestSocket
    });

    assert.equal(client.reconnect.giveUpAfterMs, 60000, "default budget");

    client.Register({ reconnect: { giveUpAfterMs: 2000 } });
    assert.equal(client.reconnect.giveUpAfterMs, 2000);
    assert.equal(client.reconnect.minimumDelayMs, 250, "unstated fields are kept");
    assert.equal(client.reconnect.factor, 2);

    client.Register({ reconnect: { giveUpAfterMs: 0 } });
    assert.equal(client.reconnect.giveUpAfterMs, 0, "0 disables the budget");

    // A policy that fails validation must leave the previous one in place rather
    // than half-apply and leave the client in a state nobody configured.
    assert.throws(() => client.Register({ reconnect: { factor: 0 } }), RangeError);
    assert.equal(client.reconnect.factor, 2);
    assert.equal(client.reconnect.giveUpAfterMs, 0);
});

test("Connect takes the same options as Register", () =>
{
    // The async entry point accepts the configuration object too, so a caller
    // configures and starts in one step rather than having to remember the
    // ordering. Applied before connecting, and applied even when joining an
    // in-flight connection - a call that silently ignored its arguments
    // depending on timing would be worse than one that always honours them.
    const client = new CjsRealtimeClient({
        url: "http://127.0.0.1:3000",
        capability: "connect-options-capability",
        webSocketClass: CjsRealtimeTestSocket
    });

    assert.throws(
        () => client.Connect({ reconnect: { factor: 0 } }),
        RangeError,
        "an invalid policy throws before anything is started"
    );
    assert.equal(client.state, "idle", "and leaves the client unstarted");

    client.Close();
});
