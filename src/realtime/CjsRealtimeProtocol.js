import { encodeUtf8 } from "@carbonenginejs/runtime-utils/text";
import { CjsRealtimeError } from "./CjsRealtimeError.js";

export const REALTIME_PROTOCOL = "carbon.tools.realtime";
export const REALTIME_PROTOCOL_VERSION = 1;
export const REALTIME_ROUTE = "/v1/realtime";
export const REALTIME_SUBPROTOCOL = "carbon.tools.realtime.v1";

const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/u;
const REQUEST_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

/** Shared construction and validation for the Carbon realtime v1 wire boundary. */
export class CjsRealtimeProtocol
{

    /** Parses one bounded JSON text message. */
    static parseText(text, { maxBytes = 64 * 1024, maxDepth = 16, maxNodes = 4096 } = {})
    {
        if (typeof text !== "string")
        {
            throw new CjsRealtimeError("invalid_message", "Realtime messages must be text", {
                connectionUsable: false,
                closeCode: 1003
            });
        }

        if (encodeUtf8(text).byteLength > maxBytes)
        {
            throw new CjsRealtimeError("message_too_large", "Realtime message exceeds the byte limit", {
                connectionUsable: false,
                closeCode: 1009
            });
        }

        let value;

        try
        {
            value = JSON.parse(text);
        }
        catch (error)
        {
            throw new CjsRealtimeError("invalid_json", "Realtime message is not valid JSON", {
                connectionUsable: false,
                closeCode: 1002,
                cause: error
            });
        }

        CjsRealtimeProtocol.validateJson(value, { maxDepth, maxNodes });

        if (!CjsRealtimeProtocol.isRecord(value))
        {
            throw new CjsRealtimeError("invalid_message", "Realtime message must be an object", {
                connectionUsable: false,
                closeCode: 1002
            });
        }

        return value;
    }

    /** Constructs the required first client message without retaining it elsewhere. */
    static createHello(capability, client = null)
    {
        CjsRealtimeProtocol.assertString(capability, "capability", 1, 2048);

        if (client !== null && !CjsRealtimeProtocol.isRecord(client))
        {
            throw new CjsRealtimeError("invalid_request", "hello.client must be an object");
        }

        return Object.freeze({
            type: "hello",
            protocolVersion: REALTIME_PROTOCOL_VERSION,
            capability,
            client: client === null ? null : CjsRealtimeProtocol.freezeJson(client)
        });
    }

    /** Constructs one exact or targeted service/topic subscription request. */
    static createSubscribe(requestId, serviceId, topics, target = null)
    {
        CjsRealtimeProtocol.assertRequestId(requestId);
        CjsRealtimeProtocol.assertServiceId(serviceId);

        if (!Array.isArray(topics) || topics.length === 0)
        {
            throw new CjsRealtimeError("invalid_request", "subscribe.topics must be a non-empty array");
        }

        const normalized = topics.map(topic => CjsRealtimeProtocol.assertName(topic, "topic"));

        if (new Set(normalized).size !== normalized.length)
        {
            throw new CjsRealtimeError("invalid_request", "subscribe.topics must be unique");
        }

        if (target !== null && !CjsRealtimeProtocol.isRecord(target))
        {
            throw new CjsRealtimeError(
                "invalid_request",
                "Targeted realtime subscriptions require an object target"
            );
        }

        return Object.freeze({
            type: target === null ? "subscribe" : "subscribe-targeted",
            requestId,
            serviceId,
            topics: Object.freeze([ ...normalized ]),
            ...(target === null
                ? {}
                : { target: CjsRealtimeProtocol.freezeJson(target) })
        });
    }

    /** Constructs one subscription removal request. */
    static createUnsubscribe(requestId, subscriptionId)
    {
        CjsRealtimeProtocol.assertRequestId(requestId);
        CjsRealtimeProtocol.assertString(subscriptionId, "subscriptionId", 1, 128);

        return Object.freeze({ type: "unsubscribe", requestId, subscriptionId });
    }

    /** Constructs one authoritative service command request. */
    static createCommand(requestId, serviceId, action, data = null, operationId = null)
    {
        CjsRealtimeProtocol.assertRequestId(requestId);
        CjsRealtimeProtocol.assertServiceId(serviceId);
        CjsRealtimeProtocol.assertName(action, "action");

        if (operationId !== null)
        {
            CjsRealtimeProtocol.assertString(operationId, "operationId", 1, 128);
        }

        return Object.freeze({
            type: "command",
            requestId,
            serviceId,
            action,
            operationId,
            data: CjsRealtimeProtocol.freezeJson(data)
        });
    }

