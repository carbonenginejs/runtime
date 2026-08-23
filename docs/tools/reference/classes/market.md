# Regional-market class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/tools/market`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for maintained regional-market classes.

<!-- class:CjsESIMarket -->
## `CjsESIMarket`

Provides a DOM-free client for a compatible regional-market HTTP backend.

- Export: `@carbonenginejs/runtime/tools/market`
- Source: `src/tools/market/CjsESIMarket.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsMarketController -->
## `CjsMarketController`

Coordinates regional market selection, search, cancellation, and mutable state without owning presentation.

- Export: `@carbonenginejs/runtime/tools/market`
- Source: `src/tools/market/CjsMarketController.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsESIMarketBackendSource -->
## `CjsESIMarketBackendSource`

Adapts the app-facing market client to the standalone UI source contract.

- Export: `@carbonenginejs/runtime/tools/market`
- Source: `src/tools/market/CjsESIMarketBackendSource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsESIMarketMemorySource -->
## `CjsESIMarketMemorySource`

Provides deterministic caller-owned market records without transport or UI.

- Export: `@carbonenginejs/runtime/tools/market`
- Source: `src/tools/market/CjsESIMarketMemorySource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsESIMarketSource -->
## `CjsESIMarketSource`

Provides a direct browser adapter for ESI's public market and universe routes.

- Export: `@carbonenginejs/runtime/tools/market`
- Source: `src/tools/market/CjsESIMarketSource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TnyMarketHistoryChart -->
## `TnyMarketHistoryChart`

Renders normalized market history as an optional browser SVG chart.

- Export: `@carbonenginejs/runtime/tools/market/ui`
- Source: `src/tools/market/ui/TnyMarketHistoryChart.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TnyMarketWindow -->
## `TnyMarketWindow`

Renders the optional EVE-like Market Details window over the shared controller.

- Export: `@carbonenginejs/runtime/tools/market/ui`
- Source: `src/tools/market/ui/TnyMarketWindow.js`
- Visibility: Public
- Kind: CarbonEngineJS
