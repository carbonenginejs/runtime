import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsRealtimeError as CjsRealtimeWireError,
    CjsRealtimeProtocol as CjsRealtimeWireProtocol,
    CjsRealtimeProtocol,
    CjsRealtimeError,
    REALTIME_SUBPROTOCOL,
    REALTIME_SUBPROTOCOL as WIRE_SUBPROTOCOL
} from "@carbonenginejs/runtime/tools/realtime/wire";

const SERVICE = Object.freeze({
    family: "synthetic.state",
    familyVersion: 1,
    kind: "synthetic.memory",
    id: "synthetic-main"
});

function Cursor(streamId, sequence, topicSequence)
{
    return {
        streamId,
        sequence,
        topicSequences: { "synthetic.state.changed": topicSequence }
    };
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

