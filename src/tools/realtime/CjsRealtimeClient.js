import { encodeUtf8 } from "#utils/text";
import { CjsRealtimeError } from "./CjsRealtimeError.js";
import {
    CjsRealtimeProtocol,
    REALTIME_ROUTE,
    REALTIME_SUBPROTOCOL
} from "./CjsRealtimeProtocol.js";
import { CjsRealtimeSubscription } from "./CjsRealtimeSubscription.js";

/** Consumes Carbon realtime v1 in browsers with bounded lifecycle, outbound pressure, reconnect, secret-safe metrics, and snapshot reconciliation. */
export class CjsRealtimeClient
{

    #capability;
    #clientIdentity;
    #connectLoop;
    #fetch;
    #generationAbortController;
    #generationFailure;
    #hello;
    #helloTimeoutMs;
    #maxMessageBytes;
    #messageLane;
    #metrics;
    #onError;
    #onStateChange;
    #operationLane;
    #outbound;
    #pendingRequests;
    #queuedOperationCount;
    #random;
    #readyWaiters;
    #reconnect;
    #reconnectDelayWaiter;
    #requestTimeoutMs;
    #requestSequence;
    #running;
    #skipReconnectDelay;
    #socket;
    #subscriptions;
    #subscriptionsById;
    #subscriptionsByService;
    #webSocketClass;

