# Eve runtime classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity/eve`
Audience: Users and integrators
Summary: Catalogs promoted Eve runtime classes with renderer-neutral behavior.

<!-- class:CjsEveChildResourceLoader -->
## `CjsEveChildResourceLoader`

Trinity-owned synchronous child-resource resolution contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/CjsEveChildResourceLoader.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveLightingOverride -->
## `IEveLightingOverride`

Contract for an EVE entity that contributes a weighted lighting override.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/IEveLightingOverride.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSprite2dBracketRenderer -->
## `EveSprite2dBracketRenderer`

Binds a bracket collection and icon atlas for rendering EVE UI markers in a Sprite2D scene.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveSprite2dBracketRenderer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveLineChildContainer -->
## `EveLineChildContainer`

Groups line-path children beneath a shared transform with naming and visibility state.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/lineSetPaths/EveLineChildContainer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveBallpark -->
## `IEveBallpark`

Required host ballpark contract used by EVE scene updates.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/IEveBallpark.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveChildTransformModifier -->
## `IEveChildTransformModifier`

Required child-transform modifier contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/modifiers/IEveChildTransformModifier.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveDistributionMethod -->
## `IEveDistributionMethod`

Required distribution placement contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/IEveDistributionMethod.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveDistributionModifier -->
## `IEveDistributionModifier`

Required distribution attribute-modifier contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/attributeModifiers/IEveDistributionModifier.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveDistributionPlacementGenerators -->
## `IEveDistributionPlacementGenerators`

Required distribution placement-generator contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/placement/IEveDistributionPlacementGenerators.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveDistributionSpawner -->
## `IEveDistributionSpawner`

Distribution spawner contract with Carbon's optional no-op hooks.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawners/IEveDistributionSpawner.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveDistributionSpawnModifier -->
## `IEveDistributionSpawnModifier`

Required distribution spawn-modifier contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawnModifiers/IEveDistributionSpawnModifier.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveFiringEffectElement -->
## `IEveFiringEffectElement`

Required EVE firing-effect element contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/IEveFiringEffectElement.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveFxAttribute -->
## `IEveFxAttribute`

Required EVE effect-attribute update contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/spaceObject/fxAttributes/IEveFxAttribute.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveLineSetPath -->
## `IEveLineSetPath`

Required line-set path contract on the shared child-transform spine.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/lineSetPaths/IEveLineSetPath.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveProceduralSelectionMethod -->
## `IEveProceduralSelectionMethod`

Required procedural-child selection contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/procedural/selection/IEveProceduralSelectionMethod.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveReferencePoint -->
## `IEveReferencePoint`

Required time-varying world reference-point contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/IEveReferencePoint.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveSmartLightGroupAttributeModifier -->
## `IEveSmartLightGroupAttributeModifier`

Required smart-light group attribute-modifier contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/smartLights/attributeModifiers/IEveSmartLightGroupAttributeModifier.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveSocketParameter -->
## `IEveSocketParameter`

Carbon socket-parameter contract with its interface defaults.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/IEveSocketParameter.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveSpaceObjectAttachment -->
## `IEveSpaceObjectAttachment`

Carbon space-object attachment contract with its interface defaults.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/IEveSpaceObjectAttachment.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveVolume -->
## `IEveVolume`

Required EVE volume contract.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/volume/IEveVolume.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightSpotLight -->
## `EveSmartLightSpotLight`

A spot-light specialization with persisted cone angles.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/smartLights/EveSmartLightSpotLight.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2FroxelFogSettings -->
## `ITr2FroxelFogSettings`

Nominal Carbon froxel-fog component contract.

Its base method throws until a concrete Eve component supplies a stable settings record.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/ITr2FroxelFogSettings.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveCurveLineSet -->
## `EveCurveLineSet`

An Eve-owned curve-line set that composes transforms, culls bounds, collects itself, and writes object constants.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/lines/EveCurveLineSet.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveConnector -->
## `EveConnector`

Builds Carbon connector records in a maintained `EveCurveLineSet`.

The records include curve-driven endpoints and line animation policy.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveConnector.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveLineContainer -->
## `EveLineContainer`

Owns the ordered connector-to-line-set rebuild and delegates its runtime queries.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveLineContainer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProjectBracket -->
## `EveProjectBracket`

Projects an authored world position into an owned Sprite2D bracket.

Camera state and Carbon's current animation time come from the active
`Tr2RenderContext`; docking and visibility remain portable CPU policy.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveProjectBracket.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveTacticalOverlay -->
## `EveTacticalOverlay`

Produces Carbon's tactical anchor, range-connector, and velocity instance records.

The records include curve-driven positions, visibility/LOD subdivision, the
prior-frame segment budget, and the effect-local shader variable store.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveTacticalOverlay.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveTacticalOverlayTrackObject -->
## `EveTacticalOverlayTrackObject`

Samples an authored vector curve into tactical-overlay position and velocity values.

It also carries the tracked object's radius, aggression, and velocity flags.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/tacticalOverlay/EveTacticalOverlayTrackObject.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildPartData -->
## `EveChildPartData`

Persistent modular-space-object state stored as an effect child.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/EveChildPartData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstanceMeshRenderer -->
## `EveChildInstanceMeshRenderer`

Builds and publishes the canonical CPU instance stream from a placement distribution.

It applies Carbon's billboard constraints and computes visibility and bounds;
engines own physical instance-buffer realization.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/EveChildInstanceMeshRenderer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildPartDataPartData -->
## `EveChildPartDataPartData`

One modular-object part's logical transform and local-space bounds.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/EveChildPartData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSpaceObjectChild -->
## `EveSpaceObjectChild`

Nominal base for every live space-object child.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/EveSpaceObjectChild.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EvePlanet -->
## `EvePlanet`

Represents a planet scene object with CPU-side visibility state for its depth-only child mesh.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/spaceObject/planet/EvePlanet.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveLensflare -->
## `EveLensflare`

Represents a lens-flare graph with CPU-side visibility and controller state.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/effect/lensflare/EveLensflare.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveLineSet -->
## `EveLineSet`

Stores editable tactical line records before renderer submission.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/lines/EveLineSet.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveTacticalTrails -->
## `EveTacticalTrails`

Tracks tactical trail objects without requiring a graphics device.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/tacticalOverlay/EveTacticalTrails.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveComponentCollection -->
## `EveComponentCollection`

Stores entities belonging to one Eve component type.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/scene/components/EveComponentCollection.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveComponentRegistry -->
## `EveComponentRegistry`

Indexes Eve entities and their component collections for scene processing.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/scene/components/EveComponentRegistry.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveShip2 -->
## `EveShip2`

A ship space object: booster drive, speed state, and ship shader data.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/spaceObject/EveShip2.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveSpherePin -->
## `EveSpherePin`

A UI sphere pin: authored SRT placement plus the pin constant record.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveSpherePin.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:EveChildBulletStorm -->
## `EveChildBulletStorm`

Locator-driven bullet-storm child: instances, target blobs, and the clip-sphere state machine.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/EveChildBulletStorm.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:IEveSpaceObject2ParentData -->
## `IEveSpaceObject2ParentData`