    /** Normalizes one server-to-client message. */
    static normalizeServerMessage(value)
    {
        if (!CjsRealtimeProtocol.isRecord(value) || typeof value.type !== "string")
        {
            throw new CjsRealtimeError("invalid_message", "Realtime server message type is required", {
                connectionUsable: false,
                closeCode: 1002
            });
        }

        if (value.type === "hello")
        {
            if (value.protocol !== REALTIME_PROTOCOL
                || value.protocolVersion !== REALTIME_PROTOCOL_VERSION)
            {
                throw new CjsRealtimeError("unsupported_version", "Unsupported realtime protocol version", {
                    connectionUsable: false,
                    closeCode: 1002
                });
            }

            CjsRealtimeProtocol.assertString(value.connectionId, "connectionId", 1, 128);
            CjsRealtimeProtocol.assertString(value.discoveryRef, "discoveryRef", 1, 1024);

            return Object.freeze({
                type: "hello",
                protocol: value.protocol,
                protocolVersion: value.protocolVersion,
                connectionId: value.connectionId,
                actor: CjsRealtimeProtocol.freezeJson(value.actor ?? null),
                scopes: CjsRealtimeProtocol.freezeJson(value.scopes ?? null),
                discoveryRef: value.discoveryRef,
                limits: CjsRealtimeProtocol.freezeJson(value.limits ?? {}),
                heartbeat: CjsRealtimeProtocol.freezeJson(value.heartbeat ?? {})
            });
        }

        if (value.type === "result")
        {
            CjsRealtimeProtocol.assertRequestId(value.requestId);
            CjsRealtimeProtocol.assertString(value.status, "result.status", 1, 64);

            return Object.freeze({
                type: "result",
                requestId: value.requestId,
                status: value.status,
                data: CjsRealtimeProtocol.freezeJson(value.data ?? null)
            });
        }

        if (value.type === "error")
        {
            CjsRealtimeProtocol.assertErrorCode(value.code);
            CjsRealtimeProtocol.assertString(value.message, "error.message", 1, 256);

            if (value.requestId !== undefined)
            {
                CjsRealtimeProtocol.assertRequestId(value.requestId);
            }

            if (typeof value.retryable !== "boolean" || typeof value.connectionUsable !== "boolean")
            {
                throw new CjsRealtimeError("invalid_message", "Realtime error flags are required", {
                    connectionUsable: false,
                    closeCode: 1002
                });
            }

            return Object.freeze({
                type: "error",
                requestId: value.requestId,
                code: value.code,
                message: value.message,
                retryable: value.retryable,
                connectionUsable: value.connectionUsable,
                details: CjsRealtimeProtocol.freezeJson(value.details ?? null)
            });
        }

        if (value.type === "event")
        {
            return CjsRealtimeProtocol.normalizeEvent(value);
        }

        throw new CjsRealtimeError("invalid_message", "Unsupported realtime server message type", {
            connectionUsable: false,
            closeCode: 1002
        });
    }

    /** Normalizes one ordered subscription event. */
    static normalizeEvent(value)
    {
        if (!CjsRealtimeProtocol.isRecord(value))
        {
            throw new CjsRealtimeError("invalid_message", "Realtime event must be an object");
        }

        CjsRealtimeProtocol.assertString(value.subscriptionId, "subscriptionId", 1, 128);
        CjsRealtimeProtocol.assertString(value.eventId, "eventId", 1, 128);
        CjsRealtimeProtocol.assertString(value.streamId, "streamId", 1, 128);
        CjsRealtimeProtocol.assertPositiveInteger(value.sequence, "event.sequence");
        CjsRealtimeProtocol.assertName(value.topic, "topic");
        CjsRealtimeProtocol.assertPositiveInteger(value.topicSequence, "event.topicSequence");
        CjsRealtimeProtocol.assertString(value.occurredAt, "event.occurredAt", 1, 64);
        CjsRealtimeProtocol.assertString(value.publishedAt, "event.publishedAt", 1, 64);

        if (!CjsRealtimeProtocol.isRecord(value.payload))
        {
            throw new CjsRealtimeError("invalid_message", "Realtime event payload is required");
        }

        CjsRealtimeProtocol.assertName(value.payload.schema, "payload schema");
        CjsRealtimeProtocol.assertPositiveInteger(value.payload.version, "payload.version");

        return Object.freeze({
            type: "event",
            subscriptionId: value.subscriptionId,
            eventId: value.eventId,
            service: CjsRealtimeProtocol.normalizeServiceIdentity(value.service),
            streamId: value.streamId,
            sequence: value.sequence,
            topic: value.topic,
            topicSequence: value.topicSequence,
            occurredAt: value.occurredAt,
            publishedAt: value.publishedAt,
            actor: CjsRealtimeProtocol.freezeJson(value.actor ?? null),
            payload: Object.freeze({
                schema: value.payload.schema,
                version: value.payload.version,
                data: CjsRealtimeProtocol.freezeJson(value.payload.data ?? null)
            })
        });
    }

