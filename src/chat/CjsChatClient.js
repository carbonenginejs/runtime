import { CjsRealtimeClient } from "../realtime/CjsRealtimeClient.js";
import { CjsChatBlockList } from "./CjsChatBlockList.js";
import { CHAT_TOPICS, CjsChatContract } from "./CjsChatContract.js";
import { CjsChatRoomSubscription } from "./CjsChatRoomSubscription.js";

/** Requests provider-neutral chat rooms over one browser realtime client. */
export class CjsChatClient
{

    #realtime;

    constructor({
        realtimeClient,
        serviceId = "primary-chat",
        blockList = null
    } = {})
    {
        if (!(realtimeClient instanceof CjsRealtimeClient))
        {
            throw new TypeError("CjsChatClient requires a CjsRealtimeClient");
        }

        this.serviceId = serviceId;
        this.blockList = blockList instanceof CjsChatBlockList
            ? blockList
            : new CjsChatBlockList(blockList ?? {});
        this.#realtime = realtimeClient;
    }

    /** Requests one hierarchical chat room and returns its disposable listener. */
    ListenRoom(roomValue, {
        onMessage = null,
        onStatus = null,
        onEvent = null
    } = {})
    {
        for (const [ label, callback ] of [
            [ "onMessage", onMessage ],
            [ "onStatus", onStatus ],
            [ "onEvent", onEvent ]
        ])
        {
            if (callback !== null && typeof callback !== "function")
            {
                throw new TypeError(`${label} must be a function or null`);
            }
        }

        const room = CjsChatContract.normalizeRoomSelector(roomValue);

        const topics = [ CHAT_TOPICS.MESSAGE_RECEIVED ];

        if (onStatus !== null || onEvent !== null)
        {
            topics.push(CHAT_TOPICS.STATUS_CHANGED);
        }

        let handle = null;
        const subscription = this.#realtime.Subscribe({
            serviceId: this.serviceId,
            topics,
            target: { room },
            onEvent: async event =>
            {
                if (event.topic === CHAT_TOPICS.MESSAGE_RECEIVED
                    && this.blockList.BlocksMessage(event.payload.data))
                {
                    return;
                }

                if (event.topic === CHAT_TOPICS.MESSAGE_RECEIVED && onMessage)
                {
                    await onMessage(event.payload.data, event, handle);
                }
                else if (event.topic === CHAT_TOPICS.STATUS_CHANGED && onStatus)
                {
                    await onStatus(event.payload.data, event, handle);
                }

                if (onEvent)
                {
                    await onEvent(event, handle);
                }
            }
        });

        handle = new CjsChatRoomSubscription({
            client: this.#realtime,
            room,
            subscription
        });

        return handle;
    }

}