The per-frame parent state a space object hands to its attachments.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/spaceObject/IEveSpaceObject2ParentData.js`
- Visibility: Public
- Kind: CarbonEngine

<!-- class:Allign -->
## `Allign`

A steering behaviour that pulls each drone's acceleration toward the average acceleration direction of its nearby neighbours, recomputing the pull force on a throttled schedule and reusing it between refreshes.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/Allign.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ApproachGroup -->
## `ApproachGroup`

A steering behaviour that pulls each drone toward the centroid of its nearby neighbours, recomputing the pull force on a throttled schedule and reusing it between refreshes.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/ApproachGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BackAndForth -->
## `BackAndForth`

A steering behaviour that shuttles each drone between seek and deliver locators, slowing on approach, snapping its facing, and triggering effects on arrival.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/BackAndForth.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BehaviorGroup -->
## `BehaviorGroup`

Owns a group of drone agents, running its priority-ordered behaviours each frame to integrate their acceleration, velocity, orientation and position, and managing their count, visibility, lighting and rendering.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/BehaviorGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BehaviorGroupBooster -->
## `BehaviorGroupBooster`

A drone-group component that builds and drives the group's shared booster and ambient or halo flare effects and contributes their point light to the scene.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/BehaviorGroupBooster.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CollisionAvoidance -->
## `CollisionAvoidance`

Drone behavior that pushes agents away from the centre of every exclusion volume they intersect, weighted by the volume's intensity at the agent.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/CollisionAvoidance.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:DroneAgent -->
## `DroneAgent`

DroneAgent (eve/child/behaviors) - generated from schema shapeHash c50899e8....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/DroneAgent.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:DroneAvoidance -->
## `DroneAvoidance`

A steering behaviour that pushes each drone away from its nearby neighbours, blended with its current velocity direction, to keep agents from clustering or overlapping.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/DroneAvoidance.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveKDdroneManagementTree -->
## `EveKDdroneManagementTree`

A spatial index that builds and incrementally rebalances a k-d tree over a group's drone agents and answers nearest-neighbour and multi-radius range queries against it.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/EveKDdroneManagementTree.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:FollowASpline -->
## `FollowASpline`

A steering behaviour that pulls unassigned drones into spline tunnel entrances and steers locked drones along their assigned tunnel's points toward the exit.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/FollowASpline.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Formation -->
## `Formation`

A steering behaviour that detects when a drone group's motion has converged, organises the agents into a rotating slot grid, and pulls each agent toward its assigned slot.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/Formation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:InclusionVolume -->
## `InclusionVolume`

Drone behavior that pulls agents back toward the inclusion volumes once they drift into the falloff shell; agents fully inside feel no force.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/InclusionVolume.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Inertia -->
## `Inertia`

A steering behaviour that smooths each agent's acceleration by rotating it toward the previous frame's direction at a limited angular speed and blending its magnitude toward the desired value.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/Inertia.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ProcessLifetime -->
## `ProcessLifetime`

ProcessLifetime (eve/child/behaviors) - generated from schema shapeHash 1fd3ebfa....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/lifecycle/ProcessLifetime.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ProcessLifetimeData -->
## `ProcessLifetimeData`

Per-agent scratch record for the ProcessLifetime behavior: which tunnel the agent is assigned, how far along that tunnel it is, and whether it has spawned or already used its entry and exit tunnels.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/lifecycle/ProcessLifetimeData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:PlayFX -->
## `PlayFX`

A steering-group behaviour that clones, aims, and starts or stops a firing effect on each drone as it arrives at and departs from its target.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/PlayFX.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SeekTarget -->
## `SeekTarget`

A steering behaviour that assigns drones to repair locators on a target ship, splitting the target's bounding box into buckets so damage-seeking agents distribute evenly across it.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/SeekTarget.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SpawnDrones -->
## `SpawnDrones`

A steering behaviour that populates and repopulates a drone group's agents, either regenerating a jittered spawn grid or spawning agents by count on a schedule or one-shot trigger.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/SpawnDrones.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SplineTunnel -->
## `SplineTunnel`

SplineTunnel (eve/child/behaviors) - generated from schema shapeHash d53f1701....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/tunnels/SplineTunnel.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SplineTunnelGroup -->
## `SplineTunnelGroup`

SplineTunnelGroup (eve/child/behaviors) - generated from schema shapeHash da595535....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/tunnels/SplineTunnelGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SplineTunnelPoint -->
## `SplineTunnelPoint`

SplineTunnelPoint (eve/child/behaviors) - generated from schema shapeHash da3b5246....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/tunnels/SplineTunnelPoint.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Wander -->
## `Wander`

Drone behavior that adds a per-agent Perlin-noise wander force seeded from the agent's lifetime and id, so each drone drifts on its own path.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/behaviors/Wander.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildAudio -->
## `EveChildAudio`

Space-object child that owns a positional audio emitter and keeps its position and orientation tracking the child's world transform.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildAudio.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildBehaviorSystem -->
## `EveChildBehaviorSystem`

A child that drives behaviour groups - swarms, drones and the like - from its own placement under the hull.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildBehaviorSystem.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildCloud2 -->
## `EveChildCloud2`

A volumetric cloud entity that renders as a raymarched unit-cube volume with its own lightmap, shadow map and lighting, and can also contribute reflection batches.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildCloud2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildContainer -->
## `EveChildContainer`

Space-object child that groups other children under one transform, owning their curve sets, controllers, observers, lights, attachments and transform modifiers, and gating them on a display-quality filter.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildContainer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildEffectPropagator -->
## `EveChildEffectPropagator`

EveChildEffectPropagator (eve/child) - generated from schema shapeHash 0f2a96e8....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildEffectPropagator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildExplosion -->
## `EveChildExplosion`

A container child that sequences and spawns local and global explosion instances over time from authored transforms and delays.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildExplosion.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildFogVolume -->
## `EveChildFogVolume`

Space-object child that contributes a prioritized froxel fog settings override, its strength driven by how deeply the camera sits inside the volumes it owns.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildFogVolume.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInheritProperties -->
## `EveChildInheritProperties`

The SOF colour set a space object hands down to its children: one colour per named material slot (Primary, Hull, Booster, State0, ...) in a fixed order.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildInheritProperties.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstanceContainer -->
## `EveChildInstanceContainer`

A child that instantiates a source template across a list of authored or locator-driven transforms, forwarding controller and registration calls to the instances.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildInstanceContainer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstancedMesh -->
## `EveChildInstancedMesh`

One geometry-and-areas record inside an EveChildInstancedMeshes child, holding its instance placements, per-instance world cull spheres, instance flags and manager registration handles.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildInstancedMeshes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstancedMeshArea -->
## `EveChildInstancedMeshArea`

One shader area of an instanced mesh: the effect, its batch type, the area range within the mesh, its cached effect hash and the mesh-group handle it is registered under.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildInstancedMeshes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstancedMeshes -->
## `EveChildInstancedMeshes`

Space-object child that hands batches of instanced meshes to the engine's instanced mesh manager, owning their registration handles, instance flags and world cull bounds.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildInstancedMeshes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstancedMeshInstance -->
## `EveChildInstancedMeshInstance`

A single placement of an instanced mesh: its transform and the index of its cull sphere in the owning mesh's instance sphere list.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildInstancedMeshes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildInstanceTransform -->
## `EveChildInstanceTransform`

EveChildInstanceTransform (eve/child) - generated from schema shapeHash 9e0ec0c7....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildInstanceTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildLightingOverride -->
## `EveChildLightingOverride`

Space-object child that overrides scene sun, background and reflection lighting, its blend strength driven by how deeply the camera sits inside the volumes it owns.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildLightingOverride.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildLineSet -->
## `EveChildLineSet`

A child that renders a set of curved and sphere-projected line paths, as object geometry, as dedicated line rendering, or both.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildLineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildLink -->
## `EveChildLink`

A stretched link between a shield hull and an arc target: it orients itself along the arc, keeps its own final world placement, and inherits the hull per-object values.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildLink.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildMesh -->
## `EveChildMesh`

Space-object child that draws one mesh under its own transform, owning its decals, lights, attachments, morph weights, world bounds and screen-size LOD state.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildMesh.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildParticleSphere -->
## `EveChildParticleSphere`

A model that binds a particle system's position, velocity and lifetime elements and its attribute generators for a sphere-distributed ambient effect.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildParticleSphere.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildParticleSystem -->
## `EveChildParticleSystem`

A child that hosts particle systems and emitters, driving their transforms, LOD-based particle budgets, and per-frame visibility and render submission.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildParticleSystem.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildPlug -->
## `EveChildPlug`

A container of child objects plugged into a socket, forwarding controller events, controller variables and component registration to what it contains.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildPlug.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildPostProcessVolume -->
## `EveChildPostProcessVolume`

A child that unions a set of inclusion and exclusion volumes into a bounding sphere and drives a post-process effect's intensity from the camera's position relative to them.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildPostProcessVolume.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildQuad -->
## `EveChildQuad`

A billboard quad child that renders through the shared quad renderer's additive instance batch rather than the normal render-batch path.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildQuad.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildRef -->
## `EveChildRef`

A child that lazily resolves and owns a referenced space-object-child resource by path, forwarding controller and registration calls to it.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildRef.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildSocket -->
## `EveChildSocket`

A named attachment point on a ship that resolves and hot-reloads a plugged-in child resource, forwarding controller and registration calls to it.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildSocket.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildSpherePin -->
## `EveChildSpherePin`

Child mesh that draws a pin on a sphere's surface, contributing the pin's centre normal, radius, rotation, alpha threshold and colour to its own per-object shader data.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildSpherePin.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildTransform -->
## `EveChildTransform`

Shared base for space-object children: holds the SRT values, local and world transforms, and the rules by which a child's world transform is derived from its parent's each frame.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveChildTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveCloudVolumeBall -->
## `EveCloudVolumeBall`

EveCloudVolumeBall (eve/child) - generated from schema shapeHash 70440408....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/EveCloudVolumeBall.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IEveSpaceObjectChild -->
## `IEveSpaceObjectChild`

Base type for space-object children, carrying the shared Origin enum that distinguishes space-authored placement from SOF-authored placement.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/IEveSpaceObjectChild.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveBezierCurve -->
## `EveBezierCurve`

Line-set path shaped as a quadratic Bezier: samples the curve between two endpoints through one control point and emits the resulting chain as line segments.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/lineSetPaths/EveBezierCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveCircle -->
## `EveCircle`

Line-set path shaped as a ring: samples a circle of circleRadius, optionally distorted per quadrant, and emits the resulting chain as line segments.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/lineSetPaths/EveCircle.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierAttachToBone -->
## `EveChildModifierAttachToBone`

Transform modifier that rigidly attaches a child to one bone of the parent's animation bone palette.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierAttachToBone.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierBillboard2D -->
## `EveChildModifierBillboard2D`

Transform modifier that aligns a child to the screen plane, leaving it facing the viewer whatever the camera does.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierBillboard2D.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierBillboard3D -->
## `EveChildModifierBillboard3D`

Transform modifier that turns a child to face the camera, either as a fixed billboard that preserves the child's authored scale or as a free one that screen-aligns and then re-aligns along the camera direction.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierBillboard3D.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierBooster -->
## `EveChildModifierBooster`

Transform modifier that scales a fixed-radius booster sphere so it keeps a constant apparent size as camera distance changes, then re-centres it so its near edge stays put.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierBooster.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierCameraOrientedRotationConstrained -->
## `EveChildModifierCameraOrientedRotationConstrained`

Transform modifier that yaws a child about world up until it faces the camera in the horizontal plane, leaving its authored pitch and roll intact.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierCameraOrientedRotationConstrained.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierHalo -->
## `EveChildModifierHalo`

Transform modifier that screen-aligns a child and shrinks it by the squared facing of its local Z axis toward the camera, so a halo fades out edge-on.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierHalo.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierHaloInverted -->
## `EveChildModifierHaloInverted`

Transform modifier that scales a child to nothing as its local Z axis turns to face the camera - the inverse of a halo, and despite the name not a subclass of one.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierHaloInverted.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierSRT -->
## `EveChildModifierSRT`

Transform modifier that applies a fixed scale, rotation and translation ahead of the child's own transform.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierSRT.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierStretch -->
## `EveChildModifierStretch`

Transform modifier that stretches a child along the vector from its own position to a destination point, scaling it to the stretch length and centring it on the midpoint.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierStretch.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildModifierTranslateWithCamera -->
## `EveChildModifierTranslateWithCamera`

Transform modifier that moves a child with the camera, either pinning its translation to the view position or offsetting it by the view position.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/modifiers/EveChildModifierTranslateWithCamera.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildProceduralContainer -->
## `EveChildProceduralContainer`

EveChildProceduralContainer (eve/child/procedural) - generated from schema shapeHash 91d6cbc5....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/EveChildProceduralContainer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodAttributeMap -->
## `EveProceduralMethodAttributeMap`

EveProceduralMethodAttributeMap (eve/child/procedural/selection) - generated from schema shapeHash 691cb5f9....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/selection/EveProceduralMethodAttributeMap.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodAttributeMapParameter -->
## `EveProceduralMethodAttributeMapParameter`

EveProceduralMethodAttributeMapParameter (eve/child/procedural/selection) - generated from schema shapeHash 5880f54c....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/selection/EveProceduralMethodAttributeMapParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodCycling -->
## `EveProceduralMethodCycling`

EveProceduralMethodCycling (eve/child/procedural/selection) - generated from schema shapeHash 2014815d....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/selection/EveProceduralMethodCycling.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodCyclingParameter -->
## `EveProceduralMethodCyclingParameter`

EveProceduralMethodCyclingParameter (eve/child/procedural/selection) - generated from schema shapeHash 90bcbbe1....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/selection/EveProceduralMethodCyclingParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodRandom -->
## `EveProceduralMethodRandom`

EveProceduralMethodRandom (eve/child/procedural/selection) - generated from schema shapeHash 9e2d2332....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/selection/EveProceduralMethodRandom.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodRandomParameter -->
## `EveProceduralMethodRandomParameter`

EveProceduralMethodRandomParameter (eve/child/procedural/selection) - generated from schema shapeHash 8b32e583....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/selection/EveProceduralMethodRandomParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodThresholdParameter -->
## `EveProceduralMethodThresholdParameter`

EveProceduralMethodThresholdParameter (eve/child/procedural/selection) - generated from schema shapeHash e31926d9....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/selection/EveProceduralMethodThresholdParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveProceduralMethodThresholds -->
## `EveProceduralMethodThresholds`

EveProceduralMethodThresholds (eve/child/procedural/selection) - generated from schema shapeHash 794abb42....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/child/procedural/selection/EveProceduralMethodThresholds.js
- Visibility: Public
- Kind: CarbonEngineJS


<!-- class:EveSmartLightAttributeModifierBucket -->
## `EveSmartLightAttributeModifierBucket`

EveSmartLightAttributeModifierBucket (eve/smartLights/attributeModifiers) - generated from schema shapeHash cade668b....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierBucket.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierCameraDependency -->
## `EveSmartLightAttributeModifierCameraDependency`

EveSmartLightAttributeModifierCameraDependency (eve/smartLights/attributeModifiers) - generated from schema shapeHash 5e9c1bd9....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierCameraDependency.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierColor -->
## `EveSmartLightAttributeModifierColor`

EveSmartLightAttributeModifierColor (eve/smartLights/attributeModifiers) - generated from schema shapeHash 1d22dfd5....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierColor.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierControllerVariableListener -->
## `EveSmartLightAttributeModifierControllerVariableListener`

EveSmartLightAttributeModifierControllerVariableListener (eve/smartLights/attributeModifiers) - generated from schema shapeHash 8438774e....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierControllerVariableListener.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierExpressionBucket -->
## `EveSmartLightAttributeModifierExpressionBucket`

EveSmartLightAttributeModifierExpressionBucket (eve/smartLights/attributeModifiers) - generated from schema shapeHash 02cc58c3....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierExpressionBucket.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightAttributeModifierNoise -->
## `EveSmartLightAttributeModifierNoise`

EveSmartLightAttributeModifierNoise (eve/smartLights/attributeModifiers) - generated from schema shapeHash 60b52eeb....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/attributeModifiers/EveSmartLightAttributeModifierNoise.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightBaseAttributeModifier -->
## `EveSmartLightBaseAttributeModifier`

Owns common smart-light activation state and a nominal modifier contract whose optional colour and controller hooks default to no-ops while required update and attribute-processing methods throw until a concrete modifier implements them.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/attributeModifiers/EveSmartLightBaseAttributeModifier.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildSmartLightSet -->
## `EveChildSmartLightSet`

A child that drives a placement distribution and fans its per-frame update, visibility, rendering and registration across a set of smart-light groups.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/EveChildSmartLightSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightBaseGroup -->
## `EveSmartLightBaseGroup`

The shared faction-colour resolution and attribute-modifier surface flattened into every smart-light group implementation.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/EveSmartLightBaseGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightColorShareGroup -->
## `EveSmartLightColorShareGroup`

A smart-light group that computes one shared faction-aware colour, applies it to its child light groups, and fans out their per-frame updates.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/EveSmartLightColorShareGroup.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightMesh -->
## `EveSmartLightMesh`

Specializes the maintained instance-mesh renderer for distributed smart-light meshes.

It includes faction-aware colour modifiers and effect-parameter updates.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/smartLights/EveSmartLightMesh.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightPointLight -->
## `EveSmartLightPointLight`

A smart-light group member that places faction-colour-aware point or spot lights at each distribution placement and submits them to the light manager.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/EveSmartLightPointLight.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSmartLightQuad -->
## `EveSmartLightQuad`

A smart-light group member that places faction-colour-aware flare quads at each distribution placement and submits them to the quad renderer.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/smartLights/EveSmartLightQuad.js
- Visibility: Public
- Kind: CarbonEngineJS


<!-- class:CjsLightData -->
## `CjsLightData`

Full authored attribute set of a light - position, colour, brightness and noise, radii, orientation and cone angles, texture path, bone index, flags, shadow setting and volumetric flag - used as the compat view over a light's flattened fields.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/lights/CjsLightData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:LightFeatures -->
## `LightFeatures`

LightFeatures (eve/lights) - generated from schema shapeHash 47b89708....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/lights/LightFeatures.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2FactionLight -->
## `Tr2FactionLight`

A light whose colour is derived from a faction palette entry blended by a saturation factor, in addition to its own authored light attributes.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/lights/Tr2FactionLight.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Light -->
## `Tr2Light`

Base scene light: holds the authored light attributes, resolves its bone transform, and submits a converted point or spot record to the light manager each frame.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/lights/Tr2Light.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PointLight -->
## `Tr2PointLight`

Omnidirectional light whose LightData attributes are flattened into persisted Blue properties.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/lights/Tr2PointLight.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SpotLight -->
## `Tr2SpotLight`

Cone light, adding inner and outer cone angles to the flattened point-light attribute set.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/lights/Tr2SpotLight.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2TexturedPointLight -->
## `Tr2TexturedPointLight`

Point light that projects a texture, adding the texture path and its resolved resource to the point-light attribute set and updating dynamically.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/lights/Tr2TexturedPointLight.js
- Visibility: Public
- Kind: CarbonEngineJS


<!-- class:EveEffectRoot2 -->
## `EveEffectRoot2`

A standalone effect root: curve-driven placement plus the effect children, lights, controllers, curve sets and observers that make up an effect not attached to a hull.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/EveEffectRoot2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveMissile -->
## `EveMissile`

A missile in flight: the curve-driven ball path plus the warheads that ride it, own the targeting state and supply all of its renderables and bounds.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/EveMissile.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveMissileWarhead -->
## `EveMissileWarhead`

One warhead of a missile: its launch-to-explosion state machine, the noise-perturbed offset path it flies relative to the missile, and the impact test against the target.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/EveMissileWarhead.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveMobile -->
## `EveMobile`

A space object that carries turret sets, keeping each set bound to the hull locators or animated bones it fires from and tracking how many of its turrets are active.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/EveMobile.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveRootTransform -->
## `EveRootTransform`

A detached transform root whose own ball and model curves drive its matrix and which stands in as a single targetable point for missiles and impacts.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/EveRootTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSpaceObject2 -->
## `EveSpaceObject2`

The hull of an EVE space object - its mesh, locators, locator sets, decals, attachments, lights, effect children, overlay effects, impact overlay and controllers - together with the curve-driven world transform, visibility, LOD and batch submission that drive them each frame.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/EveSpaceObject2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveStation2 -->
## `EveStation2`

Concrete station space-object root.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/EveStation2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveTransform -->
## `EveTransform`

A placeable node in an Eve scene graph: local SRT placement, an optional mesh, particle systems and emitters, curve sets, observers and child transforms, with its own frustum and LOD visibility pass.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/EveTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveCameraFxAttributes -->
## `EveCameraFxAttributes`

A named bag of camera-relative values - distance to camera, look angle to the object, and object, child and camera forward directions - refreshed each child update for effect bindings to read.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/fxAttributes/EveCameraFxAttributes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSpaceObjectFxAttributes -->
## `EveSpaceObjectFxAttributes`

A named bag of parent space-object values - bounding-sphere radius, distance to the ship, parent world placement, shape ellipsoid, activation strength, and active turret and kill counts - refreshed each child update for effect bindings to read.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/fxAttributes/EveSpaceObjectFxAttributes.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSwarm -->
## `EveSwarm`

A ship that manages a squad of flocking sub-vehicle renderables with boid-style formation behaviour and aggregate bounding and component registration.

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/swarm/EveSwarm.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSwarmRenderable -->
## `EveSwarmRenderable`

EveSwarmRenderable (eve/spaceObject/swarm) - generated from schema shapeHash a22c3310....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/swarm/EveSwarmRenderable.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SwarmVehicle -->
## `SwarmVehicle`

SwarmVehicle (eve/spaceObject/swarm) - generated from schema shapeHash ad1e4b43....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/swarm/SwarmVehicle.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:SwarmVehicleDebug -->
## `SwarmVehicleDebug`

SwarmVehicleDebug (eve/spaceObject/swarm) - generated from schema shapeHash f53e5a64....

- Export: @carbonenginejs/runtime/trinity/eve
- Source: src/trinity/eve/spaceObject/swarm/SwarmVehicleDebug.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveBannerItem -->
## `EveBannerItem`

One authored banner quad: its bone attachment, placement, the two curvature angles that bend it, and the SOF reference id identifying which banner is shown.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/banner/EveBannerItem.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveBannerLight -->
## `EveBannerLight`

The light one banner contributes, carrying its saturation, light profile and the bone matrix resolved for it each frame.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/banner/EveBannerLight.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveBannerSet -->
## `EveBannerSet`

A hull's authored banner quads, owning their static and per-bone bounds, the largest single banner radius its LOD is measured on, and the banner lights.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/banner/EveBannerSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveBoosterSet2 -->
## `EveBoosterSet2`

Owns a hull's authored booster placements and derives from them the glow flares, trails, set bounding sphere and flickering point lights that its renderable instances draw.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/booster/EveBoosterSet2.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveBoosterSet2Item -->
## `EveBoosterSet2Item`

One authored booster placement: its local transform, functionality inputs, atlas slots, light scale and whether it emits a trail.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/booster/EveBoosterSet2.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveBoosterSet2Renderable -->
## `EveBoosterSet2Renderable`

One ship's instance of a booster set: it carries the parent transform, speed and rotation, derives the booster and trail intensities, and maintains the five-point trail spline and its LOD flags.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/booster/EveBoosterSet2Renderable.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveTrailsSet -->
## `EveTrailsSet`

Holds the booster trail placements a hull emits, together with the mesh resource and effect a renderer draws them with.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/booster/EveTrailsSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:DecalMeshCache -->
## `DecalMeshCache`

Stores the per-LOD clipped vertex and index buffers generated for one projected decal.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/decal/DecalMeshCache.js`
- Visibility: Public
- Kind: Carbon

