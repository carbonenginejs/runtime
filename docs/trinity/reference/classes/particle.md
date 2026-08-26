# Particle classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity/particle`
Audience: Effect authors and engine integrators
Summary: Catalogs the CPU particle simulation - systems, emitters, attribute generators, forces and constraints.

<!-- class:ITr2AttributeGenerator -->
## `ITr2AttributeGenerator`

Required particle-attribute generation contract.

- Export: `@carbonenginejs/runtime/trinity/particle`
- Source: `src/trinity/particle/attribute/ITr2AttributeGenerator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2GenericParticleConstraint -->
## `ITr2GenericParticleConstraint`

Required particle-constraint contract.

- Export: `@carbonenginejs/runtime/trinity/particle`
- Source: `src/trinity/particle/constraint/ITr2GenericParticleConstraint.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2ParticleForce -->
## `ITr2ParticleForce`

Required particle-force contract.

- Export: `@carbonenginejs/runtime/trinity/particle`
- Source: `src/trinity/particle/force/ITr2ParticleForce.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2GenericEmitter -->
## `ITr2GenericEmitter`

Contract shared by CPU and GPU particle emitters.

- Export: `@carbonenginejs/runtime/trinity/particle`
- Source: `src/trinity/particle/ITr2GenericEmitter.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2GenericEmitterUpdateArguments -->
## `ITr2GenericEmitterUpdateArguments`

Per-frame values passed to an ITr2GenericEmitter update or spawn call.

- Export: `@carbonenginejs/runtime/trinity/particle`
- Source: `src/trinity/particle/ITr2GenericEmitter.js`
- Visibility: Public
- Kind: CarbonEngineJS

## Generic emitter contract

`ITr2GenericEmitter` is the nominal interface used by particle owners;
`ITr2GenericEmitterUpdateArguments` is the separately registered record that
carries Carbon's nested update structure. Implementations provide these
operations:

- `Update(updateArguments)` receives `time` in seconds, the scene GPU particle
  system (unused by CPU emitters), `parentTransform`, the world-origin shift
  since the previous frame, and the LOD `emitCountFactor`;
- `SpawnParticles(updateArguments, position, velocity, rateModifier)` handles
  emit-during-lifetime and emit-on-death calls, where parent position and
  velocity may be null and the modifier scales the configured rate;
- the second `SpawnParticles` form receives begin/end positions and velocities
  plus delta time for improved distribution; and
- `SetThreadSafeFlag()` records Carbon's concurrent-spawn contract and is
  vacuous for a single-threaded JavaScript implementation.

The current CPU implementations also accept the reduced
`SpawnParticles(position, velocity, rateModifier)` invocation used by particle
systems and collision constraints.

<!-- class:Tr2CapsuleShapeAttributeGenerator -->
## `Tr2CapsuleShapeAttributeGenerator`

Generates particle position and velocity offsets sampled within a capsule volume interpolated between a start and end transform.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/attribute/Tr2CapsuleShapeAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ConsecutiveIntegerAttributeGenerator -->
## `Tr2ConsecutiveIntegerAttributeGenerator`

Generates a per-particle attribute as a cycling, wrapped incrementing integer counter within a range.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/attribute/Tr2ConsecutiveIntegerAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DynamicEmitter -->
## `Tr2DynamicEmitter`

A continuous-rate particle emitter that binds attribute generators to a particle system and spawns particles over time from an accumulated emission rate.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/emitter/Tr2DynamicEmitter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ElementBlendConstraint -->
## `Tr2ElementBlendConstraint`

A constraint that rescales and offsets a single bound particle element by a constant factor and value each frame.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/constraint/Tr2ElementBlendConstraint.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ForceSphereVolume -->
## `Tr2ForceSphereVolume`

Aggregates child forces within a spherical region, scaling their combined contribution by a falloff toward the sphere's edge.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/force/Tr2ForceSphereVolume.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GpuSharedEmitter -->
## `Tr2GpuSharedEmitter`

Authored parameters of a GPU particle emitter: emission cone and rate, particle lifetime and speed range, size and colour ramp, and the drag, turbulence and gravity terms the simulation applies.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/emitter/Tr2GpuSharedEmitter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GpuUniqueEmitter -->
## `Tr2GpuUniqueEmitter`

