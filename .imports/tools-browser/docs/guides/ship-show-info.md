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
draw an EVE-like window, an application-native component, or no UI at all over the
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

`CjsShipShowInfoToolsCoreSource` is the browser transport adapter for public,
composed tools-core answers. It resolves `latest` once, pins the exact
`builds.sde` value for the request lifetime, and never reads inspection-table
routes. Public hull information is independent of sign-in. Optional fields
such as manufacturers and quotations remain absent when the composed answer
does not contain them.

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
    CjsShipShowInfoController,
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
const controller = new CjsShipShowInfoController({
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

The optional `./ship-show-info/ui` export renders the EVE-like window over a
controller. Its independently imported `./ship-show-info/ui.css` stylesheet
owns feature layout. The window creates a controller only when the caller does
not inject one; it never calls `FetchShip` or panel source methods itself.

```js
import {
    TnyShipShowInfoWindow
} from "@carbonenginejs/tools-browser/ship-show-info/ui";
import "@carbonenginejs/tools-browser/ship-show-info/ui.css";
```

The published 0.1.x `CjsESIShipShowInfoController` and
`CjsESIShipShowInfoUIWindow` exports remain temporary aliases of
`CjsShipShowInfoController` and `TnyShipShowInfoWindow`. The canonical names
reflect that neither class is bound to ESI.

UI artwork resolves from the constructor's `uiResourceRoot`. Its default is
`/eve/latest/resources/ui/texture/`; a standalone host may provide an absolute
permitted asset service root. The package ships no EVE font, icon, or texture.

Camera views and automatic rotation remain optional renderer-adapter methods.
The window contains no camera implementation or pose catalog belonging to an
engine. `TnyShipShowInfoDemo` in `./demo-apps` composes this same window for
direct mounting, while `CreateShipShowInfoDemoDefinition` supplies the same
instance shape to `TnyDemoHost`.

The concrete tools-core-to-record mapper remains separate: a browser client
may speak its HTTP contract but must not import tools-core server code or
credential/session internals.

`CjsShipShowInfoToolsCoreSessionSource` adapts the optional stored-grant
identity and skill routes. Compose it through
`CjsESIShipShowInfoSessionSource`; when no grant exists, the public hull and
requirements still load and only character-specific comparisons are hidden.
The image-server portrait needs a character ID but no additional image scope.

`TnyShipShowInfoImageRenderer` is the zero-WebGL fallback used by the
standalone example. It decodes a replacement image before swapping it into
the surface, so a current preview is not briefly replaced by a partial image.
Applications with ccpwgl, TrinityJS, or another runtime inject their own
renderer under the same contract.

The window emits `shipshowinfochange` after a hull opens and
`shipshowinfopanelchange` after a panel renders. Its copy-link, previous, and
next controls emit the cancelable `shipshowinfowindowaction` event before using
the browser clipboard or history defaults, so an embedding host can take over
those actions without forking the presentation.

## Standalone example

`examples/ship-show-info/` uses composed tools-core data and the image
fallback by default. On a local host it expects the caller-owned tools-core
service at port `5510`; override it with `?toolsCoreURL=http://host:port`.
Useful query fields are `typeID`, `regionID`, `panel`, `session=off`, and
`resourceRoot`. The standalone page keeps `typeID`, `regionID`, and `panel` in
the address. Selecting a variation creates a hull-history entry; the window's
previous and next controls restore both the hull and its selected panel.

`?mode=synthetic` explicitly switches to caller-owned memory records. It
proves that the window and renderer contract load without auth, ESI, an SDE
service, or a graphics engine; it is not a hidden fallback from provider
failure.

## Related documentation

- [Browser demo hosting](demos.md)
- [Regional-market logic](market.md)
- [Architecture and boundaries](../architecture.md)
- [Current API reference](../reference/api.md)
- [Ship Show Info class catalog](../reference/classes/ship-show-info.md)