    /** Normalizes one cursor-stamped service snapshot. */
    static normalizeSnapshot(value, expectedServiceId = null)
    {
        if (!CjsRealtimeProtocol.isRecord(value)
            || value.schema !== "carbon.tools.realtime.snapshot"
            || value.version !== 1)
        {
            throw new CjsRealtimeError("invalid_snapshot", "Unsupported realtime snapshot envelope");
        }

        const service = CjsRealtimeProtocol.normalizeServiceIdentity(value.service);

        if (expectedServiceId !== null && service.id !== expectedServiceId)
        {
            throw new CjsRealtimeError("invalid_snapshot", "Realtime snapshot service does not match");
        }

        if (!CjsRealtimeProtocol.isRecord(value.payload))
        {
            throw new CjsRealtimeError("invalid_snapshot", "Realtime snapshot payload is required");
        }

        CjsRealtimeProtocol.assertName(value.payload.schema, "snapshot payload schema");
        CjsRealtimeProtocol.assertPositiveInteger(value.payload.version, "snapshot payload.version");

        return Object.freeze({
            schema: value.schema,
            version: value.version,
            service,
            cursor: CjsRealtimeProtocol.normalizeCursor(value.cursor),
            payload: Object.freeze({
                schema: value.payload.schema,
                version: value.payload.version,
                data: CjsRealtimeProtocol.freezeJson(value.payload.data ?? null)
            })
        });
    }

    /** Normalizes one service stream cursor. */
    static normalizeCursor(value)
    {
        if (!CjsRealtimeProtocol.isRecord(value))
        {
            throw new CjsRealtimeError("invalid_cursor", "Realtime cursor must be an object");
        }

        CjsRealtimeProtocol.assertString(value.streamId, "cursor.streamId", 1, 128);
        CjsRealtimeProtocol.assertNonNegativeInteger(value.sequence, "cursor.sequence");

        if (!CjsRealtimeProtocol.isRecord(value.topicSequences))
        {
            throw new CjsRealtimeError("invalid_cursor", "Realtime cursor topicSequences are required");
        }

        const topicSequences = {};

        for (const [ topic, sequence ] of Object.entries(value.topicSequences))
        {
            CjsRealtimeProtocol.assertName(topic, "cursor topic");
            CjsRealtimeProtocol.assertNonNegativeInteger(sequence, `cursor topic ${topic}`);
            topicSequences[topic] = sequence;
        }

        return Object.freeze({
            streamId: value.streamId,
            sequence: value.sequence,
            topicSequences: Object.freeze(topicSequences)
        });
    }

    /** Normalizes the stable identity shared by discovery, snapshots, and events. */
    static normalizeServiceIdentity(value)
    {
        if (!CjsRealtimeProtocol.isRecord(value))
        {
            throw new CjsRealtimeError("invalid_message", "Realtime service identity is required");
        }

        CjsRealtimeProtocol.assertServiceId(value.id);
        CjsRealtimeProtocol.assertName(value.family, "service family");
        CjsRealtimeProtocol.assertName(value.kind, "service kind");
        CjsRealtimeProtocol.assertPositiveInteger(value.familyVersion, "service familyVersion");

        return Object.freeze({
            family: value.family,
            familyVersion: value.familyVersion,
            kind: value.kind,
            id: value.id
        });
    }

    /** Creates an immutable JSON-compatible clone. */
    static freezeJson(value)
    {
        CjsRealtimeProtocol.validateJson(value);
        return CjsRealtimeProtocol.freezeValue(JSON.parse(JSON.stringify(value)));
    }

    /** Validates a JSON-compatible value with bounded depth and node count. */
    static validateJson(value, { maxDepth = 32, maxNodes = 16384 } = {})
    {
        const state = { nodes: 0, seen: new WeakSet() };

        CjsRealtimeProtocol.validateJsonValue(value, 0, maxDepth, maxNodes, state);
        return value;
    }

