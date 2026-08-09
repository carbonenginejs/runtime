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

<!-- class:Allign -->
## `Allign`

A steering behaviour that pulls each drone's acceleration toward the average acceleration direction of its nearby neighbours, recomputing the pull force on a throttled schedule and reusing it between refreshes.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/Allign.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ApproachGroup -->
## `ApproachGroup`

A steering behaviour that pulls each drone toward the centroid of its nearby neighbours, recomputing the pull force on a throttled schedule and reusing it between refreshes.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/ApproachGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BackAndForth -->
## `BackAndForth`

A steering behaviour that shuttles each drone between seek and deliver locators, slowing on approach, snapping its facing, and triggering effects on arrival.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/BackAndForth.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BehaviorGroup -->
## `BehaviorGroup`

Owns a group of drone agents, running its priority-ordered behaviours each frame to integrate their acceleration, velocity, orientation and position, and managing their count, visibility, lighting and rendering.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/BehaviorGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BehaviorGroupBooster -->
## `BehaviorGroupBooster`

A drone-group component that builds and drives the group's shared booster and ambient or halo flare effects and contributes their point light to the scene.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/BehaviorGroupBooster.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CollisionAvoidance -->
## `CollisionAvoidance`

Drone behavior that pushes agents away from the centre of every exclusion volume they intersect, weighted by the volume's intensity at the agent.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/CollisionAvoidance.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:DroneAgent -->
## `DroneAgent`

DroneAgent (eve/child/behaviors) - generated from schema shapeHash c50899e8....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/DroneAgent.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:DroneAvoidance -->
## `DroneAvoidance`

A steering behaviour that pushes each drone away from its nearby neighbours, blended with its current velocity direction, to keep agents from clustering or overlapping.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/DroneAvoidance.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveKDdroneManagementTree -->
## `EveKDdroneManagementTree`

A spatial index that builds and incrementally rebalances a k-d tree over a group's drone agents and answers nearest-neighbour and multi-radius range queries against it.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/EveKDdroneManagementTree.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:FollowASpline -->
## `FollowASpline`

A steering behaviour that pulls unassigned drones into spline tunnel entrances and steers locked drones along their assigned tunnel's points toward the exit.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/FollowASpline.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Formation -->
## `Formation`

A steering behaviour that detects when a drone group's motion has converged, organises the agents into a rotating slot grid, and pulls each agent toward its assigned slot.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/Formation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:InclusionVolume -->
## `InclusionVolume`

Drone behavior that pulls agents back toward the inclusion volumes once they drift into the falloff shell; agents fully inside feel no force.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/InclusionVolume.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Inertia -->
## `Inertia`

A steering behaviour that smooths each agent's acceleration by rotating it toward the previous frame's direction at a limited angular speed and blending its magnitude toward the desired value.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/Inertia.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ProcessLifetime -->
## `ProcessLifetime`

ProcessLifetime (eve/child/behaviors) - generated from schema shapeHash 1fd3ebfa....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/lifecycle/ProcessLifetime.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ProcessLifetimeData -->
## `ProcessLifetimeData`

Per-agent scratch record for the ProcessLifetime behavior: which tunnel the agent is assigned, how far along that tunnel it is, and whether it has spawned or already used its entry and exit tunnels.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/lifecycle/ProcessLifetimeData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:PlayFX -->
## `PlayFX`

A steering-group behaviour that clones, aims, and starts or stops a firing effect on each drone as it arrives at and departs from its target.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/PlayFX.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SeekTarget -->
## `SeekTarget`

A steering behaviour that assigns drones to repair locators on a target ship, splitting the target's bounding box into buckets so damage-seeking agents distribute evenly across it.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/SeekTarget.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SpawnDrones -->
## `SpawnDrones`

A steering behaviour that populates and repopulates a drone group's agents, either regenerating a jittered spawn grid or spawning agents by count on a schedule or one-shot trigger.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/SpawnDrones.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SplineTunnel -->
## `SplineTunnel`

SplineTunnel (eve/child/behaviors) - generated from schema shapeHash d53f1701....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/tunnels/SplineTunnel.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SplineTunnelGroup -->
## `SplineTunnelGroup`

SplineTunnelGroup (eve/child/behaviors) - generated from schema shapeHash da595535....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/tunnels/SplineTunnelGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SplineTunnelPoint -->
## `SplineTunnelPoint`

SplineTunnelPoint (eve/child/behaviors) - generated from schema shapeHash da3b5246....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/tunnels/SplineTunnelPoint.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Wander -->
## `Wander`

