# Celestial rendering

Status: Experimental
Scope: Trinity planet, moon, sun and lensflare rendering
Audience: Runtime integrators
Summary: Explains celestial scene ownership, camera scaling and required application data.

Planets, moons and sun discs use `EvePlanet`. Their surface, cloud, atmosphere,
aurora and particle layers are ordinary `effectChildren`. A loaded planet
template is the planet object itself; do not place it inside another planet.
`EveEffectRoot2.Initialize` assigns the root as the owner of existing children,
including nested containers, before controllers run.

## Placement and depth

Supply a radius in metres from application data. Template radii are not a
reliable source. Pixel-diameter LOD can otherwise suppress the whole object.
The scene selects LOD from the previous visibility estimate, preserving
Carbon's ordering; the first frame may have no surface draw.

The scene defaults both model and camera scales to one million. Surface
children receive the world transform scaled by `1 / planetScale`, including
translation. The camera retains its orientation and scales only translation
by `1 / planetCameraScale`. `RenderPlanets` uses near/far clips of 0.01 and
100,000, draws depth, opaque, decal, transparent and additive batches, and
restores the ordinary view, projection and per-frame constants afterwards.

Background lensflare occlusion queries run against planet depth before the
background pass clears it. A planet's `zOnlyModel` is a separate `EveChildMesh`
in ordinary world units, drawn in the main depth pass. It requires displayed,
high-LOD state but has no additional `minScreenSize` test.

## Sun disc, light and glare

The sun disc belongs in `scene.planets`. Assign the same translation-curve
object to the sun planet and `scene.sunBall`; identity selects the sun for
volumetric angle calculation and excludes it from planet shadow casters.
Sun light travels along the normalized, negated ball position.

An `EveLensflare` belongs in `scene.lensflares`. Give it the sun's position
curve in metres so its update can calculate Carbon's distance falloff:
`1.5 / log(distanceMetres / 0.1495978707e12 + 2.71)`. Without a position curve,
the native fallback scale is one. Both global and per-object glare constants
receive the calculated scale. Loaded controllers link during initialization;
the notifying controller list links inserted controllers and replays variables.
The owner must call `Destroy` when retiring a flare to unlink controllers and
release its occlusion slots.

## Application responsibilities and limits

Template selection, radius, position, height-map inputs, atmosphere selection,
population and aurora policy belong to the application. The runtime has no
SDE dependency and does not synthesize a height-map bake. All such visual
layers remain authored children and effects.

CPU tests cover composition, ownership, LOD, batching order, camera restoration,
background depth-query timing, shadow selection and lensflare lifecycle.
The celestial integration has not yet been qualified by a GPU render. Shader
translation alone does not establish pipeline or visual correctness. Ordinary
materials are supported by the new planet pass; Carbon's material-replacement
debug visualizers remain outside it.

The native sun-angle calculation is intentionally unguarded when distance is
zero or smaller than half the sun radius. It can produce `NaN` in those cases.