<!-- class:DecalMeshCacheMeshBuffers -->
## `DecalMeshCacheMeshBuffers`

DecalMeshCache.MeshBuffers - one LOD's clipped decal buffers.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/decal/DecalMeshCache.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpaceObjectDecal -->
## `EveSpaceObjectDecal`

A decal projected onto a parent hull, owning its oriented projection matrix, optional bone attachment, per-LOD triangle index lists and screen-size visibility ramp.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/decal/EveSpaceObjectDecal.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveHazeSet -->
## `EveHazeSet`

A hull's authored haze volumes, owning their per-bone bounds and the point lights the haze emits.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/haze/EveHazeSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveHazeSetItem -->
## `EveHazeSetItem`

One authored haze volume: its bone attachment, placement, colour and the four-component haze shaping data.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/haze/EveHazeSetItem.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveHazeSetLight -->
## `EveHazeSetLight`

The light one haze item contributes, carrying its booster-gain influence flag, light profile and the bone matrix resolved for it each frame.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/haze/EveHazeSetLight.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EvePlaneLight -->
## `EvePlaneLight`

The light one plane contributes, carrying its saturation, blink rate and phase, fade type, light profile and the bone matrix resolved for it each frame.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/plane/EvePlaneLight.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EvePlaneSet -->
## `EvePlaneSet`

