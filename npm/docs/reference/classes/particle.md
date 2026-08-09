# Particle classes

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/particle`
Audience: Effect authors and engine integrators
Summary: Catalogs the CPU particle simulation - systems, emitters, attribute generators, forces and constraints.

<!-- class:Tr2CapsuleShapeAttributeGenerator -->
## `Tr2CapsuleShapeAttributeGenerator`

Generates particle position and velocity offsets sampled within a capsule volume interpolated between a start and end transform.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2CapsuleShapeAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ConsecutiveIntegerAttributeGenerator -->
## `Tr2ConsecutiveIntegerAttributeGenerator`

Generates a per-particle attribute as a cycling, wrapped incrementing integer counter within a range.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ConsecutiveIntegerAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DynamicEmitter -->
## `Tr2DynamicEmitter`

A continuous-rate particle emitter that binds attribute generators to a particle system and spawns particles over time from an accumulated emission rate.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2DynamicEmitter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ElementBlendConstraint -->
## `Tr2ElementBlendConstraint`

A constraint that rescales and offsets a single bound particle element by a constant factor and value each frame.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ElementBlendConstraint.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ForceSphereVolume -->
## `Tr2ForceSphereVolume`

Aggregates child forces within a spherical region, scaling their combined contribution by a falloff toward the sphere's edge.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ForceSphereVolume.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GpuSharedEmitter -->
## `Tr2GpuSharedEmitter`

Authored parameters of a GPU particle emitter: emission cone and rate, particle lifetime and speed range, size and colour ramp, and the drag, turbulence and gravity terms the simulation applies.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2GpuSharedEmitter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GpuUniqueEmitter -->
## `Tr2GpuUniqueEmitter`

GPU emitter owned by a single instance, adding parent scaling and a per-instance attractor on top of the shared emitter parameters.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2GpuUniqueEmitter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleAttractorForce -->
## `Tr2ParticleAttractorForce`

Particle force of constant magnitude pointing at a fixed position, regardless of distance.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleAttractorForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleDirectForce -->
## `Tr2ParticleDirectForce`

Constant particle force vector, applied identically to every particle.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleDirectForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleDragForce -->
## `Tr2ParticleDragForce`

Linear particle drag: a force proportional to velocity and opposing it.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleDragForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleElementData -->
## `Tr2ParticleElementData`

Tr2ParticleElementData (particle) - generated from schema shapeHash ca640653....

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleElementData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleElementDeclaration -->
## `Tr2ParticleElementDeclaration`

Tr2ParticleElementDeclaration (particle) - generated from schema shapeHash 272e6639....

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleElementDeclaration.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleElementDeclarationName -->
## `Tr2ParticleElementDeclarationName`

Tr2ParticleElementDeclarationName (particle) - generated from schema shapeHash 115c80e5....

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleElementDeclarationName.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleFluidDragForce -->
## `Tr2ParticleFluidDragForce`

Quadratic fluid drag on particles, clamped so a single integration step can never push a particle's velocity past zero into a reversal.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleFluidDragForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleSpring -->
## `Tr2ParticleSpring`

Linear spring pulling particles toward a fixed position with a force proportional to displacement.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleSpring.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleSystem -->
## `Tr2ParticleSystem`

Owns a particle system's element declaration, CPU-side attribute buffers, and per-frame simulation of aging, forces, movement, constraints and bounds.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleSystem.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleTurbulenceForce -->
## `Tr2ParticleTurbulenceForce`

A time-evolving four-dimensional Perlin turbulence force applied to particle motion.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleTurbulenceForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ParticleVortexForce -->
## `Tr2ParticleVortexForce`

Particle force of constant magnitude directed tangentially around an axis through a fixed position, swirling particles about it.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2ParticleVortexForce.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PlaneConstraint -->
## `Tr2PlaneConstraint`

A collision constraint that keeps particles on one side of a plane, reflecting velocity with elasticity, friction and noise, and triggering generators and emitters on contact.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2PlaneConstraint.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RandomDirectionAttributeGenerator -->
## `Tr2RandomDirectionAttributeGenerator`

Generates a per-particle attribute as a random unit vector spanning the bound element's dimension.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2RandomDirectionAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RandomIntegerAttributeGenerator -->
## `Tr2RandomIntegerAttributeGenerator`

Generates a per-particle attribute by sampling each component to a rounded integer within a minimum and maximum range.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2RandomIntegerAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RandomUniformAttributeGenerator -->
## `Tr2RandomUniformAttributeGenerator`

Generates a per-particle attribute by sampling each component uniformly between a minimum and maximum range.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2RandomUniformAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SphereConstraint -->
## `Tr2SphereConstraint`

A collision constraint that keeps particles outside or inside a sphere, reflecting velocity and triggering generators and emitters on contact.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2SphereConstraint.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SphereShapeAttributeGenerator -->
## `Tr2SphereShapeAttributeGenerator`

Generates particle position and velocity offsets sampled within a rotated spherical cone and radius range.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2SphereShapeAttributeGenerator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2StaticEmitter -->
## `Tr2StaticEmitter`

A one-shot particle emitter that spawns particles from a geometry resource's baked emission points on first update.

- Export: @carbonenginejs/runtime-trinity/particle
- Source: src/particle/Tr2StaticEmitter.js
- Visibility: Public
- Kind: CarbonEngineJS
