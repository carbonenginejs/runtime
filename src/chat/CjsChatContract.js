import { CjsRealtimeProtocol } from "../realtime/CjsRealtimeProtocol.js";

/** Stable chat topics consumed by the browser chat facade. */
export const CHAT_TOPICS = Object.freeze({
    MESSAGE_RECEIVED: "chat.message.received",
    STATUS_CHANGED: "chat.status.changed"
});

const PROVIDER_PATTERN = /^[a-z][a-z0-9-]{0,63}$/u;
const KIND_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/u;

/** Validates provider-neutral room selectors and browser-local term and user blocks. */
export class CjsChatContract
{

    /** Normalizes one provider room selector without discarding hierarchy. */
    static normalizeRoomSelector(value)
    {
        if (!CjsRealtimeProtocol.isRecord(value))
        {
            throw new TypeError("Chat room selector must be an object");
        }

        const provider = CjsChatContract.normalizeProvider(value.provider);
        const integrationId = CjsChatContract.normalizeNullableString(
            value.integrationId ?? null,
            "integrationId",
            256
        );
        const id = CjsChatContract.normalizeNullableString(value.id ?? null, "id", 256);
        const login = CjsChatContract.normalizeNullableString(
            value.login ?? null,
            "login",
            256
        );

        if (id === null && login === null)
        {
            throw new TypeError("Chat room selector requires id or login");
        }

        const room = {
            provider,
            integrationId,
            space: CjsChatContract.normalizeSpace(value.space ?? null),
            id,
            kind: value.kind === null || value.kind === undefined
                ? null
                : CjsChatContract.normalizeKind(value.kind, "kind"),
            parentRoomId: CjsChatContract.normalizeNullableString(
                value.parentRoomId ?? null,
                "parentRoomId",
                256
            ),
            login
        };

        return CjsRealtimeProtocol.freezeJson(room);
    }

    /** Normalizes one literal blocked-term selector and its optional room scope. */
    static normalizeTermSelector(value)
    {
        const candidate = typeof value === "string" ? { text: value } : value;

        if (!CjsRealtimeProtocol.isRecord(candidate))
        {
            throw new TypeError("Chat term selector must be a string or object");
        }

        const provider = candidate.provider === null
            || candidate.provider === undefined
            ? null
            : CjsChatContract.normalizeProvider(candidate.provider);
        const integrationId = CjsChatContract.normalizeNullableString(
            candidate.integrationId ?? null,
            "term selector.integrationId",
            256
        );
        const spaceId = CjsChatContract.normalizeNullableString(
            candidate.spaceId ?? null,
            "term selector.spaceId",
            256
        );
        const roomId = CjsChatContract.normalizeNullableString(
            candidate.roomId ?? null,
            "term selector.roomId",
            256
        );
        const roomLogin = CjsChatContract.normalizeNullableString(
            candidate.roomLogin ?? null,
            "term selector.roomLogin",
            256
        );

        if (provider === null
            && [ integrationId, spaceId, roomId, roomLogin ].some(item => item !== null))
        {
            throw new TypeError("Scoped chat term selector requires a provider");
        }

        return CjsRealtimeProtocol.freezeJson({
            provider,
            integrationId,
            spaceId,
            roomId,
            roomLogin,
            text: CjsChatContract.normalizeString(
                candidate.text,
                "term selector.text",
                512
            ).toLowerCase()
        });
    }

    /** Tests a literal term against message text within its optional room scope. */
    static matchesTermBlock(selectorValue, roomValue, textValue)
    {
        const selector = CjsChatContract.normalizeTermSelector(selectorValue);
        const room = CjsChatContract.normalizeRoomSelector(roomValue);
        const text = CjsChatContract.normalizeString(
            textValue,
            "block candidate text",
            16384
        ).toLowerCase();

        return (selector.provider === null || selector.provider === room.provider)
            && (selector.integrationId === null
                || selector.integrationId === room.integrationId)
            && (selector.spaceId === null || selector.spaceId === room.space?.id)
            && (selector.roomId !== null
                ? selector.roomId === room.id
                : selector.roomLogin === null
                    || selector.roomLogin.toLowerCase() === room.login?.toLowerCase())
            && text.includes(selector.text);
    }

    /** Normalizes one provider user block selector. */
    static normalizeUserSelector(value)
    {
        if (!CjsRealtimeProtocol.isRecord(value))
        {
            throw new TypeError("Chat user selector must be an object");
        }

        const id = CjsChatContract.normalizeNullableString(value.id ?? null, "user.id", 256);
        const login = CjsChatContract.normalizeNullableString(
            value.login ?? null,
            "user.login",
            256
        );

        if (id === null && login === null)
        {
            throw new TypeError("Chat user selector requires id or login");
        }

        return CjsRealtimeProtocol.freezeJson({
            provider: CjsChatContract.normalizeProvider(value.provider),
            integrationId: CjsChatContract.normalizeNullableString(
                value.integrationId ?? null,
                "user.integrationId",
                256
            ),
            id,
            login
        });
    }

    /** Tests a user block using stable user ID before login fallback. */
    static matchesUserBlock(selectorValue, roomValue, authorValue)
    {
        const selector = CjsChatContract.normalizeUserSelector(selectorValue);
        const room = CjsChatContract.normalizeRoomSelector(roomValue);

        if (!CjsRealtimeProtocol.isRecord(authorValue))
        {
            throw new TypeError("Chat block candidate author must be an object");
        }

        const authorId = CjsChatContract.normalizeNullableString(
            authorValue.id ?? null,
            "author.id",
            256
        );
        const authorLogin = CjsChatContract.normalizeNullableString(
            authorValue.login ?? null,
            "author.login",
            256
        );

        return selector.provider === room.provider
            && (selector.integrationId === null
                || selector.integrationId === room.integrationId)
            && (selector.id !== null
                ? selector.id === authorId
                : selector.login?.toLowerCase() === authorLogin?.toLowerCase());
    }

    /** Normalizes an optional server, guild, or equivalent room container. */
    static normalizeSpace(value)
    {
        if (value === null)
        {
            return null;
        }

        if (!CjsRealtimeProtocol.isRecord(value))
        {
            throw new TypeError("Chat room selector space must be an object or null");
        }

        return {
            id: CjsChatContract.normalizeString(value.id, "space.id", 256),
            kind: CjsChatContract.normalizeKind(value.kind, "space.kind"),
            login: CjsChatContract.normalizeNullableString(
                value.login ?? null,
                "space.login",
                256
            ),
            displayName: CjsChatContract.normalizeNullableString(
                value.displayName ?? null,
                "space.displayName",
                512
            )
        };
    }

    /** Normalizes a provider identifier. */
    static normalizeProvider(value)
    {
        if (typeof value !== "string" || !PROVIDER_PATTERN.test(value))
        {
            throw new TypeError("Chat room selector provider is invalid");
        }

        return value;
    }

    /** Normalizes a provider-neutral hierarchy kind. */
    static normalizeKind(value, label)
    {
        if (typeof value !== "string" || !KIND_PATTERN.test(value))
        {
            throw new TypeError(`Chat room selector ${label} is invalid`);
        }

        return value;
    }

    /** Normalizes a required bounded chat string. */
    static normalizeString(value, label, maximum)
    {
        if (typeof value !== "string" || value.length < 1 || value.length > maximum)
        {
            throw new TypeError(`Chat ${label} must be a bounded string`);
        }

        return value;
    }

    /** Normalizes an optional bounded chat string. */
    static normalizeNullableString(value, label, maximum)
    {
        return value === null
            ? null
            : CjsChatContract.normalizeString(value, label, maximum);
    }

}
