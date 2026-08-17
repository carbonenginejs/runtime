# Regional-market logic

Status: Evolving
Scope: `@carbonenginejs/tools-browser/market`
Audience: Browser application authors and market UI implementers
Summary: Reads, normalizes, and analyses regional-market records without choosing markup or styling.

## Purpose

The `./market` subpath is the reusable logic below Market Details and other
regional-market presentations. It owns browser HTTP clients, provider-shape
adaptation, direct public ESI translation, caller-owned memory records, and
presentation-neutral order/history calculations.

It imports no DOM API, component, stylesheet, theme, or demo entry. An EVE-like
window may consume this subpath, while another product can render the same
records with entirely different components.

## Sources

All sources expose the same asynchronous shape:

```text
GetRegions({ selectedRegionID, signal })
BrowseTypes({ signal })
SearchTypes(query, { regionID, signal })
GetType(typeID, { regionID, signal })
GetOrders({ typeID, regionID, signal })
GetHistory({ typeID, regionID, signal })
```

The source implementations serve different authorities:

- `CjsESIMarket` reads a compatible regional-market HTTP service and exposes
  individual plus combined reads.
- `CjsESIMarketBackendSource` adapts that client's positional methods to the
  source record above.
- `CjsESIMarketSource` translates direct public ESI wire records. It is useful
  for public browser tools and diagnostics; a same-origin service remains the
  normal choice when shared caching or policy is required.
- `CjsESIMarketMemorySource` serves caller-owned records supplied as JavaScript
  or parsed JSON and performs no transport.

Every class that stores an injected Fetch implementation binds it to
`globalThis`. This preserves the required browser receiver even though the
implementation is later called as an instance property.

## Caller-owned data

The package contains no region, type, order, or history dataset. Callers may
supply an initial type and region shelf to `CjsESIMarketSource`, or complete
records to `CjsESIMarketMemorySource`:

```js
import {
    CjsESIMarketMemorySource,
    analyzeOrders
} from "@carbonenginejs/tools-browser/market";

const source = new CjsESIMarketMemorySource({
    regions: [ { regionID: 90000001, name: "Test Region" } ],
    types: [ { typeID: 7001, name: "Test Commodity" } ],
    orders: [
        { orderID: 1, typeID: 7001, regionID: 90000001, side: "sell", price: 12 },
        { orderID: 2, typeID: 7001, regionID: 90000001, side: "buy", price: 10 }
    ]
});

const orders = await source.GetOrders({
    typeID: 7001,
    regionID: 90000001
});
const summary = analyzeOrders(orders);
```

Returned records and arrays remain mutable. The memory source copies its
caller input and each answer so a UI can sort, annotate, or group a result
without changing the provider's next answer.

## Presentation boundary

Formatting and chart-geometry helpers return text or plain records; they do
not create elements. Market window components, accessibility behavior, CSS,
and demo routing remain a separate planned presentation export. Until that
export lands, consumers should import `./market` directly and own their UI.

## Related documentation

- [Browser demo hosting](demos.md)
- [Architecture and boundaries](../architecture.md)
- [Current API reference](../reference/api.md)
- [Regional-market class catalog](../reference/classes/market.md)