A hull's authored textured planes, owning their static and per-bone bounds, the four shared texture parameters and the plane lights.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/plane/EvePlaneSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EvePlaneSetItem -->
## `EvePlaneSetItem`

One authored plane: its bone attachment, placement, colour, two independently transformed and scrolling texture layers, mask atlas slot and blink data.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/plane/EvePlaneSetItem.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpotlightLight -->
## `EveSpotlightLight`

The spot light one spotlight item contributes, carrying its booster-gain influence flag, light profile and the bone matrix resolved for it each frame.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/spotlight/EveSpotlightLight.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpotlightSet -->
## `EveSpotlightSet`

A hull's authored spotlights, owning their static and per-bone bounds, the cone and glow effects that draw them, and the spot lights they emit.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/spotlight/EveSpotlightSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpotlightSetItem -->
## `EveSpotlightSetItem`

One authored spotlight: its bone attachment, placement matrix, the separate cone, flare and sprite colours drawn for it, and whether booster gain modulates it.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/spotlight/EveSpotlightSetItem.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpriteLight -->
## `EveSpriteLight`

The light one sprite contributes, carrying the blink rate, phase and scale range that modulate its radius, plus its light profile and the bone matrix resolved for it each frame.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/sprite/EveSpriteLight.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpriteLineSet -->
## `EveSpriteLineSet`