Drone behavior that adds a per-agent Perlin-noise wander force seeded from the agent's lifetime and id, so each drone drifts on its own path.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/behaviors/Wander.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildAudio -->
## `EveChildAudio`

Space-object child that owns a positional audio emitter and keeps its position and orientation tracking the child's world transform.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildAudio.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildBehaviorSystem -->
## `EveChildBehaviorSystem`

A child that drives behaviour groups - swarms, drones and the like - from its own placement under the hull.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildBehaviorSystem.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildCloud2 -->
## `EveChildCloud2`

A volumetric cloud entity that renders as a raymarched unit-cube volume with its own lightmap, shadow map and lighting, and can also contribute reflection batches.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildCloud2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildContainer -->
## `EveChildContainer`

Space-object child that groups other children under one transform, owning their curve sets, controllers, observers, lights, attachments and transform modifiers, and gating them on a display-quality filter.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildContainer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildEffectPropagator -->
## `EveChildEffectPropagator`

EveChildEffectPropagator (eve/child) - generated from schema shapeHash 0f2a96e8....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildEffectPropagator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildExplosion -->
## `EveChildExplosion`

A container child that sequences and spawns local and global explosion instances over time from authored transforms and delays.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildExplosion.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildFogVolume -->
## `EveChildFogVolume`

Space-object child that contributes a prioritized froxel fog settings override, its strength driven by how deeply the camera sits inside the volumes it owns.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildFogVolume.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInheritProperties -->
## `EveChildInheritProperties`

The SOF colour set a space object hands down to its children: one colour per named material slot (Primary, Hull, Booster, State0, ...) in a fixed order.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildInheritProperties.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstanceContainer -->
## `EveChildInstanceContainer`

A child that instantiates a source template across a list of authored or locator-driven transforms, forwarding controller and registration calls to the instances.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildInstanceContainer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstancedMesh -->
## `EveChildInstancedMesh`

One geometry-and-areas record inside an EveChildInstancedMeshes child, holding its instance placements, per-instance world cull spheres, instance flags and manager registration handles.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildInstancedMeshes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstancedMeshArea -->
## `EveChildInstancedMeshArea`

One shader area of an instanced mesh: the effect, its batch type, the area range within the mesh, its cached effect hash and the mesh-group handle it is registered under.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildInstancedMeshes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstancedMeshes -->
## `EveChildInstancedMeshes`

Space-object child that hands batches of instanced meshes to the engine's instanced mesh manager, owning their registration handles, instance flags and world cull bounds.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildInstancedMeshes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstancedMeshInstance -->
## `EveChildInstancedMeshInstance`

A single placement of an instanced mesh: its transform and the index of its cull sphere in the owning mesh's instance sphere list.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildInstancedMeshes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstanceTransform -->
## `EveChildInstanceTransform`

EveChildInstanceTransform (eve/child) - generated from schema shapeHash 9e0ec0c7....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildInstanceTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildLightingOverride -->
## `EveChildLightingOverride`

Space-object child that overrides scene sun, background and reflection lighting, its blend strength driven by how deeply the camera sits inside the volumes it owns.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildLightingOverride.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildLineSet -->
## `EveChildLineSet`

A child that renders a set of curved and sphere-projected line paths, as object geometry, as dedicated line rendering, or both.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildLineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildLink -->
## `EveChildLink`

A stretched link between a shield hull and an arc target: it orients itself along the arc, keeps its own final world placement, and inherits the hull per-object values.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildLink.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildMesh -->
## `EveChildMesh`

Space-object child that draws one mesh under its own transform, owning its decals, lights, attachments, morph weights, world bounds and screen-size LOD state.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildMesh.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildParticleSphere -->
## `EveChildParticleSphere`

A model that binds a particle system's position, velocity and lifetime elements and its attribute generators for a sphere-distributed ambient effect.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildParticleSphere.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildParticleSystem -->
## `EveChildParticleSystem`

A child that hosts particle systems and emitters, driving their transforms, LOD-based particle budgets, and per-frame visibility and render submission.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildParticleSystem.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildPlug -->
## `EveChildPlug`

A container of child objects plugged into a socket, forwarding controller events, controller variables and component registration to what it contains.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildPlug.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildPostProcessVolume -->
## `EveChildPostProcessVolume`

A child that unions a set of inclusion and exclusion volumes into a bounding sphere and drives a post-process effect's intensity from the camera's position relative to them.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildPostProcessVolume.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildQuad -->
## `EveChildQuad`

