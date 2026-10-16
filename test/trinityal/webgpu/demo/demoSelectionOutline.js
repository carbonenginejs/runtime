// Private demo composition: the selection outline on the ship under the
// pointer, drawn as Blender and Unreal draw theirs - a solid, even line around
// the object's visible shape, with no lines inside it.
//
// Two passes, both the shader compiler's library (runtime
// src/shadercompiler/library/selection), loaded through resMan:
//
// 1. MASK. After the scene's main pass, while its depth buffer is still held,
//    the hovered ship is drawn again with `selectionmask` as an override
//    effect - Carbon's TriStepRenderObject (TriStepRenderObject.cpp:43-72),
//    which collects one renderable's batches and renders them with
//    RenderBatchesWithOverride - into a mask target, depth-tested against the
//    scene and not written. Only its visible pixels enter the mask.
// A second, depth-independent mask retains the complete silhouette.
// 2. OUTLINE. After post-processing, `selectionoutline` is drawn over the
//    frame as Carbon's screen quad: visible object pixels near its complete
//    silhouette get an inward line. Foreground cutouts are not edges.
//
// The two passes need a seam between the driver's main pass and its post
// process, which the engine does not offer; the demo wraps the driver's
// _PostProcess, as it already patches post-process methods (demo.js:1414).

import { EveEffectRoot2, EvePlanet, EveSpaceObject2, TriStepRenderObject, TriViewport } from "../../../../npm/dist/trinity/index.js";
import { Tr2Renderer } from "../../../../npm/dist/trinity/core/index.js";
import { PixelFormat, Tr2GpuUsage } from "../../../../npm/dist/global/consts/renderContext/index.js";
import { Tr2BitmapDimensions, Tr2TextureAL } from "../../../../npm/dist/trinityal/index.js";
import { CjsSchema } from "../../../../npm/dist/global/schema/index.js";

/** The selection effects, as effect file paths. */
const MASK = "res:/graphics/effect/cjs/selection/selectionmask.fx";
const SKINNED_MASK = "res:/graphics/effect/cjs/selection/skinned_selectionmask.fx";
const OUTLINE = "res:/graphics/effect/cjs/selection/selectionvisibleoutline.fx";

/**
 * Whether a ship's hull is skinned: CCP inserts `skinned_` in the name of its
 * area shaders, and the mask must read the same vertex layout.
 *
 * @param {EveSpaceObject2} ship The ship.
 * @returns {boolean} True for a skinned hull.
 */
function IsSkinned(ship)
{
    return (ship.mesh?.opaqueAreas ?? []).some(area => /(^|\/)(unpacked)?skinned_/u.test(area.effect?.effectFilePath ?? ""));
}

/**
 * Draws the selection outline around the ship under the pointer.
 *
 * @param {object} options The demo's hooks.
 * @param {HTMLCanvasElement} options.canvas The 3D canvas; picking uses its backing pixels.
 * @param {HTMLElement} options.target The element receiving the pointer (the gizmo's 2D overlay).
 * @param {() => object|null} options.getScene The live EveSpaceScene, or null.
 * @param {() => { view: object, projection: object }} options.getView The camera's view and projection.
 * @param {object} options.driver The EveSpaceSceneRenderDriver drawing the frame.
 * @param {(path: string) => Promise<object>} options.material Loads a Tr2Effect through resMan from a bare resource path.
 * @param {(effectFilePath: string) => string} options.effectPath The bare backend resource path of an effect file.
 * @param {number[]} [options.colour] OutlineColour: linear RGBA.
 * @param {number[]} [options.settings] OutlineSettings: brightness, width in pixels (at most 8), animated, unused.
 * @returns {{ dispose: () => void, readonly hovered: object|null, width: () => number, setWidth: (pixels: number) => void }} The handle.
 */