A hull's authored sprite runs - lines and circles of evenly spaced sprites - owning their static and per-bone bounds and the point lights they emit.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/sprite/EveSpriteLineSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpriteLineSetItem -->
## `EveSpriteLineSetItem`

One authored run of identical sprites, laid out either evenly along a line or distributed around a circle, with the blink timing and colour they share.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/sprite/EveSpriteLineSetItem.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpriteSet -->
## `EveSpriteSet`

A hull's authored blinking sprites, owning their static and per-bone bounds and the point lights the sprites emit.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/sprite/EveSpriteSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpriteSetItem -->
## `EveSpriteSetItem`

One authored sprite: its bone attachment, position, blink timing, scale range, falloff and normal and warp colours.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/sprite/EveSpriteSetItem.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveChildBoosterSet -->
## `EveChildBoosterSet`

The child-graph booster set: instanced exhaust geometry packed as 64-byte ring-buffer rows, the lensflare sprite set at each exhaust point, and flickering point lights scaled by the parent transform; without an installed AL ring buffer the set stays undrawn, which is Carbon's own invalid-offset state.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/EveChildBoosterSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveChildTurret -->
## `EveChildTurret`

A single animated turret living as a space-object child: it owns its target tracker, sysbone aiming, deploy/pack/fire animation state machine, firing effect and movement audio, and implements the pose-modifier hook so its barrels aim inside the sampled animation pose.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/EveChildTurret.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveTurretAiming -->
## `EveTurretAiming`

Sysbone aiming math and tuning values shared by turret hosts: yaw, counter-rotation, pitch, and height system bones posed toward a target with per-bone factor, offset, clamp, and tracking-influence rules.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/turrets/EveTurretAiming.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveTurretFiringFX -->
## `EveTurretFiringFX`