A billboard quad child that renders through the shared quad renderer's additive instance batch rather than the normal render-batch path.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildQuad.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildRef -->
## `EveChildRef`

A child that lazily resolves and owns a referenced space-object-child resource by path, forwarding controller and registration calls to it.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildRef.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildSocket -->
## `EveChildSocket`

A named attachment point on a ship that resolves and hot-reloads a plugged-in child resource, forwarding controller and registration calls to it.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildSocket.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildSpherePin -->
## `EveChildSpherePin`

Child mesh that draws a pin on a sphere's surface, contributing the pin's centre normal, radius, rotation, alpha threshold and colour to its own per-object shader data.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildSpherePin.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildTransform -->
## `EveChildTransform`

Shared base for space-object children: holds the SRT values, local and world transforms, and the rules by which a child's world transform is derived from its parent's each frame.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveChildTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveCloudVolumeBall -->
## `EveCloudVolumeBall`

EveCloudVolumeBall (eve/child) - generated from schema shapeHash 70440408....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/EveCloudVolumeBall.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveSpaceObjectChild -->
## `IEveSpaceObjectChild`

Base type for space-object children, carrying the shared Origin enum that distinguishes space-authored placement from SOF-authored placement.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/IEveSpaceObjectChild.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveBezierCurve -->
## `EveBezierCurve`

Line-set path shaped as a quadratic Bezier: samples the curve between two endpoints through one control point and emits the resulting chain as line segments.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/lineSetPaths/EveBezierCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveCircle -->
## `EveCircle`

Line-set path shaped as a ring: samples a circle of circleRadius, optionally distorted per quadrant, and emits the resulting chain as line segments.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/lineSetPaths/EveCircle.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierAttachToBone -->
## `EveChildModifierAttachToBone`

Transform modifier that rigidly attaches a child to one bone of the parent's animation bone palette.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierAttachToBone.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierBillboard2D -->
## `EveChildModifierBillboard2D`

Transform modifier that aligns a child to the screen plane, leaving it facing the viewer whatever the camera does.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierBillboard2D.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierBillboard3D -->
## `EveChildModifierBillboard3D`

Transform modifier that turns a child to face the camera, either as a fixed billboard that preserves the child's authored scale or as a free one that screen-aligns and then re-aligns along the camera direction.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierBillboard3D.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierBooster -->
## `EveChildModifierBooster`

Transform modifier that scales a fixed-radius booster sphere so it keeps a constant apparent size as camera distance changes, then re-centres it so its near edge stays put.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierBooster.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierCameraOrientedRotationConstrained -->
## `EveChildModifierCameraOrientedRotationConstrained`

Transform modifier that yaws a child about world up until it faces the camera in the horizontal plane, leaving its authored pitch and roll intact.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierCameraOrientedRotationConstrained.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierHalo -->
## `EveChildModifierHalo`

Transform modifier that screen-aligns a child and shrinks it by the squared facing of its local Z axis toward the camera, so a halo fades out edge-on.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierHalo.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierHaloInverted -->
## `EveChildModifierHaloInverted`

Transform modifier that scales a child to nothing as its local Z axis turns to face the camera - the inverse of a halo, and despite the name not a subclass of one.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierHaloInverted.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierSRT -->
## `EveChildModifierSRT`

Transform modifier that applies a fixed scale, rotation and translation ahead of the child's own transform.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierSRT.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierStretch -->
## `EveChildModifierStretch`

Transform modifier that stretches a child along the vector from its own position to a destination point, scaling it to the stretch length and centring it on the midpoint.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierStretch.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierTranslateWithCamera -->
## `EveChildModifierTranslateWithCamera`

Transform modifier that moves a child with the camera, either pinning its translation to the view position or offsetting it by the view position.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/modifiers/EveChildModifierTranslateWithCamera.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildProceduralContainer -->
## `EveChildProceduralContainer`

EveChildProceduralContainer (eve/child/procedural) - generated from schema shapeHash 91d6cbc5....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/EveChildProceduralContainer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodAttributeMap -->
## `EveProceduralMethodAttributeMap`

EveProceduralMethodAttributeMap (eve/child/procedural/selection) - generated from schema shapeHash 691cb5f9....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/selection/EveProceduralMethodAttributeMap.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodAttributeMapParameter -->
## `EveProceduralMethodAttributeMapParameter`