GPU emitter owned by a single instance, adding parent scaling and a per-instance attractor on top of the shared emitter parameters.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/emitter/Tr2GpuUniqueEmitter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleAttractorForce -->
## `Tr2ParticleAttractorForce`

Particle force of constant magnitude pointing at a fixed position, regardless of distance.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/force/Tr2ParticleAttractorForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleDirectForce -->
## `Tr2ParticleDirectForce`

Constant particle force vector, applied identically to every particle.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/force/Tr2ParticleDirectForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleDragForce -->
## `Tr2ParticleDragForce`

Linear particle drag: a force proportional to velocity and opposing it.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/force/Tr2ParticleDragForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleElementData -->
## `Tr2ParticleElementData`

Tr2ParticleElementData (particle) - generated from schema shapeHash ca640653....

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/element/Tr2ParticleElementData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleElementDeclaration -->
## `Tr2ParticleElementDeclaration`

Tr2ParticleElementDeclaration (particle) - generated from schema shapeHash 272e6639....

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/element/Tr2ParticleElementDeclaration.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleElementDeclarationName -->
## `Tr2ParticleElementDeclarationName`

Tr2ParticleElementDeclarationName (particle) - generated from schema shapeHash 115c80e5....

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/element/Tr2ParticleElementDeclarationName.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleFluidDragForce -->
## `Tr2ParticleFluidDragForce`

Quadratic fluid drag on particles, clamped so a single integration step can never push a particle's velocity past zero into a reversal.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/force/Tr2ParticleFluidDragForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleSpring -->
## `Tr2ParticleSpring`

Linear spring pulling particles toward a fixed position with a force proportional to displacement.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/force/Tr2ParticleSpring.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleSystem -->
## `Tr2ParticleSystem`

Owns a particle system's element declaration, CPU-side attribute buffers, and per-frame simulation of aging, forces, movement, constraints and bounds.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/Tr2ParticleSystem.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleTurbulenceForce -->
## `Tr2ParticleTurbulenceForce`

A time-evolving four-dimensional Perlin turbulence force applied to particle motion.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/force/Tr2ParticleTurbulenceForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleVortexForce -->
## `Tr2ParticleVortexForce`

Particle force of constant magnitude directed tangentially around an axis through a fixed position, swirling particles about it.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/force/Tr2ParticleVortexForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PlaneConstraint -->
## `Tr2PlaneConstraint`

A collision constraint that keeps particles on one side of a plane, reflecting velocity with elasticity, friction and noise, and triggering generators and emitters on contact.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/constraint/Tr2PlaneConstraint.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RandomDirectionAttributeGenerator -->
## `Tr2RandomDirectionAttributeGenerator`

Generates a per-particle attribute as a random unit vector spanning the bound element's dimension.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/attribute/Tr2RandomDirectionAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RandomIntegerAttributeGenerator -->
## `Tr2RandomIntegerAttributeGenerator`

Generates a per-particle attribute by sampling each component to a rounded integer within a minimum and maximum range.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/attribute/Tr2RandomIntegerAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RandomUniformAttributeGenerator -->
## `Tr2RandomUniformAttributeGenerator`

Generates a per-particle attribute by sampling each component uniformly between a minimum and maximum range.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/attribute/Tr2RandomUniformAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SphereConstraint -->
## `Tr2SphereConstraint`

A collision constraint that keeps particles outside or inside a sphere, reflecting velocity and triggering generators and emitters on contact.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/constraint/Tr2SphereConstraint.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SphereShapeAttributeGenerator -->
## `Tr2SphereShapeAttributeGenerator`

Generates particle position and velocity offsets sampled within a rotated spherical cone and radius range.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/attribute/Tr2SphereShapeAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2StaticEmitter -->
## `Tr2StaticEmitter`

A one-shot particle emitter that spawns particles from a geometry resource's baked emission points on first update.

- Export: @carbonenginejs/runtime/trinity/particle
- Source: src/trinity/particle/emitter/Tr2StaticEmitter.js
- Visibility: Public
- Kind: CarbonEngineJS