Coordinates a turret set's multi-muzzle firing effects, delays, stretch endpoints, observers, and impact timing.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/turrets/EveTurretFiringFX.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveTurretSet -->
## `EveTurretSet`

Owns a hull's instanced turrets and drives their aiming, animation, firing, visibility, batches, shadows, and per-object data.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/turrets/EveTurretSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveTurretTarget -->
## `EveTurretTarget`

Tracks what a turret set is shooting at: the chosen damage locator, the resolved impact and miss positions, and the queue of hit/miss results the server has sent.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/attachment/turrets/EveTurretTarget.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveTriggerVolume -->
## `EveTriggerVolume`

A standalone spatial trigger that fires a script callback when a tracked position enters or exits its volumes: broad-phase bounding-sphere gate, exclusion-volume subtraction, and an edge-triggered enter/exit callback.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveTriggerVolume.js`
- Visibility: Public
- Kind: Carbon

<!-- class:AudioGameObject -->
## `AudioGameObject`

A freely placed audio emitter driven by its own translation and rotation curves, so a sound can sit anywhere in a scene without being attached to an asset.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/AudioGameObject.js`
- Visibility: Public
- Kind: Carbon

<!-- class:BackAndForthData -->
## `BackAndForthData`

Per-agent scratch for the BackAndForth child behaviour: the locator the agent is travelling to, the direction it approaches from, and how far through the trip it is.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/BackAndForthData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveCamera -->
## `EveCamera`

Carbon's orbit camera and its CPU-side view/projection state.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/camera/EveCamera.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsEveThrottleableState -->
## `CjsEveThrottleableState`

The next-update clock behind EveThrottleable, held outside the schema so throttling state is never serialized or exported.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/CjsEveThrottleableState.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveChildCloud -->
## `EveChildCloud`

Legacy volumetric-cloud child with authored cloud fields plus maintained ownership, parent, part-tag, CPU SRT composition, visibility, world-transform, and bounding-sphere behavior; GPU tessellation remains engine-owned.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/child/EveChildCloud.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:EveDistributionModifierProcessLifetime -->
## `EveDistributionModifierProcessLifetime`

Ends or respawns a distributed placement with the authored lifetime event after its lifetime duration expires.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/attributeModifiers/EveDistributionModifierProcessLifetime.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionModifierScaleBySpaceObjectParent -->
## `EveDistributionModifierScaleBySpaceObjectParent`

Multiplies a distributed placement's additional scale from its parent space object's bounding radius or an authored scale curve.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/attributeModifiers/EveDistributionModifierScaleBySpaceObjectParent.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionModifierTransformOffset -->
## `EveDistributionModifierTransformOffset`

Accumulates authored or lifetime-sampled translation, rotation, and scale onto a distributed placement.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/attributeModifiers/EveDistributionModifierTransformOffset.js`
- Visibility: Public
- Kind: Carbon

<!-- class:InitialPlacement -->
## `InitialPlacement`

Pairs one pooled distribution placement with the timeout that controls when its location may be triggered again.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/attributeModifiers/InitialPlacement.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveBaseDistributionMethod -->
## `EveBaseDistributionMethod`

Manages an authored placement pool and updates its live entities through placement generators, spawners, and lifetime modifiers.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/EveBaseDistributionMethod.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionPlacementGeneratorLocators -->
## `EveDistributionPlacementGeneratorLocators`

Builds distribution placements from an authored locator list and requests regeneration when that list changes.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/placement/EveDistributionPlacementGeneratorLocators.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionPlacementGeneratorParentLocators -->
## `EveDistributionPlacementGeneratorParentLocators`

Builds distribution placements from a named locator set resolved on the parent space object.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/placement/EveDistributionPlacementGeneratorParentLocators.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionPlacementGeneratorVolume -->
## `EveDistributionPlacementGeneratorVolume`

Samples a volume into oriented distribution placements and requests regeneration when the volume or sampling settings change.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/placement/EveDistributionPlacementGeneratorVolume.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnerBurst -->
## `EveDistributionSpawnerBurst`

Spawns a configured fraction of the free distribution placements in one delayed burst.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawners/EveDistributionSpawnerBurst.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnerControllerTrigger -->
## `EveDistributionSpawnerControllerTrigger`

Gates a nested set of distribution spawners from a named controller variable.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawners/EveDistributionSpawnerControllerTrigger.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnerInterval -->
## `EveDistributionSpawnerInterval`

Spawns distribution entities at configurable, optionally randomized intervals for a bounded or unlimited repeat count.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawners/EveDistributionSpawnerInterval.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnerTriggerPlane -->
## `EveDistributionSpawnerTriggerPlane`

Triggers pooled placements in the order reached by a timed plane sweep.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawners/EveDistributionSpawnerTriggerPlane.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnerTriggerSnake -->
## `EveDistributionSpawnerTriggerSnake`

Triggers a timed chain of nearby free placements, walking forward from each previously reached destination.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawners/EveDistributionSpawnerTriggerSnake.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnerTriggerSphere -->
## `EveDistributionSpawnerTriggerSphere`

Triggers pooled placements in the order reached by a timed sphere expansion.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawners/EveDistributionSpawnerTriggerSphere.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnModifierLifeTimeOffset -->
## `EveDistributionSpawnModifierLifeTimeOffset`

Offsets each spawned placement's initial lifetime with random, normalized, or cascading timing.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawnModifiers/EveDistributionSpawnModifierLifeTimeOffset.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnModifierRandomOffset -->
## `EveDistributionSpawnModifierRandomOffset`

Adds a seeded random local translation offset to each spawned placement.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawnModifiers/EveDistributionSpawnModifierRandomOffset.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnModifierRandomRotation -->
## `EveDistributionSpawnModifierRandomRotation`

Applies or replaces each spawned placement's orientation with a seeded random yaw, pitch, and roll.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawnModifiers/EveDistributionSpawnModifierRandomRotation.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistributionSpawnModifierRandomScale -->
## `EveDistributionSpawnModifierRandomScale`

Applies or replaces each spawned placement's scale with seeded random per-axis or uniform values.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/distribution/spawnModifiers/EveDistributionSpawnModifierRandomScale.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveMultiEffect -->
## `EveMultiEffect`

A named bundle of curve sets, controllers and dynamic bindings that animates other space objects through typed parameter slots, without owning any geometry itself.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/effect/multiEffect/EveMultiEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveMultiEffectParameter -->
## `EveMultiEffectParameter`

One named slot in an EveMultiEffect, holding the object bound to that name together with the object type the effect expects there.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/effect/multiEffect/EveMultiEffectParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveChildUpdateParams -->
## `EveChildUpdateParams`

The parameter block a parent passes down when updating a space-object child: the parent references, the parent's bone array, the child's world placement, and the owner's motion and activation state.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveChildUpdateParams.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveCustomMask -->
## `EveCustomMask`

One oriented box projected onto a hull that replaces a source material with a chosen blend of target materials inside it.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveCustomMask.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDistanceField -->
## `EveDistanceField`

Tracks a set of moving points, estimates the volume covering them, and drives a curve set from the eased camera distance to that volume.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveDistanceField.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveEntity -->
## `EveEntity`

Base for Eve objects that publish themselves to a scene's component registry, tracking which registry they belong to and the slot index the registry assigned for each component type.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveEntity.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveImpactOverlay -->
## `EveImpactOverlay`

The damage presentation for one ship: shield, armour and hull impact resources, the faders driving hardening and repair effects, and the data-texture bookkeeping that feeds them.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveImpactOverlay.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveDamageOverlay -->
## `EveDamageOverlay`

Maintains armour and hull damage state, locator masks, impact records, shared data-texture rows, faders, and the batches consumed by ship and child overlays.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/overlays/EveDamageOverlay.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:EveModularObjectModifier -->
## `EveModularObjectModifier`

Transient modular-object edit session that adds, removes, and transforms parts through an injected SOF builder, reacquires records replaced by values hydration, and maintains aggregate sphere and Carbon inner-ellipsoid bounds without introducing a Trinity-to-SOF dependency.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveModularObjectModifier.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:EveLineData -->
## `EveLineData`

One line in an EveLineSet: two endpoints, each with its own colour.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveLineData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveLODHelper -->
## `EveLODHelper`

Carbon's stateless LOD decision helper.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveLODHelper.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveThrottleable -->
## `EveThrottleable`

Update-rate state for objects that run at less than frame rate, mapping a normalized detail level onto an update frequency between authored bounds.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveThrottleable.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveUpdateContext -->
## `EveUpdateContext`

Carries per-frame Eve timing, LOD, origin-rebasing, visibility, and runtime-composition state shared across scene updates.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/EveUpdateContext.js`
- Visibility: Public
- Kind: Carbon

