# Consume provider-neutral chat

Status: Evolving
Scope: `@carbonenginejs/runtime/tools/chat`
Audience: Browser application authors and integrators
Summary: Shows targeted room listening, rich media consumption, cleanup, and browser-local filtering.

## Purpose

The chat facade gives browser applications one room-listening API across
provider integrations. Suppliers may expose different features; the shared
contract preserves available hierarchy, rich message fragments, and
presentation assets without claiming feature parity.

The browser never joins supplier networks or resolves supplier asset URLs.
Those responsibilities remain on the server.

## Listen to rooms

Create the realtime client first, then request each exact room:

```js
import {
    CjsChatClient
} from "@carbonenginejs/runtime/tools/chat";
import {
    CjsRealtimeClient
} from "@carbonenginejs/runtime/tools/realtime";

const realtime = new CjsRealtimeClient({
    url: "wss://realtime.example.test/v1/realtime",
    capability
});
const chat = new CjsChatClient({
    realtimeClient: realtime,
    serviceId: "primary-chat"
});
const room = chat.ListenRoom({
    provider: "twitch",
    kind: "channel",
    login: "example-channel"
}, {
    onMessage(message)
    {
        renderFragments(message.fragments);
    }
});

await realtime.Connect();
await room.WhenActive();
```

One realtime connection may own several independent room handles. `Close`
releases only that listener; the server decides whether other clients still
hold the shared upstream room.

```js
await room.Close();
realtime.Close();
```

## Hierarchy and room assets

A selector identifies a provider plus a room ID or login. Optional
`integrationId`, `space`, and `parentRoomId` fields preserve deeper supplier
hierarchies such as:

```text
provider integration -> server or space -> room or channel -> chat
```

After `WhenActive`, `GetRoom()` returns server-resolved room metadata. When the
supplier exposes presentation assets, `room.assets.icon.url` contains its
ready-to-render HTTPS icon URL. A containing server or guild can similarly
expose `room.space.assets.icon.url`.

## Rich messages

Message callbacks receive the complete provider-neutral payload. Ordered
fragments may include text, Unicode emoji, supplier emotes, and hosted media.
An emote asset can expose:

```js
const { url, contentType, animated } = fragment.emote.asset;
```

Use the supplied URL directly. Browser code must not construct supplier CDN
URLs from emote IDs. Provider-specific data remains available under message
extensions when the common contract has no equivalent field.

## Browser-local blocks

Block lists are optional and empty by default:

```js
import {
    CjsChatBlockList,
    CjsChatClient
} from "@carbonenginejs/runtime/tools/chat";

const chat = new CjsChatClient({
    realtimeClient: realtime,
    blockList: new CjsChatBlockList({
        terms: [{
            text: "spoiler",
            provider: "twitch",
            roomLogin: "example-channel"
        }],
        users: [{
            provider: "twitch",
            id: "provider-user-id"
        }]
    })
});
```

Terms are literal case-insensitive substrings and may be global or scoped.
User selectors prefer stable IDs and may fall back to logins. Local blocks
only suppress callbacks from that browser facade. Server policy remains
authoritative because it can suppress a message before publication.
Provider-managed block lists are separate capabilities and are not synchronized
by this helper.

## Related documentation

- [Realtime guide](realtime.md)
- [Architecture and boundaries](../architecture.md)
- [API reference](../reference/api.md)
- [Chat class catalog](../reference/classes/chat.md)
