# Eve runtime classes

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/eve`
Audience: Users and integrators
Summary: Catalogs promoted Eve runtime classes with renderer-neutral behavior.

<!-- class:EvePlanet -->
## `EvePlanet`

Represents a planet scene object with CPU-side visibility state for its depth-only child mesh.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/spaceObject/planet/EvePlanet.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveLensflare -->
## `EveLensflare`

Represents a lens-flare graph with CPU-side visibility and controller state.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/effect/lensflare/EveLensflare.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveLineSet -->
## `EveLineSet`

Stores editable tactical line records before renderer submission.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/ui/lines/EveLineSet.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveTacticalTrails -->
## `EveTacticalTrails`

Tracks tactical trail objects without requiring a graphics device.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/ui/tacticalOverlay/EveTacticalTrails.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveComponentCollection -->
## `EveComponentCollection`

Stores entities belonging to one Eve component type.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/scene/components/EveComponentCollection.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveComponentRegistry -->
## `EveComponentRegistry`

Indexes Eve entities and their component collections for scene processing.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/scene/components/EveComponentRegistry.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveShip2 -->
## `EveShip2`

A ship space object: booster drive, speed state, and ship shader data.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/spaceObject/EveShip2.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveSpherePin -->
## `EveSpherePin`

A UI sphere pin: authored SRT placement plus the pin constant record.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/ui/EveSpherePin.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveChildBulletStorm -->
## `EveChildBulletStorm`

Locator-driven bullet-storm child: instances, target blobs, and the clip-sphere state machine.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/child/EveChildBulletStorm.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:IEveSpaceObject2ParentData -->
## `IEveSpaceObject2ParentData`

The per-frame parent state a space object hands to its attachments.

- Export: `@carbonenginejs/runtime-trinity/eve`
- Source: `src/eve/spaceObject/IEveSpaceObject2ParentData.js`
- Visibility: Public
- Kind: CarbonEngine