    /**
     * Binds the client to one normalized WebSocket/HTTP endpoint pair and holds
     * the capability in memory only; every environment dependency is injected,
     * and no socket is opened until Connect is called.
     * @param {string} url WebSocket or HTTP(S) endpoint; http(s) is upgraded and
     * the query and fragment are dropped so a capability never rides the URL.
     * @param {string} httpURL Endpoint for snapshot and discovery requests;
     * defaults to the WebSocket endpoint expressed as HTTP(S).
     * @param {string} capability Bearer secret sent in hello and in the
     * Authorization header; it is never persisted.
     * @param {Function} webSocketClass Standards-compatible WebSocket class.
     * @param {Function} fetch Standards-compatible fetch used for HTTP work.
     * @param {Function} random Source of jitter, injectable for deterministic tests.
     */
    constructor({
        url,
        httpURL = null,
        capability,
        client = null,
        webSocketClass = globalThis.WebSocket,
        fetch = globalThis.fetch,
        maxMessageBytes = 64 * 1024,
        helloTimeoutMs = 10000,
        requestTimeoutMs = 15000,
        reconnect = {},
        outbound = {},
        random = Math.random,
        onStateChange = null,
        onError = null
    })
    {
        const endpoints = CjsRealtimeClient.normalizeEndpoints(url, httpURL);

        CjsRealtimeProtocol.assertString(capability, "capability", 1, 2048);

        if (client !== null && !CjsRealtimeProtocol.isRecord(client))
        {
            throw new TypeError("Realtime client identity must be an object or null");
        }

        if (!Number.isSafeInteger(maxMessageBytes) || maxMessageBytes < 1024)
        {
            throw new RangeError("maxMessageBytes must be an integer of at least 1024");
        }

        CjsRealtimeClient.assertTimeout(helloTimeoutMs, "helloTimeoutMs");
        CjsRealtimeClient.assertTimeout(requestTimeoutMs, "requestTimeoutMs");

        if (typeof random !== "function")
        {
            throw new TypeError("Realtime random source must be a function");
        }

        if (onStateChange !== null && typeof onStateChange !== "function")
        {
            throw new TypeError("onStateChange must be a function or null");
        }

        if (onError !== null && typeof onError !== "function")
        {
            throw new TypeError("onError must be a function or null");
        }

        this.url = endpoints.webSocketURL;
        this.httpURL = endpoints.httpURL;
        this.state = "idle";
        this.connection = null;
        this.#capability = capability;
        this.#clientIdentity = client === null ? null : CjsRealtimeProtocol.freezeJson(client);
        this.#webSocketClass = webSocketClass;
        this.#fetch = fetch;
        this.#maxMessageBytes = maxMessageBytes;
        this.#helloTimeoutMs = helloTimeoutMs;
        this.#requestTimeoutMs = requestTimeoutMs;
        this.#reconnect = CjsRealtimeClient.normalizeReconnect(reconnect);
        this.#outbound = CjsRealtimeClient.normalizeOutbound(outbound);
        this.#random = random;
        this.#onStateChange = onStateChange;
        this.#onError = onError;
        this.#subscriptions = new Set();
        this.#subscriptionsByService = new Map();
        this.#subscriptionsById = new Map();
        this.#pendingRequests = new Map();
        this.#readyWaiters = new Set();
        this.#socket = null;
        this.#hello = null;
        this.#generationAbortController = null;
        this.#generationFailure = null;
        this.#messageLane = Promise.resolve();
        this.#operationLane = Promise.resolve();
        this.#queuedOperationCount = 0;
        this.#requestSequence = 0;
        this.#running = false;
        this.#connectLoop = null;
        this.#reconnectDelayWaiter = null;
        this.#skipReconnectDelay = false;
        this.#metrics = {
            connectionGenerations: 0,
            reconnectAttempts: 0,
            helloTimeouts: 0,
            requestTimeouts: 0,
            snapshotRecoveries: 0,
            sequenceGapResyncs: 0,
            outboundPressure: 0
        };
    }

    /**
     * Starts or joins the reconnect loop and resolves after subscriptions
     * recover.
     *
     * Takes the same options object as `Register`, applied before connecting, so
     * a caller may configure and start in one step:
     *
     *     await realtime.Connect({ reconnect: { giveUpAfterMs: 2000 } });
     *
     * Options are applied even when joining an in-flight connection, because the
     * alternative is a call that silently ignores what it was passed depending on
     * timing. An invalid policy throws before anything is started.
     *
     * @param {object} [options] Same shape as Register.
     * @returns {Promise<object>} The connection, once ready.
     */
    Connect(options)
    {
        if (options !== undefined) this.Register(options);

        if (this.state === "ready")
        {
            return Promise.resolve(this.connection);
        }

        const ready = this.#WaitForReady();

        if (!this.#running)
        {
            this.#running = true;
            this.#connectLoop = this.#RunConnectionLoop();
        }

        return ready;
    }

    /** Deliberately stops reconnecting and closes the current connection. */
    Close(code = 1000, reason = "client_closed")
    {
        this.#running = false;
        this.#skipReconnectDelay = true;
        this.#CancelReconnectDelay();
        this.#RejectReadyWaiters(new CjsRealtimeError(
            "client_closed",
            "Realtime client was closed",
            { connectionUsable: false }
        ));

        if (this.#socket)
        {
            this.#socket.close(code, reason);
        }

        this.#generationAbortController?.abort();

        this.#ResetGeneration("client_closed");
        this.connection = null;
        this.#SetState("closed");
    }

    /** Replaces the in-memory capability and reconnects without persisting it. */
    ReplaceCapability(capability)
    {
        CjsRealtimeProtocol.assertString(capability, "capability", 1, 2048);
        this.#capability = capability;

        if (!this.#running)
        {
            return Promise.resolve(null);
        }

        this.#skipReconnectDelay = true;
        this.#CancelReconnectDelay();
        this.#SetState("reconnecting");
        const ready = this.#WaitForReady();

        if (this.#socket)
        {
            this.#socket.close(4000, "capability_replaced");
        }

        return ready;
    }

    /** Adds one desired service subscription retained across reconnects. */
    Subscribe(options)
    {
        const subscription = options instanceof CjsRealtimeSubscription
            ? options
            : new CjsRealtimeSubscription(options);

        const serviceSubscriptions = this.#subscriptionsByService.get(
            subscription.serviceId
        ) ?? new Set();

        serviceSubscriptions.add(subscription);
        this.#subscriptionsByService.set(subscription.serviceId, serviceSubscriptions);
        this.#subscriptions.add(subscription);

        if (this.state === "ready")
        {
            this.#QueueOperation(() => this.#StartSubscription(subscription))
                .catch(error => this.#HandleOperationFailure(error));
        }

        return subscription;
    }

    /** Removes one desired subscription and its current server subscription. */
    async Unsubscribe(value)
    {
        let subscription;

        if (value instanceof CjsRealtimeSubscription)
        {
            subscription = this.#subscriptions.has(value) ? value : null;
        }
        else
        {
            CjsRealtimeProtocol.assertServiceId(value);
            const subscriptions = this.#subscriptionsByService.get(value);

            if (subscriptions?.size > 1)
            {
                throw new CjsRealtimeError(
                    "subscription_ambiguous",
                    `More than one realtime subscription exists for ${value}`
                );
            }

            subscription = subscriptions?.values().next().value ?? null;
        }

        if (!subscription)
        {
            return false;
        }

        this.#subscriptions.delete(subscription);
        const serviceSubscriptions = this.#subscriptionsByService.get(
            subscription.serviceId
        );

        serviceSubscriptions?.delete(subscription);

        if (serviceSubscriptions?.size === 0)
        {
            this.#subscriptionsByService.delete(subscription.serviceId);
        }

        try
        {
            if (this.state === "ready")
            {
                await this.#QueueOperation(async () =>
                {
                    if (subscription.GetSubscriptionId())
                    {
                        await this.#Request(requestId =>
                            CjsRealtimeProtocol.createUnsubscribe(
                                requestId,
                                subscription.GetSubscriptionId()
                            ));
                    }
                });
            }
        }
        finally
        {
            if (subscription.GetSubscriptionId())
            {
                this.#subscriptionsById.delete(subscription.GetSubscriptionId());
            }

            subscription.Dispose();
        }

        return true;
    }

    /** Sends one authenticated command and returns its result data. */
    async Command(serviceId, action, data = null, { operationId = null } = {})
    {
        this.#RequireReady();
        const result = await this.#QueueOperation(() => this.#Request(requestId =>
            CjsRealtimeProtocol.createCommand(
                requestId,
                serviceId,
                action,
                data,
                operationId
            )));

        return result.data;
    }

    /** Fetches authenticated service discovery without exposing the capability. */
    Discover()
    {
        return this.#FetchJson(this.httpURL);
    }

    /** Returns one currently desired subscription or null. */
    GetSubscription(serviceId)
    {
        CjsRealtimeProtocol.assertServiceId(serviceId);

        return this.#subscriptionsByService.get(serviceId)?.values().next().value ?? null;
    }

    /** Returns desired subscriptions for one service or the whole client. */
    GetSubscriptions(serviceId = null)
    {
        if (serviceId === null)
        {
            return Object.freeze([ ...this.#subscriptions ]);
        }

        CjsRealtimeProtocol.assertServiceId(serviceId);

        return Object.freeze([ ...(this.#subscriptionsByService.get(serviceId) ?? []) ]);
    }

    /** Returns whether the socket, hello, and desired subscriptions are ready. */
    IsConnected()
    {
        return this.state === "ready";
    }

    /**
     * Returns frozen secret-free lifecycle counters. Capabilities, URLs,
     * request bodies, provider payloads, and error details are never recorded.
     */
    GetMetrics()
    {
        return Object.freeze({ ...this.#metrics });
    }

    /**
     * Derives the frozen socket and HTTP endpoint pair from caller URLs, upgrading
     * http(s) to ws(s), applying the default realtime route to an empty path, and
     * stripping the query and fragment so no capability can travel in a URL.
     * @returns {{webSocketURL: string, httpURL: string}} Frozen endpoint pair.
     */
    static normalizeEndpoints(value, httpValue = null)
    {
        const input = new URL(String(value));

        if (![ "ws:", "wss:", "http:", "https:" ].includes(input.protocol))
        {
            throw new TypeError("Realtime URL must use HTTP(S) or WebSocket(S)");
        }

        const socket = new URL(input);

        if (socket.protocol === "http:") socket.protocol = "ws:";
        if (socket.protocol === "https:") socket.protocol = "wss:";
        socket.pathname = CjsRealtimeClient.normalizeRoute(socket.pathname);
        socket.search = "";
        socket.hash = "";

        const http = httpValue === null ? new URL(socket) : new URL(String(httpValue));

        if (http.protocol === "ws:") http.protocol = "http:";
        if (http.protocol === "wss:") http.protocol = "https:";

        if (![ "http:", "https:" ].includes(http.protocol))
        {
            throw new TypeError("Realtime HTTP URL must use HTTP(S)");
        }

        http.pathname = CjsRealtimeClient.normalizeRoute(http.pathname);
        http.search = "";
        http.hash = "";

        return Object.freeze({ webSocketURL: socket.href, httpURL: http.href });
    }

    /**
     * Substitutes the default realtime route for an empty or root pathname and
     * otherwise strips trailing slashes.
     */
    static normalizeRoute(pathname)
    {
        return !pathname || pathname === "/" ? REALTIME_ROUTE : pathname.replace(/\/+$/u, "");
    }

    /**
     * Updates connection policy at runtime, applying only the keys provided.
     *
     * The reconnect loop reads the policy each time round, so a change takes
     * effect on the next delay rather than needing a reconnect - which is the
     * point: the usual reason to reach for this is a console being flooded by a
     * server that is not there, and having to restart the client to quieten it
     * defeats the purpose.
     *
     * `reconnect` merges into the current policy, so a caller may set one field
     * without restating the rest, and the result is validated as a whole:
     *
     *     realtime.Register({ reconnect: { giveUpAfterMs: 2000 } });
     *     realtime.Register({ reconnect: { giveUpAfterMs: 0 } });   // never give up
     *
     * An invalid policy throws and leaves the existing one in place, rather than
     * half-applying and leaving the client in a state nobody configured.
     *
     * @param {object} [options]
     * @param {object} [options.reconnect] Backoff policy fields to merge.
     * @returns {CjsRealtimeClient} this, for chaining.
     */
    Register(options = {})
    {
        if (!options || typeof options !== "object")
        {
            throw new TypeError("Realtime Register requires an options object");
        }

        if ("reconnect" in options)
        {
            const merged = CjsRealtimeClient.normalizeReconnect({
                ...this.#reconnect,
                ...options.reconnect
            });

            this.#reconnect = merged;
        }

        return this;
    }

    /** The reconnect policy currently in force. Frozen; change it with Register. */
    get reconnect()
    {
        return this.#reconnect;
    }

    /**
     * Fills the backoff policy defaults (250 ms to 10 s, factor 2, jitter 0.2)
     * and rejects an internally inconsistent policy.
     */
    static normalizeReconnect(value)
    {
        const result = {
            minimumDelayMs: value.minimumDelayMs ?? 250,
            maximumDelayMs: value.maximumDelayMs ?? 10000,
            factor: value.factor ?? 2,
            jitter: value.jitter ?? 0.2,
            // Stop reconnecting after this much scheduled backoff without ever
            // reaching ready. Without it the loop retries forever against a
            // server that is not there, and every attempt writes a WebSocket
            // handshake failure the page cannot suppress - the browser logs it
            // before any of our code runs. That buries every other console
            // message, which is the actual harm: the failure is not fatal, but
            // it makes everything else undebuggable.
            //
            // 0 disables the limit, for a client that genuinely should wait
            // indefinitely.
            giveUpAfterMs: value.giveUpAfterMs ?? 60000
        };

        if (!Number.isFinite(result.minimumDelayMs) || result.minimumDelayMs < 0
            || !Number.isFinite(result.maximumDelayMs)
            || result.maximumDelayMs < result.minimumDelayMs
            || !Number.isFinite(result.factor) || result.factor < 1
            || !Number.isFinite(result.jitter) || result.jitter < 0 || result.jitter > 1
            || !Number.isFinite(result.giveUpAfterMs) || result.giveUpAfterMs < 0)
        {
            throw new RangeError("Invalid realtime reconnect policy");
        }

        return Object.freeze(result);
    }

    /**
     * Bounds the number of queued caller operations and the amount already
     * buffered by the browser WebSocket before another frame is admitted.
     */
    static normalizeOutbound(value)
    {
        const result = {
            maximumBufferedBytes: value.maximumBufferedBytes ?? 256 * 1024,
            maximumQueuedOperations: value.maximumQueuedOperations ?? 64
        };

        if (!Number.isSafeInteger(result.maximumBufferedBytes)
            || result.maximumBufferedBytes < 1
            || !Number.isSafeInteger(result.maximumQueuedOperations)
            || result.maximumQueuedOperations < 1)
        {
            throw new RangeError("Invalid realtime outbound pressure policy");
        }

        return Object.freeze(result);
    }

    /** Requires one positive finite integer timeout in milliseconds. */
    static assertTimeout(value, label)
    {
        if (!Number.isSafeInteger(value) || value < 1)
        {
            throw new RangeError(`${label} must be a positive integer`);
        }

        return value;
    }

    /**
     * Returns whether a connection failure needs explicit caller action before
     * another connection generation may start.
     */
    static isTerminalFailure(error)
    {
        return [
            "forbidden",
            "invalid_origin",
            "policy_violation",
            "subprotocol_mismatch",
            "unauthorized",
            "unsupported_version",
            "websocket_unavailable",
            "fetch_unavailable"
        ].includes(error?.code)
            || [ 1002, 1008, 4401, 4403 ].includes(error?.closeCode);
    }

    /** Maps a socket close event to one stable retry or terminal failure. */
    static closeFailure(event)
    {
        const closeCode = Number.isSafeInteger(event?.code) ? event.code : 1006;
        const terminal = new Map([
            [ 1002, [ "protocol_error", "Realtime protocol negotiation failed" ] ],
            [ 1008, [ "policy_violation", "Realtime connection violated server policy" ] ],
            [ 4401, [ "unauthorized", "Realtime capability was rejected" ] ],
            [ 4403, [ "forbidden", "Realtime capability lacks permission" ] ]
        ]).get(closeCode);

        if (terminal)
        {
            return new CjsRealtimeError(terminal[0], terminal[1], {
                connectionUsable: false,
                closeCode
            });
        }

        return new CjsRealtimeError(
            "connection_closed",
            `Realtime connection closed (${closeCode})`,
            { retryable: true, connectionUsable: false, closeCode }
        );
    }

    /**
     * Creates a deferred whose resolve and reject are idempotent and whose
     * promise is pre-caught, so a rejection nobody awaits never surfaces as
     * unhandled.
     */
    static createDeferred()
    {
        const value = { settled: false };

        value.promise = new Promise((resolve, reject) =>
        {
            value.resolve = resolved =>
            {
                if (!value.settled)
                {
                    value.settled = true;
                    resolve(resolved);
                }
            };
            value.reject = failure =>
            {
                if (!value.settled)
                {
                    value.settled = true;
                    reject(failure);
                }
            };
        });
        value.promise.catch(() => {});
        return value;
    }

    /**
     * Computes one backoff delay in milliseconds for the given zero-based
     * attempt, spread by the policy jitter using the injected random source.
     */
    static reconnectDelay(policy, attempt, random)
    {
        const base = Math.min(
            policy.maximumDelayMs,
            policy.minimumDelayMs * (policy.factor ** attempt)
        );
        const spread = base * policy.jitter;
        return Math.max(0, base - spread + random() * spread * 2);
    }

    /**
     * Reconnects until Close, resetting the attempt counter after a connection
     * that reached ready, and reporting each failure through onError rather than
     * throwing.
     */
    async #RunConnectionLoop()
    {
        let attempt = 0;
        // Scheduled backoff spent since the last connection that reached ready.
        // Summed from the delays below rather than read off a clock: the client
        // injects no clock, and summing keeps the give-up point deterministic
        // for tests. It therefore measures waiting, not the time spent inside a
        // connection attempt, so the real elapsed time is a little longer.
        let backoffSpentMs = 0;

        while (this.#running)
        {
            let terminal = false;

            try
            {
                await this.#OpenConnection();
                attempt = 0;
                backoffSpentMs = 0;
            }
            catch (failure)
            {
                const error = CjsRealtimeError.from(failure, {
                    code: "connection_failed",
                    message: "Realtime connection failed",
                    retryable: true,
                    connectionUsable: false
                });

                if (this.#running)
                {
                    this.#ReportError(error);
                    terminal = CjsRealtimeClient.isTerminalFailure(error);

                    if (terminal)
                    {
                        this.#running = false;
                        this.#RejectReadyWaiters(error);
                        this.#SetState("stopped");
                    }
                }
            }
            finally
            {
                this.connection = null;
                this.#ResetGeneration("connection_lost");
            }

            if (!this.#running || terminal)
            {
                break;
            }

            this.#SetState("reconnecting");
            this.#metrics.reconnectAttempts++;
            const delay = this.#skipReconnectDelay
                ? 0
                : CjsRealtimeClient.reconnectDelay(this.#reconnect, attempt++, this.#random);
            this.#skipReconnectDelay = false;
            backoffSpentMs += delay;

            // Give up rather than retry forever against a server that never
            // answers. Reported through the ordinary error channel first, so a
            // caller sees why it stopped, then stopped exactly as a terminal
            // failure would - waiters rejected, state "stopped" - because from
            // the caller's side there is no difference between "refused
            // permanently" and "never answered for a minute".
            if (this.#reconnect.giveUpAfterMs > 0 && backoffSpentMs >= this.#reconnect.giveUpAfterMs)
            {
                const abandoned = CjsRealtimeError.from(null, {
                    code: "connection_abandoned",
                    message: "Realtime connection abandoned after "
                        + `${Math.round(backoffSpentMs / 1000)}s of retries without a connection`,
                    retryable: false,
                    connectionUsable: false
                });

                this.#running = false;
                this.#ReportError(abandoned);
                this.#RejectReadyWaiters(abandoned);
                this.#SetState("stopped");
                break;
            }

            if (delay > 0)
            {
                await this.#WaitReconnectDelay(delay);
            }
        }

        this.#connectLoop = null;
    }

    /**
     * Runs one whole socket generation: sends hello, activates every desired
     * subscription, publishes the ready state, and only settles once the socket
     * closes.
     */
    async #OpenConnection()
    {
        if (typeof this.#webSocketClass !== "function")
        {
            throw new CjsRealtimeError(
                "websocket_unavailable",
                "WebSocket is unavailable; inject a standards-compatible class",
                { connectionUsable: false }
            );
        }

        this.#SetState("connecting");
        const socket = new this.#webSocketClass(this.url, REALTIME_SUBPROTOCOL);
        const closed = CjsRealtimeClient.createDeferred();
        const hello = CjsRealtimeClient.createDeferred();
        const abortController = new AbortController();

        this.#metrics.connectionGenerations++;
        this.#socket = socket;
        this.#hello = hello;
        this.#generationAbortController = abortController;
        this.#generationFailure = null;
        this.#messageLane = Promise.resolve();
        this.#requestSequence = 0;
        const helloTimer = setTimeout(() =>
        {
            if (hello.settled)
            {
                return;
            }

            const failure = new CjsRealtimeError(
                "hello_timeout",
                "Realtime server hello timed out",
                {
                    retryable: true,
                    connectionUsable: false,
                    closeCode: 1013
                }
            );

            this.#metrics.helloTimeouts++;
            this.#generationFailure = failure;
            hello.reject(failure);
            socket.close(4408, "hello_timeout");
        }, this.#helloTimeoutMs);

        socket.addEventListener("open", () =>
        {
            if (socket.protocol !== REALTIME_SUBPROTOCOL)
            {
                const failure = new CjsRealtimeError(
                    "subprotocol_mismatch",
                    "Realtime server did not negotiate the required subprotocol",
                    { connectionUsable: false, closeCode: 1002 }
                );

                this.#generationFailure = failure;
                hello.reject(failure);
                socket.close(1002, "subprotocol_mismatch");
                return;
            }

            try
            {
                this.#Send(CjsRealtimeProtocol.createHello(
                    this.#capability,
                    this.#clientIdentity
                ));
            }
            catch (failure)
            {
                const error = CjsRealtimeError.from(failure);

                this.#generationFailure = error;
                hello.reject(error);
                socket.close(error.closeCode ?? 1002, error.code);
            }
        }, { once: true });

        socket.addEventListener("message", event =>
        {
            this.#messageLane = this.#messageLane
                .then(() => this.#ReceiveMessage(event.data))
                .catch(failure => this.#HandleMessageFailure(failure));
        });

        socket.addEventListener("close", event =>
        {
            const failure = this.#generationFailure
                ?? CjsRealtimeClient.closeFailure(event);

            hello.reject(failure);
            this.#RejectPendingRequests(failure);
            abortController.abort();
            closed.resolve(failure);
        }, { once: true });

        socket.addEventListener("error", () => {}, { once: true });

        try
        {
            this.connection = await hello.promise;
            clearTimeout(helloTimer);
            this.#SetState("subscribing");
            await this.#ActivateSubscriptions();

            if (this.#socket !== socket || closed.settled)
            {
                throw new CjsRealtimeError("connection_changed", "Realtime connection changed");
            }

            this.#SetState("ready");
            this.#ResolveReadyWaiters(this.connection);
            const failure = await closed.promise;

            if (this.#running && CjsRealtimeClient.isTerminalFailure(failure))
            {
                throw failure;
            }
        }
        finally
        {
            clearTimeout(helloTimer);

            if (this.#socket === socket)
            {
                if (!closed.settled)
                {
                    socket.close(1011, "connection_restart");
                }

                this.#socket = null;
                this.#hello = null;

                if (this.#generationAbortController === abortController)
                {
                    this.#generationAbortController = null;
                }
            }
        }
    }

    /**
     * Starts every desired subscription that has no server subscription ID yet,
     * one at a time, re-scanning after each so subscriptions added
     * mid-activation are included.
     */
    async #ActivateSubscriptions()
    {
        while (true)
        {
            const subscription = [ ...this.#subscriptions ]
                .find(item => item.GetSubscriptionId() === null);

            if (!subscription)
            {
                return;
            }

            await this.#StartSubscription(subscription);
        }
    }

    /**
     * Subscribes one desired subscription on the current connection, verifies
     * the server echoed the requested service and target, unsubscribes again if
     * the caller removed it while the request was in flight, and installs the
     * HTTP snapshot when recovery is "snapshot".
     */
    async #StartSubscription(subscription)
    {
        if (!this.#subscriptions.has(subscription)
            || subscription.GetSubscriptionId() !== null)
        {
            return subscription;
        }

        const result = await this.#Request(requestId => CjsRealtimeProtocol.createSubscribe(
            requestId,
            subscription.serviceId,
            subscription.topics,
            subscription.target
        ));
        const data = result.data;

        if (result.status !== "completed" || !CjsRealtimeProtocol.isRecord(data))
        {
            throw new CjsRealtimeError("invalid_result", "Realtime subscribe result is invalid");
        }

        CjsRealtimeProtocol.assertString(data.subscriptionId, "subscriptionId", 1, 128);
        const service = CjsRealtimeProtocol.normalizeServiceIdentity(data.service);

        if (service.id !== subscription.serviceId)
        {
            throw new CjsRealtimeError("invalid_result", "Realtime subscribe service does not match");
        }

        if (subscription.target !== null && !CjsRealtimeProtocol.isRecord(data.target))
        {
            throw new CjsRealtimeError(
                "invalid_result",
                "Targeted realtime subscription result omitted its target"
            );
        }

        if (!this.#subscriptions.has(subscription))
        {
            await this.#Request(requestId =>
                CjsRealtimeProtocol.createUnsubscribe(
                    requestId,
                    data.subscriptionId
                ));
            return subscription;
        }

        subscription.Begin(
            data.subscriptionId,
            data.cursor,
            data.target ?? null
        );
        this.#subscriptionsById.set(data.subscriptionId, subscription);

        if (subscription.recovery === "snapshot")
        {
            const snapshot = await this.#FetchJson(
                `${this.httpURL}/services/${encodeURIComponent(subscription.serviceId)}/snapshot`
                    .replace(`${REALTIME_ROUTE}//`, `${REALTIME_ROUTE}/`),
                { signal: this.#generationAbortController?.signal ?? null }
            );
            await subscription.InstallSnapshot(snapshot);
            this.#metrics.snapshotRecoveries++;
        }

        return subscription;
    }

    /**
     * Sends one request carrying a generation-scoped request ID and resolves
     * with the matching result frame; request IDs restart at 1 on every new
     * connection.
     */
    #Request(createMessage)
    {
        if (!this.#socket)
        {
            return Promise.reject(new CjsRealtimeError(
                "connection_unavailable",
                "Realtime connection is unavailable",
                { retryable: true }
            ));
        }

        const requestId = `client-${++this.#requestSequence}`;
        const message = createMessage(requestId);
        const pending = CjsRealtimeClient.createDeferred();
        const socket = this.#socket;

        this.#pendingRequests.set(requestId, pending);
        pending.timer = setTimeout(() =>
        {
            if (this.#pendingRequests.get(requestId) !== pending)
            {
                return;
            }

            const failure = new CjsRealtimeError(
                "request_timeout",
                "Realtime request timed out",
                {
                    retryable: true,
                    connectionUsable: false,
                    closeCode: 4408
                }
            );

            this.#metrics.requestTimeouts++;
            this.#pendingRequests.delete(requestId);
            this.#generationFailure = failure;
            pending.reject(failure);

            if (this.#socket === socket)
            {
                socket.close(1013, "request_timeout");
            }
        }, this.#requestTimeoutMs);

        try
        {
            this.#Send(message);
        }
        catch (failure)
        {
            const error = CjsRealtimeError.from(failure, {
                code: "send_failed",
                message: "Realtime request could not be sent",
                retryable: true,
                connectionUsable: false,
                closeCode: 1011
            });

            this.#pendingRequests.delete(requestId);
            clearTimeout(pending.timer);
            this.#generationFailure = error;
            pending.reject(error);

            if (!error.connectionUsable && this.#socket === socket)
            {
                socket.close(error.closeCode ?? 1011, error.code);
            }
        }

        return pending.promise;
    }

    /**
     * Dispatches one validated server frame (hello, result, error or event); it
     * runs on a serialized lane, so events reach a subscription in wire order.
     */
    async #ReceiveMessage(text)
    {
        const parsed = CjsRealtimeProtocol.parseText(text, { maxBytes: this.#maxMessageBytes });
        const message = CjsRealtimeProtocol.normalizeServerMessage(parsed);

        if (message.type === "hello")
        {
            if (!this.#hello || this.#hello.settled)
            {
                throw new CjsRealtimeError("unexpected_hello", "Realtime hello was not expected", {
                    connectionUsable: false,
                    closeCode: 1002
                });
            }

            this.#hello.resolve(message);
            return;
        }

        if (message.type === "result")
        {
            const pending = this.#pendingRequests.get(message.requestId);

            if (!pending)
            {
                throw new CjsRealtimeError("unexpected_result", "Realtime result has no request", {
                    connectionUsable: false,
                    closeCode: 1002
                });
            }

            this.#pendingRequests.delete(message.requestId);
            clearTimeout(pending.timer);
            pending.resolve(message);
            return;
        }

        if (message.type === "error")
        {
            const failure = CjsRealtimeError.fromMessage(message);
            const terminal = CjsRealtimeClient.isTerminalFailure(failure);

            if (message.requestId && this.#pendingRequests.has(message.requestId))
            {
                const pending = this.#pendingRequests.get(message.requestId);
                this.#pendingRequests.delete(message.requestId);
                clearTimeout(pending.timer);
                pending.reject(failure);
            }
            else if (!terminal)
            {
                this.#ReportError(failure);
            }

            if (!failure.connectionUsable || terminal)
            {
                this.#generationFailure = failure;
                this.#hello?.reject(failure);
                this.#socket?.close(failure.closeCode ?? 1002, failure.code);
            }

            return;
        }

        if (message.type === "event")
        {
            const subscription = this.#subscriptionsById.get(message.subscriptionId);

            if (!subscription)
            {
                throw CjsRealtimeSubscription.resyncError(
                    "Realtime event references an unknown subscription"
                );
            }

            await subscription.Receive(message);
        }
    }

    /**
     * Reports a message-lane failure and closes the socket unless it came from a
     * consumer callback, which is an application fault rather than a protocol
     * fault.
     */
    #HandleMessageFailure(failure)
    {
        const error = CjsRealtimeError.from(failure);
        const terminal = CjsRealtimeClient.isTerminalFailure(error);

        if (error.code === "resync_required")
        {
            this.#metrics.sequenceGapResyncs++;
        }

        if (!terminal)
        {
            this.#ReportError(error);
        }

        if (error.code !== "consumer_callback_failed")
        {
            this.#generationFailure = error;
            this.#hello?.reject(error);
            this.#socket?.close(error.closeCode ?? 4409, error.code);
        }
    }

    /**
     * Reports an operation-lane failure and closes the socket when the failure
     * left the connection unusable or demands a resync.
     */
    #HandleOperationFailure(failure)
    {
        const error = CjsRealtimeError.from(failure);

        if (error.code === "resync_required")
        {
            this.#metrics.sequenceGapResyncs++;
        }

        this.#ReportError(error);

        if (!error.connectionUsable || error.code === "resync_required")
        {
            this.#generationFailure = error;
            this.#socket?.close(error.closeCode ?? 4409, error.code);
        }
    }

    /**
     * Performs an authenticated GET through the injected fetch, sending the
     * capability as a bearer header with no store caching, and validates the
     * JSON body against the protocol structural limits.
     */
    async #FetchJson(url, { signal = null } = {})
    {
        if (typeof this.#fetch !== "function")
        {
            throw new CjsRealtimeError(
                "fetch_unavailable",
                "fetch is unavailable; inject a standards-compatible function"
            );
        }

        const response = await this.#fetch(url, {
            method: "GET",
            headers: { authorization: `Bearer ${this.#capability}` },
            cache: "no-store",
            signal
        });

        if (!response || typeof response.json !== "function")
        {
            throw new CjsRealtimeError("invalid_response", "Realtime fetch returned an invalid response");
        }

        if (response.ok === false)
        {
            throw new CjsRealtimeError(
                response.status === 401 ? "unauthorized" : "http_error",
                `Realtime HTTP request failed (${response.status ?? "error"})`,
                { retryable: response.status >= 500, statusCode: response.status ?? null }
            );
        }

        const value = await response.json();
        CjsRealtimeProtocol.validateJson(value);
        return value;
    }

    /**
     * Serializes one bounded message onto the current socket. Admission fails
     * before send when the browser's existing buffered bytes plus this frame
     * exceed the configured pressure ceiling.
     */
    #Send(message)
    {
        if (!this.#socket || typeof this.#socket.send !== "function")
        {
            throw new CjsRealtimeError("connection_unavailable", "Realtime socket is unavailable");
        }

        const text = JSON.stringify(message);
        const byteLength = encodeUtf8(text).byteLength;

        if (byteLength > this.#maxMessageBytes)
        {
            throw new CjsRealtimeError(
                "message_too_large",
                "Realtime outbound message exceeds the byte limit",
                { connectionUsable: false, closeCode: 1009 }
            );
        }

        const bufferedAmount = Number.isFinite(this.#socket.bufferedAmount)
            && this.#socket.bufferedAmount > 0
            ? this.#socket.bufferedAmount
            : 0;

        if (bufferedAmount + byteLength > this.#outbound.maximumBufferedBytes)
        {
            this.#metrics.outboundPressure++;
            throw new CjsRealtimeError(
                "outbound_pressure",
                "Realtime outbound pressure limit was reached",
                {
                    retryable: true,
                    connectionUsable: false,
                    closeCode: 1013
                }
            );
        }

        this.#socket.send(text);
    }

    /**
     * Drops all connection-scoped state - subscription IDs, cursors and pending
     * requests - while retaining the desired subscription set for the next
     * connection.
     */
    #ResetGeneration(code)
    {
        this.#subscriptionsById.clear();

        for (const subscription of this.#subscriptions)
        {
            subscription.Reset();
        }

        const failure = new CjsRealtimeError(code, "Realtime connection was interrupted", {
            retryable: true,
            connectionUsable: false
        });

        this.#RejectPendingRequests(failure);
        this.#generationFailure = null;
    }

    /**
     * Throws a retryable connection_unavailable error unless the client is in
     * the ready state.
     */
    #RequireReady()
    {
        if (this.state !== "ready")
        {
            throw new CjsRealtimeError("connection_unavailable", "Realtime client is not ready", {
                retryable: true
            });
        }
    }

    /** Waits for one reconnect delay that Close or capability replacement may cancel. */
    #WaitReconnectDelay(delay)
    {
        return new Promise(resolve =>
        {
            const waiter = {
                timer: null,
                resolve: () =>
                {
                    if (this.#reconnectDelayWaiter !== waiter)
                    {
                        return;
                    }

                    this.#reconnectDelayWaiter = null;
                    resolve();
                }
            };

            waiter.timer = setTimeout(waiter.resolve, delay);
            this.#reconnectDelayWaiter = waiter;
        });
    }

    /** Clears and settles the current reconnect delay, if any. */
    #CancelReconnectDelay()
    {
        const waiter = this.#reconnectDelayWaiter;

        if (!waiter)
        {
            return;
        }

        clearTimeout(waiter.timer);
        waiter.resolve();
    }

    /**
     * Registers a waiter resolved with the hello record on the next ready state
     * and rejected when the client is closed.
     */
    #WaitForReady()
    {
        const ready = CjsRealtimeClient.createDeferred();
        this.#readyWaiters.add(ready);
        return ready.promise;
    }

    /**
     * Settles and clears every outstanding Connect waiter with the current
     * connection.
     */
    #ResolveReadyWaiters(connection)
    {
        for (const ready of this.#readyWaiters)
        {
            ready.resolve(connection);
        }

        this.#readyWaiters.clear();
    }

    /**
     * Fails and clears every outstanding Connect waiter; used for a deliberate
     * close, not for a retryable connection loss.
     */
    #RejectReadyWaiters(failure)
    {
        for (const ready of this.#readyWaiters)
        {
            ready.reject(failure);
        }

        this.#readyWaiters.clear();
    }

    /**
     * Fails every in-flight request, because request IDs are only meaningful
     * within the connection generation that issued them.
     */
    #RejectPendingRequests(failure)
    {
        for (const pending of this.#pendingRequests.values())
        {
            clearTimeout(pending.timer);
            pending.reject(failure);
        }

        this.#pendingRequests.clear();
    }

    /**
     * Serializes caller operations on one lane so subscribe, unsubscribe and
     * command never interleave; the lane itself absorbs rejections and never
     * stalls.
     */
    #QueueOperation(operation)
    {
        if (this.#queuedOperationCount >= this.#outbound.maximumQueuedOperations)
        {
            this.#metrics.outboundPressure++;
            return Promise.reject(new CjsRealtimeError(
                "outbound_pressure",
                "Realtime outbound operation queue is full",
                { retryable: true }
            ));
        }

        this.#queuedOperationCount++;
        const result = this.#operationLane.then(operation);
        const settled = result.finally(() =>
        {
            this.#queuedOperationCount--;
        });

        this.#operationLane = settled.catch(() => {});
        return settled;
    }

    /**
     * Records a changed state and notifies onStateChange, converting a throwing
     * observer into a reported consumer_callback_failed error.
     */
    #SetState(state)
    {
        if (this.state === state)
        {
            return;
        }

        this.state = state;

        if (this.#onStateChange)
        {
            try
            {
                this.#onStateChange(state, this);
            }
            catch (failure)
            {
                this.#ReportError(new CjsRealtimeError(
                    "consumer_callback_failed",
                    "Realtime state callback failed",
                    { cause: failure }
                ));
            }
        }
    }

    /**
     * Delivers an error to onError and swallows anything the observer throws,
     * keeping error reporting isolated from protocol and reconnect state.
     */
    #ReportError(error)
    {
        if (!this.#onError)
        {
            return;
        }

        try
        {
            this.#onError(error, this);
        }
        catch
        {
            // Error observers are isolated from protocol and reconnect state.
        }
    }

}