export function createDemoSelectionOutline({ canvas, target, getScene, getView, driver, material, effectPath,
    getObject = null, ignoreObject = () => null, colour = [1.0, 0.55, 0.1, 1.0], settings = [1.0, 2.0, 0.0, 0.0] })
{
    const viewport = new TriViewport();
    const step = new TriStepRenderObject();
    step.renderOpaque = true;
    step.renderDecal = false;
    step.renderTransparent = false;
    step.renderAdditive = false;

    let enabled = true;
    let hovered = null;
    let disposed = false;
    let pending = null;
    let picking = false;
    let mask = null;
    let silhouette = null;
    const visibilityOffset = [0, 0, 0, 0];
    const targetSize = [0, 0, 0, 0];
    const savedProjection = new Float32Array(16);

    // The effects, loaded once through resMan.
    const effects = {};
    const loading = Promise.all([
        material(effectPath(MASK)).then(effect => { effects.mask = effect; }),
        material(effectPath(SKINNED_MASK)).then(effect => { effects.skinnedMask = effect; }),
        material(effectPath(MASK.replace('selectionmask', 'selectionsilhouette'))).then(effect => { effects.silhouette = effect; }),
        material(effectPath(SKINNED_MASK.replace('selectionmask', 'selectionsilhouette'))).then(effect => { effects.skinnedSilhouette = effect; }),
        material(effectPath(OUTLINE)).then(effect =>
        {
            effect.AddParameterColor("OutlineColour", colour);
            effect.AddParameterVector4("OutlineSettings", settings);
            effect.AddParameterVector4("OutlineTargetSize", targetSize);
            effect.AddParameterVector4("OutlineVisibilityOffset", visibilityOffset);
            effect.RebuildCachedData();
            effects.outline = effect;
        })
    ]).catch(error => console.error("selection outline:", error));

    /**
     * The mask target, matching the scene's depth buffer.
     *
     * @param {object} depth The scene's depth texture.
     * @param {object} renderContext The context.
     * @returns {object} The mask texture.
     */
    function maskFor(depth, renderContext)
    {
        const width = depth.GetWidth();
        const height = depth.GetHeight();
        if (!mask || mask.GetWidth() !== width || mask.GetHeight() !== height)
        {
            if (mask) mask.Destroy();
            if (silhouette) silhouette.Destroy();
            silhouette = new Tr2TextureAL();
            silhouette.Create(Tr2BitmapDimensions.texture2D(width, height, 1, PixelFormat.PIXEL_FORMAT_R8_UNORM),
                { gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE }, renderContext);
            mask = new Tr2TextureAL();
            mask.Create(Tr2BitmapDimensions.texture2D(width, height, 1, PixelFormat.PIXEL_FORMAT_R8_UNORM),
                { gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE }, renderContext);
        }
        return mask;
    }

    /**
     * Pass 1: the hovered ship's visible pixels into the mask.
     *
     * @param {object} offscreen The driver's offscreen colour and depth handles.
     * @param {object} renderContext The context.
     * @returns {boolean} Whether a mask was drawn.
     */
    function renderMask(offscreen, renderContext)
    {
        const object = getObject ? getObject() : hovered;
        if (!enabled || !object || object === ignoreObject() || !effects.mask || !effects.skinnedMask || !effects.silhouette || !effects.skinnedSilhouette) return false;
        // A planet draws in the scene's own planet pass, at planet scale with its
        // own projection, so this main-pass mask cannot trace it; the gizmo marks it.
        // Effect roots contain volumetric children rather than an overrideable mesh. The gizmo marks their selection.
        if (CjsSchema.cast(object, EvePlanet) || CjsSchema.cast(object, EveEffectRoot2)) return false;
        const scene = getScene();
        if (!scene) return false;
        const depth = offscreen.depth.Get();
        const target = maskFor(depth, renderContext);
        const esm = renderContext.GetEffectStateManager();
        // The overlay is composed AFTER temporal AA. Its silhouette must use
        // the stable camera projection or it inherits TAA's frame-by-frame wobble.
        // Keep the visibility pass jittered to match the scene depth exactly.
        savedProjection.set(renderContext.GetProjection());
        visibilityOffset[0] = scene.jitter[0] * target.GetWidth() * 0.5;
        visibilityOffset[1] = -scene.jitter[1] * target.GetHeight() * 0.5;
        try
        {
            renderContext.SetProjection(scene.projection);
            scene.PopulateAndApplyPerFrameData(renderContext);
            driver._BeginRenderPass(esm, [ silhouette ], depth);
            renderContext.Clear({ clearColor: true, color: [ 0, 0, 0, 0 ] });
            step.renderable = object;
            step.effectOverride = IsSkinned(object) ? effects.skinnedSilhouette : effects.silhouette;
            step.Execute(0, 0, renderContext);
        }
        finally
        {
            renderContext.SetProjection(savedProjection);
            scene.PopulateAndApplyPerFrameData(renderContext);
            step.renderable = null;
        }
        driver._BeginRenderPass(esm, [ target ], depth);
        // Colour only: an unflagged Clear clears depth too (to 1, the nearest
        // value under reverse-Z), which empties the mask and the post
        // process's depth.
        renderContext.Clear({ clearColor: true, color: [ 0, 0, 0, 0 ] });
        step.renderable = object;
        step.effectOverride = IsSkinned(object) ? effects.skinnedMask : effects.mask;
        step.Execute(0, 0, renderContext);
        step.renderable = null;
        return true;
    }

    /**
     * Pass 2: the line around the mask, over the finished frame.
     *
     * @param {object} destination The frame's render target.
     * @param {object} renderContext The context.
     */
    function renderOutline(destination, renderContext)
    {
        if (!effects.outline || !mask) return;
        const esm = renderContext.GetEffectStateManager();
        esm.SetRenderTarget(0, destination);
        esm.SetDepthStencilBuffer(null);
        targetSize[0] = destination.GetWidth();
        targetSize[1] = destination.GetHeight();
        effects.outline.SetParameter__Vector4("OutlineTargetSize", targetSize);
        effects.outline.SetParameter__Vector4("OutlineVisibilityOffset", visibilityOffset);
        effects.outline.SetParameter__TextureAL("SelectionMask", mask);
        effects.outline.SetParameter__TextureAL("SelectionSilhouette", silhouette);
        Tr2Renderer.drawScreenQuad(renderContext, effects.outline);
    }

    // The seam between the main pass and the post process.
    const postProcess = driver._PostProcess;
    driver._PostProcess = function(destination, offscreen, renderContext)
    {
        const drawn = !disposed && renderMask(offscreen, renderContext);
        const result = postProcess.call(this, destination, offscreen, renderContext);
        if (drawn) renderOutline(destination, renderContext);
        return result;
    };

    /** Picks at the latest pointer position; one pick is in flight at a time. */
    async function pick()
    {
        if (picking) return;
        picking = true;
        try
        {
            while (pending && !disposed)
            {
                const { x, y } = pending;
                pending = null;
                const scene = getScene();
                const view = getView();
                viewport.width = canvas.width;
                viewport.height = canvas.height;
                const object = scene ? await scene.PickObject(x, y, view.projection, view.view, viewport) : null;
                hovered = enabled && object ? CjsSchema.cast(object, EveSpaceObject2) : null;
            }
        }
        finally
        {
            picking = false;
        }
    }

    const onMove = event =>
    {
        // A left drag orbits the camera: the outline stays on the ship it was
        // on, wherever the pointer goes, until the button is released.
        if (!enabled || getObject || event.buttons & 1) return;
        const rect = target.getBoundingClientRect();
        pending = {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
        };
        pick().catch(error => console.error("selection outline:", error));
    };
    const onLeave = event =>
    {
        if (event.buttons & 1) return;
        pending = null;
        hovered = null;
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerleave", onLeave);

    /**
     * Sets the line width, OutlineSettings.y, in pixels (1 to 8, the shader's reach).
     *
     * @param {number} pixels The width.
     */
    function setWidth(pixels)
    {
        settings[1] = Math.min(8, Math.max(1, Number(pixels) || 1));
        if (!effects.outline) return;
        const parameter = effects.outline.constParameters.find(candidate => candidate.name === "OutlineSettings");
        parameter.value[1] = settings[1];
        effects.outline.RebuildCachedData();
    }

    return {
        loading,
        width: () => settings[1],
        setWidth,
        setEnabled(value) { enabled = !!value; if (!enabled) { pending = null; hovered = null; } },
        setColour(value) {
            colour.splice(0, 4, ...value);
            const parameter = effects.outline?.constParameters.find(candidate => candidate.name === "OutlineColour");
            if (parameter) { parameter.value.set ? parameter.value.set(colour) : parameter.value.splice(0, 4, ...colour); effects.outline.RebuildCachedData(); }
        },
        get hovered() { return hovered; },
        dispose()
        {
            if (disposed) return;
            disposed = true;
            driver._PostProcess = postProcess;
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerleave", onLeave);
            hovered = null;
            if (mask) mask.Destroy();
            if (silhouette) silhouette.Destroy();
        }
    };
}
