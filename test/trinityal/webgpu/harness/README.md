# WebGPU fixtures awaiting a new harness

The browser harness that drew these fixtures was retired on 2026-10-11 with the
old WebGPU batch path it ran on. Live GPU checks now run through the
`CjsWebgpuRenderContextAL` demos and graphene.

What remains here is data: the `*V5Fixture.js` files hold the expected
`.carbonwebgpu` package records for the quad and decal v5 effects, and the
matching `*v5-fixture.test.js` files check them.

None of it imports the runtime. A new harness should draw these through the
abstraction layer.