EveProceduralMethodAttributeMapParameter (eve/child/procedural/selection) - generated from schema shapeHash 5880f54c....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/selection/EveProceduralMethodAttributeMapParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodCycling -->
## `EveProceduralMethodCycling`

EveProceduralMethodCycling (eve/child/procedural/selection) - generated from schema shapeHash 2014815d....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/selection/EveProceduralMethodCycling.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodCyclingParameter -->
## `EveProceduralMethodCyclingParameter`

EveProceduralMethodCyclingParameter (eve/child/procedural/selection) - generated from schema shapeHash 90bcbbe1....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/selection/EveProceduralMethodCyclingParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodRandom -->
## `EveProceduralMethodRandom`

EveProceduralMethodRandom (eve/child/procedural/selection) - generated from schema shapeHash 9e2d2332....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/selection/EveProceduralMethodRandom.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodRandomParameter -->
## `EveProceduralMethodRandomParameter`

EveProceduralMethodRandomParameter (eve/child/procedural/selection) - generated from schema shapeHash 8b32e583....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/selection/EveProceduralMethodRandomParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodThresholdParameter -->
## `EveProceduralMethodThresholdParameter`

EveProceduralMethodThresholdParameter (eve/child/procedural/selection) - generated from schema shapeHash e31926d9....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/selection/EveProceduralMethodThresholdParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodThresholds -->
## `EveProceduralMethodThresholds`

EveProceduralMethodThresholds (eve/child/procedural/selection) - generated from schema shapeHash 794abb42....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/child/procedural/selection/EveProceduralMethodThresholds.js
- Visibility: Public
- Kind: CarbonEngineJS


<!-- class:EveSmartLightAttributeModifierBucket -->
## `EveSmartLightAttributeModifierBucket`

EveSmartLightAttributeModifierBucket (eve/smartLights/attributeModifiers) - generated from schema shapeHash cade668b....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierBucket.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierCameraDependency -->
## `EveSmartLightAttributeModifierCameraDependency`

EveSmartLightAttributeModifierCameraDependency (eve/smartLights/attributeModifiers) - generated from schema shapeHash 5e9c1bd9....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierCameraDependency.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierColor -->
## `EveSmartLightAttributeModifierColor`

EveSmartLightAttributeModifierColor (eve/smartLights/attributeModifiers) - generated from schema shapeHash 1d22dfd5....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierColor.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierControllerVariableListener -->
## `EveSmartLightAttributeModifierControllerVariableListener`

EveSmartLightAttributeModifierControllerVariableListener (eve/smartLights/attributeModifiers) - generated from schema shapeHash 8438774e....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierControllerVariableListener.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierExpressionBucket -->
## `EveSmartLightAttributeModifierExpressionBucket`

EveSmartLightAttributeModifierExpressionBucket (eve/smartLights/attributeModifiers) - generated from schema shapeHash 02cc58c3....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierExpressionBucket.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierNoise -->
## `EveSmartLightAttributeModifierNoise`

EveSmartLightAttributeModifierNoise (eve/smartLights/attributeModifiers) - generated from schema shapeHash 60b52eeb....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierNoise.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightBaseAttributeModifier -->
## `EveSmartLightBaseAttributeModifier`

EveSmartLightBaseAttributeModifier (eve/smartLights/attributeModifiers) - generated from schema shapeHash d70f7c45....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/attributeModifiers/EveSmartLightBaseAttributeModifier.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildSmartLightSet -->
## `EveChildSmartLightSet`

A child that drives a placement distribution and fans its per-frame update, visibility, rendering and registration across a set of smart-light groups.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/EveChildSmartLightSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightBaseGroup -->
## `EveSmartLightBaseGroup`

The shared faction-colour resolution and attribute-modifier surface flattened into every smart-light group implementation.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/EveSmartLightBaseGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightColorShareGroup -->
## `EveSmartLightColorShareGroup`

A smart-light group that computes one shared faction-aware colour, applies it to its child light groups, and fans out their per-frame updates.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/EveSmartLightColorShareGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightPointLight -->
## `EveSmartLightPointLight`

A smart-light group member that places faction-colour-aware point or spot lights at each distribution placement and submits them to the light manager.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/EveSmartLightPointLight.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightQuad -->
## `EveSmartLightQuad`

A smart-light group member that places faction-colour-aware flare quads at each distribution placement and submits them to the quad renderer.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/smartLights/EveSmartLightQuad.js
- Visibility: Public
- Kind: CarbonEngineJS


<!-- class:CjsLightData -->
## `CjsLightData`