<!-- class:FollowASplineData -->
## `FollowASplineData`

Per-agent scratch for the FollowASpline child behaviour: which tunnel the agent is locked onto and which point along it the agent is heading for.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/FollowASplineData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:FormationData -->
## `FormationData`

Per-agent scratch for the Formation child behaviour: the formation slot the agent has been assigned, or -1 while it has none.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/FormationData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:InertiaData -->
## `InertiaData`

Per-agent scratch for the Inertia child behaviour: the acceleration carried over from the previous update and the weight it is blended in with.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/InertiaData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveLocator2 -->
## `EveLocator2`

Named attachment point on a space object, carrying a full transform matrix rather than decomposed components.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/locator/EveLocator2.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveLocatorSets -->
## `EveLocatorSets`

Named group of locators that a space object publishes for turrets, effects and distributions to attach to.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/locator/EveLocatorSets.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Locator -->
## `Locator`

Attachment point held as decomposed position, orientation, scale and bone index, as stored inside a locator set.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/locator/Locator.js`
- Visibility: Public
- Kind: Carbon

<!-- class:LocatorData -->
## `LocatorData`

Position and orientation pair handed to seek-target child behaviours.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/locator/LocatorData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveMeshOverlayEffect -->
## `EveMeshOverlayEffect`

Named overlay pass attached to a mesh, holding one effect list per batch type together with the curve set and controllers that animate them.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/overlays/EveMeshOverlayEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveParticleDirectForce -->
## `EveParticleDirectForce`

Blue alias of Tr2ParticleDirectForce - Carbon registers the Eve name with zero attributes of its own and chains the whole exposure to the Tr2 class.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/particles/force/EveParticleDirectForce.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveParticleDragForce -->
## `EveParticleDragForce`

Blue alias of Tr2ParticleDragForce - Carbon registers the Eve name with zero attributes of its own and chains the whole exposure to the Tr2 class.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/particles/force/EveParticleDragForce.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveParticleSpring -->
## `EveParticleSpring`

Blue alias of Tr2ParticleSpring - Carbon registers the Eve name (from the ...SpringAttractor source files) with zero attributes of its own and chains the whole exposure to the Tr2 class.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/particles/force/EveParticleSpring.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSceneStaticParticles -->
## `EveSceneStaticParticles`

A scene-scale field of static particle clusters, held as CPU instance rows around a double-precision aggregate origin and drawn through a single instanced mesh.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/particles/static/EveSceneStaticParticles.js`
- Visibility: Public
- Kind: Carbon

<!-- class:PlacementDataWithIdentifier -->
## `PlacementDataWithIdentifier`

One generated placement in a distribution: the initial transform the generator produced, the extra translation, rotation and scale the attribute modifiers have accumulated, and the identity and lifetime that let those modifiers recognise the same placement between frames.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/PlacementDataWithIdentifier.js`
- Visibility: Public
- Kind: Carbon

<!-- class:PlayFXData -->
## `PlayFXData`

Per-agent scratch for the PlayFX child behaviour: whether the agent's effect is currently running and the target position it was last aimed at.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/PlayFXData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveFiringEffectElementContainer -->
## `EveFiringEffectElementContainer`

A top-level wrapper that hosts one firing-effect element for editing, owning the endpoint state that is pushed into that element every update.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/renderable/stretch/EveFiringEffectElementContainer.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveLocalPositionCurve -->
## `EveLocalPositionCurve`

A vector function that computes a point local to a model - a point on its bounding hull, a damage or firing locator, a turret muzzle, or an authored offset - selected by an authored behaviour.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/renderable/stretch/EveLocalPositionCurve.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveRemotePositionCurve -->
## `EveRemotePositionCurve`

A vector function that offsets a start-point curve by a vector sweeping from one authored direction to another over a fixed time, once or repeatedly.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/renderable/stretch/EveRemotePositionCurve.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveStretch -->
## `EveStretch`

An effect drawn between a source point and a destination point, hosting transform children pinned at each end, stretched along the span, and travelling from one end to the other.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/renderable/stretch/EveStretch.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveStretch2 -->
## `EveStretch2`

A simplified stretch that renders the span between two points as a strip of quads with its own effect, end emitters, observers and point lights, instead of hosting child objects.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/renderable/stretch/EveStretch2.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveStretch3 -->
## `EveStretch3`

The current stretch effect: places space-object children at the source, across the span, at the destination and at a travelling point between them, driven by its own controllers, dynamic bindings and curve sets.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/renderable/stretch/EveStretch3.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpaceScene -->
## `EveSpaceScene`

Owns and updates an Eve space scene's entities, component registry, lighting, fog, post-process state, culling, and per-frame shader data.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/scene/EveSpaceScene.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EvePickingContext -->
## `EvePickingContext`

Holds the outstanding picking readbacks and the most recent pick result - screen coordinates, hit object and hit area - for a scene.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/scene/picking/EvePickingContext.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriShadowFrustum -->
## `TriShadowFrustum`

Carbon's native perspective-shadow frustum adapter.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/scene/shadows/TriShadowFrustum.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriShadowOrthoFrustum -->
## `TriShadowOrthoFrustum`

Carbon's native orthographic-shadow frustum adapter.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/scene/shadows/TriShadowOrthoFrustum.js`
- Visibility: Public
- Kind: Carbon

<!-- class:SeekTargetData -->
## `SeekTargetData`

Per-agent scratch for the SeekTarget child behaviour: the locator being sought, the position and direction of the approach, and whether the agent has spawned and arrived.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/SeekTargetData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterBindingBase -->
## `EveSocketParameterBindingBase`

Provides named typed socket parameters with external-value binding, default capture, and propagation hooks.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterBindingBase.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterBool -->
## `EveSocketParameterBool`

Binds a named boolean socket value to external parameters, capturing and restoring each binding's previous value.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterBool.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterColor -->
## `EveSocketParameterColor`

