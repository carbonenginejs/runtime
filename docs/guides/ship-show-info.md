# Ship Show Info logic

Status: Evolving  
Scope: `@carbonenginejs/tools-browser/ship-show-info`  
Audience: Browser application authors, UI implementers, and renderer-adapter authors  
Summary: Coordinates provider-neutral Show Info records and an injected renderer without choosing markup, styling, transport authority, or graphics engine.

## Purpose

The `./ship-show-info` subpath is the reusable logic below an EVE-like Ship
Show Info window. It owns request lifecycle, newest-request-wins ship
selection, lazy panel reads, optional source decoration, mutable snapshots,
and one renderer contract.

It imports no DOM API, component, stylesheet, theme, demo entry point,
ccpwgl bundle, TrinityJS engine, or tools-core implementation. A consumer can
draw an EVE-like window, a Skindr-native component, or no UI at all over the
same logic.

## Source contract

The required method remains asynchronous:

```text
FetchShip({ typeID, regionID, characterID, signal }) -> Promise<ship>
```

Optional panel methods are:

```text
FetchPrice(request)
FetchOverview(request)
FetchAttributes(request)
FetchFitting(request)
FetchSkills(request)
FetchVariations(request)
FetchIndustry(request)
FetchSkins(request)
```

Missing optional methods and `null` answers remain missing enrichment. The
controller does not synthesize display data or convert absence into a fake
value.

`CjsESIShipShowInfoMemorySource` accepts caller-owned JavaScript records or
parsed JSON. The package ships no real EVE hull, skill, skin, industry, or
market dataset.

## Renderer contract

The controller accepts an optional renderer with this structural contract:

```text
Mount(container)
FetchShip({ ship, dna, signal })
FetchSkin({ ship, skin, signal })
SelectPanel({ panel, ship, signal })
Destroy()
```

`FetchShip` retains its Promise contract and is awaited before the controller
reports the hull as ready. `FetchSkin(null)` returns presentation to the base
hull. `SelectPanel` is optional and lets an adapter apply camera poses without
placing camera or engine knowledge in the controller.

The renderer is injected. This package does not create a ccpwgl instance,
load an engine bundle, or acquire a WebGL context. An application that already
owns a shared viewport supplies an adapter that mounts or relocates that
viewport and returns ownership in `Destroy()`.

## Controller example

```js
import {
    CjsESIShipShowInfoController,
    CjsESIShipShowInfoMemorySource
} from "@carbonenginejs/tools-browser/ship-show-info";

const shipSource = new CjsESIShipShowInfoMemorySource({
    records: [ {
        ship: {
            typeID: 7001,
            name: "Synthetic Hull",
            dna: "synthetic_hull:base:race"
        },
        overview: {
            description: "Caller-owned public description"
        }
    } ]
});
const controller = new CjsESIShipShowInfoController({
    shipSource,
    renderer: callerRenderer
});

await controller.Mount(callerSurface);
await controller.Open({ typeID: 7001, regionID: 90000001 });
const overview = await controller.SelectPanel("overview");
```

## Optional composition

`CjsESIShipShowInfoMarketSource` decorates another source with optional
regional-price enrichment. Market failures do not erase otherwise public
Show Info records.

`CjsESIShipShowInfoSessionSource` decorates another source with an external
viewer identity and optional trained-skill profile. Authorization remains
provider-owned. A character identifier supplied to the wrapped public source
is context, never proof of identity.

The session decorator preserves distinct states:

- anonymous: public requirements are available but no character comparison
  exists;
- unavailable or unsupported: the identity or private skill provider cannot
  answer;
- reauthorization required: the provider identifies the missing scope and may
  supply a login action;
- available automatic profile: trained skills belong to the authenticated
  character.

Manual skill profiles belong in an injected source/provider. The controller
does not privilege ESI over caller data. A future shared provider layer may
select SDE, ESI, caller JSON, IndexedDB, memory, or a combination through
declared authority rather than hidden fallback.

## Presentation boundary

The EVE-like window, accessibility behavior, CSS, icons, camera-pose catalog,
and catalogue/standalone composition remain a separate planned presentation
export. The concrete tools-core-to-record mapper also remains separate: a
browser client may speak its HTTP contract but must not import tools-core
server code or credential/session internals.

## Related documentation

- [Browser demo hosting](demos.md)
- [Regional-market logic](market.md)
- [Architecture and boundaries](../architecture.md)
- [Current API reference](../reference/api.md)
- [Ship Show Info class catalog](../reference/classes/ship-show-info.md)