Full authored attribute set of a light - position, colour, brightness and noise, radii, orientation and cone angles, texture path, bone index, flags, shadow setting and volumetric flag - used as the compat view over a light's flattened fields.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/lights/CjsLightData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:LightFeatures -->
## `LightFeatures`

LightFeatures (eve/lights) - generated from schema shapeHash 47b89708....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/lights/LightFeatures.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2FactionLight -->
## `Tr2FactionLight`

A light whose colour is derived from a faction palette entry blended by a saturation factor, in addition to its own authored light attributes.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/lights/Tr2FactionLight.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Light -->
## `Tr2Light`

Base scene light: holds the authored light attributes, resolves its bone transform, and submits a converted point or spot record to the light manager each frame.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/lights/Tr2Light.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PointLight -->
## `Tr2PointLight`

Omnidirectional light whose LightData attributes are flattened into persisted Blue properties.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/lights/Tr2PointLight.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SpotLight -->
## `Tr2SpotLight`

Cone light, adding inner and outer cone angles to the flattened point-light attribute set.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/lights/Tr2SpotLight.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2TexturedPointLight -->
## `Tr2TexturedPointLight`

Point light that projects a texture, adding the texture path and its resolved resource to the point-light attribute set and updating dynamically.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/lights/Tr2TexturedPointLight.js
- Visibility: Public
- Kind: CarbonEngineJS


<!-- class:EveEffectRoot2 -->
## `EveEffectRoot2`

A standalone effect root: curve-driven placement plus the effect children, lights, controllers, curve sets and observers that make up an effect not attached to a hull.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/EveEffectRoot2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveMissile -->
## `EveMissile`

A missile in flight: the curve-driven ball path plus the warheads that ride it, own the targeting state and supply all of its renderables and bounds.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/EveMissile.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveMissileWarhead -->
## `EveMissileWarhead`

One warhead of a missile: its launch-to-explosion state machine, the noise-perturbed offset path it flies relative to the missile, and the impact test against the target.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/EveMissileWarhead.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveMobile -->
## `EveMobile`

A space object that carries turret sets, keeping each set bound to the hull locators or animated bones it fires from and tracking how many of its turrets are active.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/EveMobile.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveRootTransform -->
## `EveRootTransform`

A detached transform root whose own ball and model curves drive its matrix and which stands in as a single targetable point for missiles and impacts.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/EveRootTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSpaceObject2 -->
## `EveSpaceObject2`

The hull of an EVE space object - its mesh, locators, locator sets, decals, attachments, lights, effect children, overlay effects, impact overlay and controllers - together with the curve-driven world transform, visibility, LOD and batch submission that drive them each frame.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/EveSpaceObject2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveStation2 -->
## `EveStation2`

Concrete station space-object root.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/EveStation2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveTransform -->
## `EveTransform`

A placeable node in an Eve scene graph: local SRT placement, an optional mesh, particle systems and emitters, curve sets, observers and child transforms, with its own frustum and LOD visibility pass.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/EveTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveCameraFxAttributes -->
## `EveCameraFxAttributes`

A named bag of camera-relative values - distance to camera, look angle to the object, and object, child and camera forward directions - refreshed each child update for effect bindings to read.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/fxAttributes/EveCameraFxAttributes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSpaceObjectFxAttributes -->
## `EveSpaceObjectFxAttributes`

A named bag of parent space-object values - bounding-sphere radius, distance to the ship, parent world placement, shape ellipsoid, activation strength, and active turret and kill counts - refreshed each child update for effect bindings to read.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/fxAttributes/EveSpaceObjectFxAttributes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSwarm -->
## `EveSwarm`

A ship that manages a squad of flocking sub-vehicle renderables with boid-style formation behaviour and aggregate bounding and component registration.

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/swarm/EveSwarm.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSwarmRenderable -->
## `EveSwarmRenderable`

EveSwarmRenderable (eve/spaceObject/swarm) - generated from schema shapeHash a22c3310....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/swarm/EveSwarmRenderable.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SwarmVehicle -->
## `SwarmVehicle`

SwarmVehicle (eve/spaceObject/swarm) - generated from schema shapeHash ad1e4b43....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/swarm/SwarmVehicle.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SwarmVehicleDebug -->
## `SwarmVehicleDebug`

SwarmVehicleDebug (eve/spaceObject/swarm) - generated from schema shapeHash f53e5a64....

- Export: @carbonenginejs/runtime-trinity/eve
- Source: src/eve/spaceObject/swarm/SwarmVehicleDebug.js
- Visibility: Public
- Kind: CarbonEngineJS
