# Render-job classes

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/renderJob`
Audience: Engine authors and integrators
Summary: Catalogs the render-job schedule, the step vocabulary a frame is composed from, and the render-graph nodes they drive.

<!-- class:Tr2RenderJobs -->
## `Tr2RenderJobs`

The four render-job schedules a frame draws from - recurring, one-off, chained and update-recurring - and the order in which they are run.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/Tr2RenderJobs.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RenderNodeEffect -->
## `Tr2RenderNodeEffect`

A render-graph node that binds named sources onto an effect and produces its output.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/Tr2RenderNodeEffect.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderJob -->
## `TriRenderJob`

An ordered list of render steps plus the cursor and status that let the sequence pause mid-list and resume on a later frame.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriRenderJob.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderStep -->
## `TriRenderStep`

Base of every render-job step: an enable flag, a name, and the begin/execute/end contract the owning job drives.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriRenderStep.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepClear -->
## `TriStepClear`

Step that clears the bound colour, depth and stencil attachments, each independently enabled with its own clear value.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepClear.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepClearUav -->
## `TriStepClearUav`

A render step that clears an unordered-access buffer to a fixed value.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepClearUav.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepCopyRenderTarget -->
## `TriStepCopyRenderTarget`

Step describing a copy out of one render target into another render target or into a texture resource, including the source and destination sub-rectangles.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepCopyRenderTarget.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepEnableWireframeMode -->
## `TriStepEnableWireframeMode`

Step that turns wireframe rasterization on or off for the steps that follow.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepEnableWireframeMode.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepFilterVisibilityResults -->
## `TriStepFilterVisibilityResults`

A render step that filters one visibility-result set into another by event and object filter.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepFilterVisibilityResults.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepGenerateMipMaps -->
## `TriStepGenerateMipMaps`

Step that requests regeneration of a render target's mip chain.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepGenerateMipMaps.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPopDepthStencil -->
## `TriStepPopDepthStencil`

Step that pops the executor's depth-stencil stack, undoing an earlier push.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPopDepthStencil.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPopProjection -->
## `TriStepPopProjection`

Step that pops the executor's projection stack, restoring the projection saved by an earlier push.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPopProjection.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPopRenderTarget -->
## `TriStepPopRenderTarget`

Step that pops one slot off the executor's render-target stack, undoing an earlier push.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPopRenderTarget.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPopViewport -->
## `TriStepPopViewport`

Step that pops the executor's viewport stack, restoring the viewport saved by an earlier push.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPopViewport.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPopViewTransform -->
## `TriStepPopViewTransform`

Step that pops the executor's view-transform stack, restoring the view saved by an earlier push.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPopViewTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPresentSwapChain -->
## `TriStepPresentSwapChain`

Step that presents a swap chain, publishing the frame that the preceding steps produced.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPresentSwapChain.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPushDepthStencil -->
## `TriStepPushDepthStencil`

Step that pushes either a named depth-stencil or the currently bound one onto the executor's depth-stencil stack.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPushDepthStencil.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPushProjection -->
## `TriStepPushProjection`

Step that saves the current projection so a later pop can restore it.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPushProjection.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPushRenderTarget -->
## `TriStepPushRenderTarget`

Step that pushes a render target onto the executor's stack for a given slot.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPushRenderTarget.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPushViewport -->
## `TriStepPushViewport`

Step that saves the current viewport so a later pop can restore it.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPushViewport.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPushViewTransform -->
## `TriStepPushViewTransform`

Step that saves the current view transform so a later pop can restore it.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPushViewTransform.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepPythonCB -->
## `TriStepPythonCB`

A render step that invokes a host-supplied callback at its point in the job order.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepPythonCB.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRemoteSync -->
## `TriStepRemoteSync`

Step for Carbon's Windows-only cross-process render synchronization, which has no browser equivalent and therefore always fails.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRemoteSync.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderAtlas -->
## `TriStepRenderAtlas`

A render step that draws a texture atlas for inspection, focused on one entry.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderAtlas.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderDebug -->
## `TriStepRenderDebug`

A render step that accumulates debug lines, boxes and 2D/3D text for one frame and hands them to the executor to draw.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderDebug.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderEffect -->
## `TriStepRenderEffect`

A render step that draws a full-screen effect with an optional shader buffer.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderEffect.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderLineGraph -->
## `TriStepRenderLineGraph`

A render step that draws a set of line graphs with a shared scale and legend.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderLineGraph.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderObject -->
## `TriStepRenderObject`

A render step that renders a single renderable, optionally overriding its material.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderObject.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderPass -->
## `TriStepRenderPass`

A render step that renders one named pass of a multi-pass scene.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderPass.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderScene -->
## `TriStepRenderScene`

A render step that renders one scene at its point in the job order.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderScene.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderSceneDebug -->
## `TriStepRenderSceneDebug`

A render step that draws a scene through its debug representation rather than its normal path.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderSceneDebug.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderTexture -->
## `TriStepRenderTexture`

A render step that draws a provided texture into the current target.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderTexture.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepResolve -->
## `TriStepResolve`

Step that resolves one render target into another, optionally regenerating the destination's mip chain afterwards.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepResolve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRunComputeShader -->
## `TriStepRunComputeShader`

A render step that dispatches a compute shader over its configured group dimensions.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRunComputeShader.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRunJob -->
## `TriStepRunJob`

Step that runs a nested render job in place, letting job graphs compose.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRunJob.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetDebugRenderer -->
## `TriStepSetDebugRenderer`

A render step that installs the debug renderer subsequent debug drawing routes through.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetDebugRenderer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetDepthStencil -->
## `TriStepSetDepthStencil`

Step that binds a depth-stencil directly, without touching the depth-stencil stack.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetDepthStencil.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetProjection -->
## `TriStepSetProjection`

Step that installs an authored projection for the steps that follow.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetProjection.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetRenderState -->
## `TriStepSetRenderState`

Step that sets a single render state to a single value for the steps that follow.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetRenderState.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetRenderTarget -->
## `TriStepSetRenderTarget`

Step that binds a render target to slot 0 directly, without touching the render-target stack.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetRenderTarget.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetStdRndStates -->
## `TriStepSetStdRndStates`

Step that selects one of Carbon's standard rendering-mode state blocks - opaque, decal, alpha, additive, depth-only, picking and so on - instead of setting states individually.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetStdRndStates.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetUpscalingContextID -->
## `TriStepSetUpscalingContextID`

A render step that selects which upscaling context subsequent work resolves against.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetUpscalingContextID.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetVariableStore -->
## `TriStepSetVariableStore`

A render step that writes one named value into the variable store shaders read.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetVariableStore.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetView -->
## `TriStepSetView`

Step that installs the view transform for the steps that follow, taken either from an authored view or from a camera updated against the current viewport.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetView.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetViewport -->
## `TriStepSetViewport`

Step that installs a viewport, or restores the full-screen viewport when none is authored.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetViewport.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepSetVisualizationMode -->
## `TriStepSetVisualizationMode`

Step that switches a renderer object into a debug visualization mode for the remainder of the frame.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepSetVisualizationMode.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepToggleCubemap -->
## `TriStepToggleCubemap`

A render step that turns a scene cubemap display on or off.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepToggleCubemap.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepUpdate -->
## `TriStepUpdate`

A render step that ticks one updateable object with the frame times.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepUpdate.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RenderNodeSprite2dScene -->
## `Tr2RenderNodeSprite2dScene`

A render-graph node that draws a sprite scene into a destination texture, over an optional background node.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/Tr2RenderNodeSprite2dScene.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepRenderFps -->
## `TriStepRenderFps`

A step that averages the frame rate over a quarter second and reports it as text with a threshold colour.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepRenderFps.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriStepTestBlocking -->
## `TriStepTestBlocking`

A test step that reports itself in progress until its flag is cleared, so a job's resume path can be exercised.

- Export: @carbonenginejs/runtime-trinity/renderJob
- Source: src/renderJob/TriStepTestBlocking.js
- Visibility: Public
- Kind: CarbonEngineJS
