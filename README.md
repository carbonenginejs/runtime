# @carbonenginejs/runtime-core

The CarbonEngineJS runtime kernel: CjsLibrary composition root (Tw2Library successor) + CjsResMan/CjsMotherLode resource manager + type registry + the ICjs* service interfaces. Depends only on core-*; every other runtime/engine package depends on this. GPU-free.

Part of the CarbonEngineJS runtime/engine tier (Deno + TypeScript, WebGPU-first).
Ports/adapts from CarbonEngine (https://github.com/carbonengine, MIT); ccpwgl consulted as a reference donor.

## Status

Scaffold only — no implementation yet. Layout: src/ (source; index.ts barrel) and test/ (sibling).

## Provenance

CarbonEngine and Fenris Creations (CCP Games) are named for interoperability and provenance context.
This package's runtime code is CarbonEngineJS original work that ports or adapts CarbonEngine class
structure and behavior, verified against the CarbonEngine C++ source, and mines the ccpwgl WebGL port
as a reference donor. Not affiliated with or endorsed by CCP Games.