    /** Returns true for a non-array plain object record. */
    static isRecord(value)
    {
        if (value === null || typeof value !== "object" || Array.isArray(value))
        {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    /**
     * Requires a lowercase identifier of at most 64 characters and returns it,
     * so it can be asserted inline; a violation is an invalid_request realtime
     * error.
     */
    static assertServiceId(value)
    {
        if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value))
        {
            throw new CjsRealtimeError("invalid_request", "Invalid realtime service ID");
        }

        return value;
    }

    /**
     * Requires a letter-led topic or action name of at most 128 characters,
     * naming the offending field with label in the error message.
     */
    static assertName(value, label)
    {
        if (typeof value !== "string" || !NAME_PATTERN.test(value))
        {
            throw new CjsRealtimeError("invalid_request", `Invalid realtime ${label}`);
        }

        return value;
    }

    /**
     * Requires a bounded request correlation ID; the pattern also allows a colon
     * so callers can namespace their own IDs.
     */
    static assertRequestId(value)
    {
        if (typeof value !== "string" || !REQUEST_PATTERN.test(value))
        {
            throw new CjsRealtimeError("invalid_request", "Invalid realtime requestId");
        }

        return value;
    }

    /**
     * Requires the lowercase snake_case error-code shape used by
     * CjsRealtimeError, so a server-supplied code cannot smuggle arbitrary text
     * into an observer.
     */
    static assertErrorCode(value)
    {
        if (typeof value !== "string" || !/^[a-z][a-z0-9_]{0,63}$/u.test(value))
        {
            throw new CjsRealtimeError("invalid_message", "Invalid realtime error code");
        }

        return value;
    }

    /**
     * Requires a string whose length lies within the inclusive bounds, keeping
     * unbounded caller text such as a capability off the wire.
     */
    static assertString(value, label, minimum, maximum)
    {
        if (typeof value !== "string" || value.length < minimum || value.length > maximum)
        {
            throw new CjsRealtimeError("invalid_request", `${label} must be a bounded string`);
        }

        return value;
    }

    /**
     * Requires a safe integer of at least 1, used for wire sequences that start
     * counting at one.
     */
    static assertPositiveInteger(value, label)
    {
        if (!Number.isSafeInteger(value) || value < 1)
        {
            throw new CjsRealtimeError("invalid_message", `${label} must be a positive integer`);
        }

        return value;
    }

    /**
     * Requires a safe integer of at least 0, used for cursor positions that may
     * legitimately be zero.
     */
    static assertNonNegativeInteger(value, label)
    {
        if (!Number.isSafeInteger(value) || value < 0)
        {
            throw new CjsRealtimeError("invalid_message", `${label} must be a non-negative integer`);
        }

        return value;
    }

    /**
     * Deep-freezes in place and returns the same value, not a copy; the seen set
     * makes it safe over shared references and cycles.
     */
    static freezeValue(value, seen = new Set())
    {
        if (!value || typeof value !== "object" || seen.has(value))
        {
            return value;
        }

        seen.add(value);

        for (const item of Object.values(value))
        {
            CjsRealtimeProtocol.freezeValue(item, seen);
        }

        return Object.freeze(value);
    }

    /**
     * Recursive worker behind validateJson: counts nodes and depth against the
     * caller limits and rejects non-finite numbers, non-plain objects and
     * cycles.
     */
    static validateJsonValue(value, depth, maxDepth, maxNodes, state)
    {
        state.nodes++;

        if (state.nodes > maxNodes || depth > maxDepth)
        {
            throw new CjsRealtimeError("invalid_request", "JSON value exceeds structural limits");
        }

        if (value === null || typeof value === "string" || typeof value === "boolean")
        {
            return;
        }

        if (typeof value === "number")
        {
            if (!Number.isFinite(value))
            {
                throw new CjsRealtimeError("invalid_request", "JSON numbers must be finite");
            }

            return;
        }

        if (typeof value !== "object")
        {
            throw new CjsRealtimeError("invalid_request", "Value is not JSON-compatible");
        }

        if (!Array.isArray(value) && !CjsRealtimeProtocol.isRecord(value))
        {
            throw new CjsRealtimeError("invalid_request", "JSON objects must be plain records");
        }

        if (state.seen.has(value))
        {
            throw new CjsRealtimeError("invalid_request", "JSON value must not contain a cycle");
        }

        state.seen.add(value);

        for (const entry of Array.isArray(value) ? value : Object.values(value))
        {
            CjsRealtimeProtocol.validateJsonValue(entry, depth + 1, maxDepth, maxNodes, state);
        }

        state.seen.delete(value);
    }

}