Binds a named four-component color socket value to external parameters, preserving defaults by copy for restoration.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterColor.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterFilePath -->
## `EveSocketParameterFilePath`

Specializes the string socket parameter for authored file paths while retaining the same binding and restoration behavior.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterFilePath.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterFloat -->
## `EveSocketParameterFloat`

Binds a named float socket value to external parameters, capturing and restoring each binding's previous value.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterFloat.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterInt -->
## `EveSocketParameterInt`

Binds a named 32-bit integer socket value to external parameters, capturing and restoring each binding's previous value.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterInt.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterString -->
## `EveSocketParameterString`

Binds a named string socket value to external parameters while capturing defaults for restoration.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterString.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterVector2 -->
## `EveSocketParameterVector2`

Binds a named two-component vector socket value to external parameters, preserving defaults by copy for restoration.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterVector2.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterVector3 -->
## `EveSocketParameterVector3`

Binds a named three-component vector socket value to external parameters, preserving defaults by copy for restoration.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterVector3.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSocketParameterVector4 -->
## `EveSocketParameterVector4`

Binds a named four-component vector socket value to external parameters, preserving defaults by copy for restoration.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/socket/EveSocketParameterVector4.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveEllipseDefinition -->
## `EveEllipseDefinition`

One authored ellipse of an ellipse set - centre, plane normal, in-plane rotation in degrees and the two semi-axis lengths.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveEllipseDefinition.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveEllipseSet -->
## `EveEllipseSet`

Transform child that owns a list of ellipse definitions and the effect they are drawn with, used for the ribbon rings of UI overlays.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveEllipseSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSprite2dBracket -->
## `EveSprite2dBracket`

Screen-space bracket drawn from an atlas icon, carrying its own colour, 2D translation and display flag.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveSprite2dBracket.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveUiObject -->
## `EveUiObject`

Represents an Eve UI space object whose mesh areas can be shown, hidden, and identified from picking ids.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/ui/EveUiObject.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourFloatAdd -->
## `EveVirtualCameraBehaviourFloatAdd`

Float behaviour that adds an authored constant, optionally shaped across the timeline by a scale curve.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourFloatAdd.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourFloatBase -->
## `EveVirtualCameraBehaviourFloatBase`

Base for the virtual camera behaviours that contribute a scalar delta to a camera's field of view or roll each update.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourFloatBase.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourFloatDamping -->
## `EveVirtualCameraBehaviourFloatDamping`

Float behaviour that lags a scalar camera value behind the value the other behaviours produced, smoothing sudden changes.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourFloatDamping.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourFloatNoise -->
## `EveVirtualCameraBehaviourFloatNoise`

Float behaviour that adds a Perlin-noise wobble to a scalar camera value such as field of view or roll.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourFloatNoise.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourFloatSet -->
## `EveVirtualCameraBehaviourFloatSet`

Float behaviour that overrides whatever the earlier behaviours accumulated with an authored constant.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourFloatSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3Base -->
## `EveVirtualCameraBehaviourVector3Base`

Base for the virtual camera behaviours that contribute a world-space vector3 offset to a camera's position or point of interest each update.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3Base.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3Damping -->
## `EveVirtualCameraBehaviourVector3Damping`

Vector3 behaviour that lags the camera position or point of interest behind its target, giving a smooth follow with no overshoot.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3Damping.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3Inertia -->
## `EveVirtualCameraBehaviourVector3Inertia`

Vector3 behaviour that gives the camera value momentum, so it accelerates towards its target and coasts rather than tracking it exactly.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3Inertia.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3MoveBetween -->
## `EveVirtualCameraBehaviourVector3MoveBetween`

Vector3 behaviour that sweeps the camera value from one authored endpoint to another across the animation timeline.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3MoveBetween.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3MoveForward -->
## `EveVirtualCameraBehaviourVector3MoveForward`

Vector3 behaviour that displaces the camera along its own forward axis by a curve-shaped distance, and the base for the sideways and vertical variants.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3MoveForward.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3MoveRight -->
## `EveVirtualCameraBehaviourVector3MoveRight`

Vector3 behaviour that displaces the camera sideways along its own right axis by a curve-shaped distance.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3MoveRight.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3MoveUp -->
## `EveVirtualCameraBehaviourVector3MoveUp`

Vector3 behaviour that displaces the camera along its own up axis by a curve-shaped distance.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3MoveUp.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3Offset -->
## `EveVirtualCameraBehaviourVector3Offset`

Vector3 behaviour that applies a fixed, time-independent displacement, either in world space or in the anchor's yaw frame.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3Offset.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3Orbit -->
## `EveVirtualCameraBehaviourVector3Orbit`

Vector3 behaviour that places the camera on a horizontal circle about the anchor, sweeping from a start to an end angle over the timeline.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3Orbit.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraBehaviourVector3Shake -->
## `EveVirtualCameraBehaviourVector3Shake`

Vector3 behaviour that shakes the camera with independent per-axis Perlin noise applied along the camera's own right, up and forward axes.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/behaviour/EveVirtualCameraBehaviourVector3Shake.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCamera -->
## `EveVirtualCamera`

Cinematic camera defined by a position, a point of interest, a field of view and a roll, each rebuilt every update from its own list of behaviours over a local timeline.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/EveVirtualCamera.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraSystem -->
## `EveVirtualCameraSystem`

Owns the registered virtual cameras plus the externally driven camera, and runs the transition that hands control from one to another.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/EveVirtualCameraSystem.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraTransitionBase -->
## `EveVirtualCameraTransitionBase`

Base for camera hand-overs, owning the source and target cameras plus the temporary camera that is rendered while the hand-over runs.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/transition/EveVirtualCameraTransitionBase.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraTransitionCut -->
## `EveVirtualCameraTransitionCut`

Transition that hands control to the target camera on the frame it starts, with no blend.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/transition/EveVirtualCameraTransitionCut.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveVirtualCameraTransitionLerp -->
## `EveVirtualCameraTransitionLerp`

Transition that blends position, point of interest, field of view and roll from the source camera to the target camera over a fixed duration.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/virtualCamera/transition/EveVirtualCameraTransitionLerp.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveBoxVolume -->
## `EveBoxVolume`

Oriented box of influence with a hollow inner box, weighting points by falloff and seeding random points across its shell.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/volume/EveBoxVolume.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveEllipsoidVolume -->
## `EveEllipsoidVolume`

Oriented ellipsoid of influence with a hollow inner ellipsoid, weighting points by falloff and seeding random points between the two shells.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/volume/EveEllipsoidVolume.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSphereVolume -->
## `EveSphereVolume`

Sphere of influence with a solid inner radius and a falloff out to the outer radius, weighting points and seeding random ones inside it.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/volume/EveSphereVolume.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSpaceSceneRenderDriver -->
## `EveSpaceSceneRenderDriver`

Drives one EVE space-scene frame: camera, quality, pass toggles, overlay, background and post-process state, then collects the scene's renderables into batches.

- Export: `@carbonenginejs/runtime/trinity/eve`
- Source: `src/trinity/eve/scene/EveSpaceSceneRenderDriver.js`
- Visibility: Public
- Kind: Carbon
