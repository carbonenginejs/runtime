// A real EVE hull drawn with its own shader, through the shipped path.
//
// IT DRAWS. The operator saw the af1 hull's silhouette in Chrome on 2026-09-10 -
// white and unshaded, because nothing fills the material's textures or constants
// yet, but the right shape in the right place. af1 has been loaded in a browser
// before; it had not been drawn THROUGH TRINITY, and that is what is new.
//
// IT KEEPS DRAWING NOW, and getting there took three separate faults in this
// file, each of which looked like the engine failing:
//
//   1. The pixel count asked the canvas context for its CURRENT texture rather
//      than the one the frame rendered into, read an empty image, and reported
//      zero while the hull was on screen.
//   2. That zero triggered the cull-inverted diagnostic frame automatically,
//      which drew nothing over the hull. It is opt-in now, `?cull=invert`.
//   3. One presented frame does not stay on a WebGPU canvas, so the page draws
//      every animation tick. When THAT stopped after a dozen frames it was
//      because `Unpack` threw - see its note - and one throw ended the loop
//      silently. The loop now survives a failed frame and records why.
//
// THE LIT-PIXEL COUNT WAS NOT EVIDENCE until 2026-09-26: the readback was
// submitted after an await, by which time the canvas had presented and the
// swap-chain texture was destroyed ("Destroyed texture used in a submit"), so it
// read zero with the hull on screen. `Frame` now submits the copy first. That
// fix is unverified on a real adapter; until it is, THE CANVAS IS THE ORACLE,
// and headless screenshots are pure black regardless.
//
// Measured correct, on a real adapter, as of 2026-09-10:
//
//   - the pipeline: cull back / front-face cw / depth less-equal with write,
//     one bgra8unorm target, no blending - the states `quadv5` authors;
//   - the vertex layout: all seven attributes at the right offsets over a
//     72-byte stride, matched to the program's declared inputs;
//   - the draw: `drawIndexed(19155, 1, 217332, 0, 0)` - 6385 triangles, with
//     the suballocated buffer's index offset folded into `firstIndex` and the
//     vertex allocation at zero, so `baseVertex` is correctly zero;
//   - the pass: colour and depth both CLEAR, depth cleared to 1, both stored;
//   - the constants: the per-frame block lands at b1 and the per-object block
//     at b3, the two registers the vertex stage declares, at the dynamic
//     offsets the arena handed out, and the sixteen floats at `cb1[4..7]` are
//     byte-for-byte the transposed view-projection this file computed;
//   - the geometry bytes: position followed by a unit-length normal at the
//     declared offsets, so the interleave is right;
//   - winding: checkable by running the frame again with the cull mode inverted
//     through the state manager's own override - `?cull=invert`;
//   - the fragment shader: no `discard` anywhere and alpha hard-coded to 1, so
//     it cannot be silently throwing fragments away;
//   - no WebGPU validation error, with an error scope around the frame.
//
// THE MATERIAL IS THE SHIP'S OWN NOW. The built SOF document for
// `dna:/af1_t1:amarrbase:amarr` carries the area's whole effect, so
// `Tr2Effect.from` produces the real material - its constant parameters, and a
// `TriTextureParameter` per map named as the shader declares it - and each of
// those loads its DDS from the client. Only the effect RESOURCE is substituted,
// because the document names the dx11 `.fx` and this backend needs the WebGPU
// container of the same effect. Ten maps load; six 1024x1024 BC textures reach
// the device, plus the two 1x1 dummies the backend still fills unbound slots
// with.
//
// TWO THINGS HAD TO BE DONE BY HAND, and both are honest gaps rather than
// shortcuts. The device asks for `texture-compression-bc` so EVE's BC7 and BC5
// maps can be uploaded as they are; without it the reader decodes to RGBA8. And
// each resource is marked LOADED then PREPARED explicitly, because no resource
// manager is running here and `RealizeTexture` refuses anything not prepared -
// the first attempt loaded all ten maps and bound none of them.
//
// Nothing here hands the backend a pipeline. The frame runs the way Carbon's
// does: `EveSpaceSceneRenderDriver` sequences it, `CjsBatchManager` collects,
// `Tr2RenderContext.RenderBatches` walks the accumulator and calls the
// abstraction layer's verbs, and every draw resolves its own pipeline inside the
// verb that issued it. The previous version of this demo injected a
// hand-written pipeline past the container and was deleted with the dispatcher
// it composed; this one has no such hook, because there is no longer anywhere to
// put it.
//
// WHERE THE WGSL COMES FROM, AND WHY THAT IS THE POINT. tools-core serves
// translated WebGPU effect containers of its own, under
// `graphics/effect.webgpu/`, built by `CjsToolShaderBuilderWebgpu`. A container
// from that tree is an ordinary Carbon v15 container whose stage programs happen
// to be WGSL text, so `Tr2EffectRes` reads it with no special case, and
// `Tr2EffectStateManager` hands those bytes to `CreateShader` exactly as it
// would hand DXBC to a DX12 backend. The shader this demo draws with is the
// shipped `quadv5` - 5 KB of vertex WGSL and 21 KB of fragment WGSL - not a
// stand-in.
//
// THE OVERLAY IS PINNED TO AN EXACT BUILD. Those containers live in a persistent
// resource overlay, and overlays are only opened for an exact build number, so
// `latest` does not see them and returns 404. The runner's proxy pins the build;
// see its TOOLS_CORE default.
//
// WHAT IS STILL STUBBED, AND IT IS THE SCENE. A full `EveSpaceScene` needs SOF
// data; this supplies the four things the driver asks a scene for - its
// renderables and its two per-frame blocks, plus no-op update hooks. The
// per-frame matrices are computed here rather than by a scene graph, which is
// honest: they are the scene's to own (`BindPerFrameVSData` reads
// `scene.GetPerFrameVSData()`), and a camera is not what this demo is testing.
// Everything below the scene is real - the declaration translated by
// `Tr2MeshBase`, the vertex layout built from it against the program's declared
// inputs, the draw arguments from the LOD's areas, the render states the effect
// authors, the resource set laid out against the program's bindings.

import { Tr2GpuResourcePool } from "../../../../npm/dist/trinity/core/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../../npm/dist/trinity/core/context/Tr2RenderContext.js";
import { EveComponentType } from "../../../../npm/dist/trinity/eve/EveComponentTypes.js";
import { CjsBatchManager, Tr2QuadRenderer, Tr2LightManager, Tr2MeshArea, Tr2MeshBase, Tr2RenderContext, Tr2Renderer, Tr2RingBuffer, Tr2RingBufferOffsets, Tr2VariableStore, RawData, TriRenderBatchAccumulator } from "../../../../npm/dist/trinity/core/index.js";
import { TR2SHADERMODEL } from "../../../../npm/dist/global/consts/graphics/index.js";
import { Tr2RenderTarget } from "../../../../npm/dist/trinity/core/device/Tr2RenderTarget.js";
import { Tr2ReflectionProbe } from "../../../../npm/dist/trinity/core/Tr2ReflectionProbe.js";
import { RealizeTexture } from "../../../../npm/dist/trinity/core/Tr2ImageIOHelpers.js";
import { ResolveEffectPath, SetEffectPathDefaults } from "../../../../npm/dist/global/utils/effectPath.js";
import { ExFlag, PixelFormat, TextureType } from "../../../../npm/dist/global/consts/renderContext/index.js";
import { CjsWebgpuDevice } from "../../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL, CjsWebgpuRenderTarget } from "../../../../npm/dist/trinityal/webgpu/internal.js";
import { EveChildPostProcessVolume, EveEffectRoot2, EveEllipsoidVolume, EveShip2, EveSpaceScene, EveSpaceSceneRenderDriver, Tr2OcclusionBuffer, Tr2PostProcess2, Tr2PostProcessAttributes, Tr2PostProcessRenderer, Tr2PPDynamicExposureEffect, Tr2PPTonemappingEffect, Tr2SSAO, TriFloat } from "../../../../npm/dist/trinity/index.js";
import "../../../../npm/dist/audio/index.js";
import { EveSOF } from "../../../../npm/dist/sof/index.js";
import { RegisterGeometryResources } from "../../../../npm/dist/resource/index.js";
import { RegisterObjectResources } from "../../../../npm/dist/resource/object/index.js";
import { hydrateDemoShip, retireDemoShips, replaceDemoShip } from "./demoShipLifetime.js";
import { createDemoSkinChange, resolveDemoDefaultDna } from "./demoSkinSelection.js";
import { CjsModel } from "../../../../npm/dist/global/model/index.js";
import { createDemoFramePump } from "./demoFramePump.js";
import { gTriDev } from "../../../../npm/dist/trinity/core/device/gTriDev.js";
import { Tr2Effect, Tr2EffectStateManager, TriTextureParameter } from "../../../../npm/dist/trinity/shader/index.js";
import { RegisterShaderResources } from "../../../../npm/dist/resource/shader/index.js";
import CjsWebgpuFormat from "../../../../npm/dist/resource/formats/webgpu/index.js";
import { CjsGr2Format } from "../../../../npm/dist/resource/formats/gr2/index.js";
import { CjsBlackFormat } from "../../../../npm/dist/resource/formats/black/index.js";
import { POST_TEMPLATES } from "./postTemplates.js";
import { createDemoActions } from "./demoActions.js";
import { createEffectFields, createPostProcessPanel } from "./postProcessPanel.js";
import { createCameraControls, readShipBounds } from "./cameraControls.js";
import { createDemoInput } from "./input.js";
import { createViewportCapture } from "./screenshot.js";
import { Tr2MainWindow } from "../../../../npm/dist/input/index.js";
import { blue, BlueResFileSystemRemote, RemoteFileCache } from "../../../../npm/dist/global/blue/index.js";
import {
  ResourceRequirement,
  RegisterSolidColorTexture,
  RegisterTextureArray,
  RegisterTexturePack,
  RegisterTextureResources
} from "../../../../npm/dist/resource/index.js";
import { CjsCmfFormat } from "../../../../npm/dist/resource/formats/cmf/index.js";
import { RenderingMode, TriBatchType } from "../../../../npm/dist/global/consts/graphics/index.js";
import { mat4 } from "../../../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../../../npm/dist/global/math/vec3.js";
import { EveCamera } from "../../../../npm/dist/trinity/eve/camera/EveCamera.js";
import { decodeTangentFrame } from "../../../../npm/dist/global/math/tangent.js";


/**
 * The shader quality tier. TESTING ALWAYS USES `.sm_depth` (operator rule,
 * 2026-09-26): it is the HIGHEST tier - not a depth pass - the one carrying the
 * local lights, and the largest instruction set the translator must cover.
 * `?tier=hi` or `?tier=lo` picks another tier for comparison only.
 */
const TIER = new URLSearchParams(globalThis.location?.search ?? "").get("tier") || "depth";

/**
 * `?post=off` runs with an empty post process (copy, sharpen, tonemap only).
 * The driver still renders into its own targets, as Carbon always does, so
 * the scene depth the high-tier shaders sample stays published.
 */
const POST_PARAMETER = new URLSearchParams(globalThis.location?.search ?? "").get("post") ?? "";
const POST_OFF = POST_PARAMETER === "off";

/**
 * `?post=<template>` hands the driver a shipped Tr2PostProcess2 as the scene's
 * post process: a bare name reads `res:/dx9/postprocess/environmenttemplate/
 * <name>.black` (the 177 environment templates), a name with a slash is a
 * resource path of its own.
 */
const POST_TEMPLATE = POST_OFF ? "" : POST_PARAMETER;

/** `?flare=<name>`: the sun lens flare, from res:/fisfx/lensflare/; `off` for none. Without it the sun template names the flare. */
const FLARE_PARAMETER = new URLSearchParams(globalThis.location?.search ?? "").get("flare") ?? "";

/**
 * SUN AND LOCATION. Carbon takes fog, god rays, tonemapping, dynamic exposure,
 * TAA and the generic effect from the scene's default post process only
 * (EveSpaceScene.cpp:392-399); every other effect blends in by priority from
 * the ITr2PostProcessOwners, such as EveChildPostProcessVolume (:358-390). The
 * game's default is the system sun's template, and a site's template arrives
 * as a volume. `?post=` routes by name: an `env_sun_*` template is the sun,
 * anything else the locationPost, whose sun then follows the flare.
 *
 * @param {string} name A template name or a resource path.
 * @returns {boolean} Whether it is a sun template.
 */
function IsSunTemplate(name)
{
  return /(?:^|\/)env_sun_[^/]*$/u.test(String(name).replace(/\.black$/u, ""));
}

/**
 * The sun template matching a lens flare: `env_sun_<flare>_01a`, else its
 * colour's (`blue_small` → `env_sun_blue_01a`), else yellow; none for `off`.
 *
 * @param {string} flareName A res:/fisfx/lensflare/ name, or "off".
 * @returns {string} A sun template name, or "".
 */
function SunTemplateForFlare(flareName)
{
  if (flareName === "off") return "";
  for (const candidate of [ `env_sun_${flareName}_01a`, `env_sun_${flareName.split("_")[0]}_01a` ])
  {
    if (Object.hasOwn(POST_TEMPLATES, candidate)) return candidate;
  }
  return "env_sun_yellow_01a";
}

/**
 * The lens flare for a sun template. A template is `env_` and a sun model's
 * file name, and a flare is that model name without `sun_` and its variant
 * (`env_sun_blue_sun_01a` → `sun_blue_sun_01a` → `blue_sun`). skindr
 * measured the rule against every sun and flare (web/src/api/StarFlares.mjs):
 * only the Triglavian suns spell it backwards, and their template is not an
 * `env_sun_*` one. Null when nothing is left to name a flare.
 *
 * @param {string} template A sun template name.
 * @returns {string|null} A res:/fisfx/lensflare/ name, or null.
 */
function FlareForSunTemplate(template)
{
  const name = String(template).replace(/^env_sun_/u, "").replace(/_\d+[a-z]$/u, "");
  return name && name !== template && !/^\d+[a-z]?$/u.test(name) ? name : null;
}

/** The sun template to start with: a `?post=` sun, else the `?flare=`'s, else yellow. */
const POST_SUN = POST_OFF ? "" : (POST_TEMPLATE && IsSunTemplate(POST_TEMPLATE) ? POST_TEMPLATE : SunTemplateForFlare(FLARE_PARAMETER || "yellow"));

/** `?flare=<name>` overrides the sun template's own flare; `off` for none. */
const FLARE = FLARE_PARAMETER || (POST_SUN ? FlareForSunTemplate(POST_SUN) : null) || "yellow";

/** The location template to start with: a `?post=` that is not a sun. */
const POST_LOCATION = POST_TEMPLATE && !IsSunTemplate(POST_TEMPLATE) ? POST_TEMPLATE : "";

/**
 * The location volume's ellipsoid radii in metres: full strength inside
 * `inner`, fading to nothing at `outer` (EveEllipsoidVolume.GetIntensity).
 * Large enough by default that the orbiting camera sits at full strength.
 */
const LOCATION_RADII = { inner: 100000, outer: 200000 };

/**
 * The Tr2PostProcess2 slots whose render pass Tr2PostProcessRenderer does not
 * port yet: each throws by name when reached. The demo empties them on the
 * loaded template and names them, so the ported passes can be seen working on
 * a real template before the rest exist. Remove a slot here as its pass lands.
 */
const UNPORTED_POST_SLOTS = [ "taa" ];

/**
 * Reads a post-process template and empties the slots whose pass is not
 * ported, reporting both halves.
 *
 * @param {string} name A template name or a resource path.
 * @returns {Promise<{postProcess: object, path: string, populated: string[], skipped: string[]}>}
 */
async function LoadPostTemplate(name)
{
  const path = name.includes("/") ? name.replace(/^res:\/+/u, "") : `dx9/postprocess/environmenttemplate/${name}.black`;
  const postProcess = CjsBlackFormat.read(await ResourceBytes(path), { emit: "runtime" }).root;
  const slots = [
    "colorCorrection", "tonemapping", "lut", "luts", "desaturate", "vignette", "fade", "filmGrain", "signalLoss",
    ...UNPORTED_POST_SLOTS
  ];
  const populated = slots.filter(slot => Array.isArray(postProcess[slot]) ? postProcess[slot].length : postProcess[slot]);
  const skipped = populated.filter(slot => UNPORTED_POST_SLOTS.includes(slot));

  for (const slot of skipped) postProcess[slot] = null;

  return { postProcess, path: `res:/${path}`, populated, skipped };
}

/**
 * THE SETTINGS PANEL: live controls over what the post process runs, so a
 * pass can be switched on and off against the same frame without a reload.
 *
 * - post: on, or off (the driver's direct path, as `?post=off`).
 * - template: any shipped environment template, or none.
 * - quality: Tr2PostProcessRenderer's PostProcess::Quality; each effect has
 *   its own minimum (Tr2PostProcess2 GetXIfAvailable).
 * - effects: one switch per slot the loaded template populates; off empties
 *   the slot, on puts the template's own effect back.
 * - anti-aliasing: the driver's antiAliasingQuality, which Carbon turns into a
 *   TAA effect on the scene's default post process (PropagateSettings).
 * - ambient occlusion: the driver's aoQuality, which enables the driver's
 *   Tr2SSAO at a quality and gives the depth pass a normal map.
 * - shadows: the driver's shadowQuality; low and high give the scene its
 *   cascaded shadow map (PropagateSettings).
 * - sun: the scene's sun direction (the way the light travels), live.
 * - flare: the sun's lens flare, any of res:/fisfx/lensflare/*.black, or off.
 *
 * @param {object} options
 * @param {EveSpaceSceneRenderDriver} options.driver The demo's driver.
 * @param {{off: boolean}} options.postState The frame loop's post switch.
 * @param {string} options.initialTemplate The starting sun template, if any.
 * @param {(name: string) => Promise<object|null>} options.select Loads a sun template.
 * @param {() => object|null} options.current The loaded sun template record.
 * @param {{initial: string, select: (name: string) => Promise<object|null>, radii: {inner: number, outer: number}, setRadii: () => void, intensity: () => number|null, priority: () => number, setPriority: (value: number) => void, mode: () => string, setMode: (value: string) => void, mergeOrder: () => object[]}} options.locationPost
 *   The location volume: its template picker, radii and resolved intensity.
 * @param {{direction: Float32Array}} options.sun The demo's one sun.
 * @param {{current: string, select: (name: string) => Promise<void>}} options.flare The lens flare.
 * @param {() => void} options.aimSun Puts the sun behind the hull, as the camera sees it.
 * @returns {void}
 */
/**
 * The ship's dirt level from the weeks since it was last cleaned.
 *
 * CLIENT LOGIC, NOT CARBON: Carbon has no such function; the EVE client
 * computes the level and hands the engine m_dirtLevel. The formula came from
 * the game's developers and was correct as of 2022, when it entered ccpwgl as
 * EveSpaceObject2.getDirtLevelFromWeeks (1dade15b). It may have changed since;
 * the quad shaders that read the level have not moved much. A disabled or
 * non-numeric age gives 0.
 *
 * @param {number} weeks Weeks since the ship was last cleaned.
 * @param {boolean} [isDisabled] Dirt switched off.
 * @returns {number} The dirt level, never below 0.
 */
/**
 * The ship states a hull's controllers read, as presets: warp, docked, siege
 * and attack mode. After skindr's ShipControls (web/src/render/ShipControls.mjs,
 * FLAGS and FLAG_SHAPE): a variable belongs to a state when its name names the
 * subject AND has the shape of a state flag (`IsWarping`, `isDocked`,
 * `InSiegeMode`), so `WarpTopSpeed` or `WarpDirection` never receive a 1.
 *
 * Unlike skindr, one call sets a state: Carbon's SetControllerVariable reaches
 * the hull's controllers, effect children and overlays, and replays onto any
 * added later. skindr's drivesSomething filter is not ported, so every state a
 * hull's controllers name is offered.
 */
const SHIP_STATE_FLAGS = [
  { kind: "warp", label: "warp", test: /warp/iu },
  { kind: "dock", label: "docked", test: /dock/iu },
  { kind: "siege", label: "siege", test: /siege/iu },
  { kind: "attack", label: "attack mode", test: /attack|aggress|combat/iu }
];
const SHIP_STATE_SHAPE = /^_?(?:[iI]s|[iI]n|[hH]as|[uU]se)[A-Z]|(?:^|_|[a-z])(?:Mode|On|Enabled|Active|Requested)$/u;

/**
 * The state presets a ship's controllers name, with the variable names behind
 * each.
 *
 * @param {object} ship The EveShip2.
 * @returns {{kind: string, label: string, names: string[]}[]} One per state found.
 */
function ShipStates(ship)
{
  const byKind = new Map();
  const seen = new Set();
  const visit = owner =>
  {
    if (!owner || seen.has(owner)) return;
    seen.add(owner);
    for (const controller of owner.controllers ?? [])
    {
      for (const variable of controller?.variables ?? [])
      {
        const name = variable?.name ?? "";
        const flag = SHIP_STATE_FLAGS.find(entry => entry.test.test(name));
        if (!flag || !SHIP_STATE_SHAPE.test(name)) continue;
        if (!byKind.has(flag.kind)) byKind.set(flag.kind, { kind: flag.kind, label: flag.label, names: new Set() });
        byKind.get(flag.kind).names.add(name);
      }
    }
    for (const child of owner.effectChildren ?? []) visit(child);
    for (const overlay of owner.overlayEffects ?? []) visit(overlay);
  };
  visit(ship);
  return SHIP_STATE_FLAGS
    .filter(flag => byKind.has(flag.kind))
    .map(flag => ({ ...byKind.get(flag.kind), names: [ ...byKind.get(flag.kind).names ] }));
}

/** Demo settings and help reflect the same command table used by keyboard input. */
function BuildCameraPanel({ controls, input, actions, liveInput })
{
  const panel = document.createElement("details");
  panel.id = "camera-controls";
  panel.append(Object.assign(document.createElement("summary"), { textContent: "Camera and shortcuts" }));
  document.getElementById("settings").append(panel);
  const note = document.createElement("p");
  note.textContent = liveInput
    ? "Focus the viewport to use shortcuts. Drag to orbit; Shift+drag or middle drag to pan. Wheel dollies; Shift+wheel changes FOV."
    : "Still frame: live controls are disabled.";
  panel.append(note);
  const status = Object.assign(document.createElement("output"), { role: "status" });
  const row = (label, control) => { const element=document.createElement("label");element.append(label,control);panel.append(element);return control; };
  const field = (label,value,min,max,step,change) => {
    const control=row(label,Object.assign(document.createElement("input"),{type:"number",value:String(value),min:String(min),max:String(max),step:String(step),disabled:!liveInput}));
    control.addEventListener("change",()=>{
      const value=Number(control.value);
      if(!Number.isFinite(value)||value<min||value>max){status.textContent=`${label}: choose ${min} to ${max}`;return;}
      input.cancel();change(value);status.textContent="";
    });return control;
  };
  const degrees=field("Field of view (degrees)",controls.getPose().fieldOfView*180/Math.PI,5,120,1,value=>controls.setFieldOfView(value*Math.PI/180));
  for(const [name,label] of [["invertX","Invert horizontal orbit"],["invertY","Invert vertical orbit"]]){
    const toggle=row(label,Object.assign(document.createElement("input"),{type:"checkbox",checked:controls.preferences[name],disabled:!liveInput}));
    toggle.addEventListener("change",()=>{input.cancel();controls.preferences[name]=toggle.checked;});
  }
  field("Orbit sensitivity",controls.preferences.orbitSensitivity,.001,2,.01,value=>{controls.preferences.orbitSensitivity=value;});
  field("Pan sensitivity",controls.preferences.panSensitivity,.01,10,.1,value=>{controls.preferences.panSensitivity=value;});
  field("Dolly sensitivity",controls.preferences.dollySensitivity,.00001,.02,.0001,value=>{controls.preferences.dollySensitivity=value;});
  field("FOV sensitivity",controls.preferences.fovSensitivity,.00001,.02,.0001,value=>{controls.preferences.fovSensitivity=value;});
  const buttons = new Map();
  for(const name of ["frame","reset","capture"]){
    const command=input.getBindings().find(item=>item.name===name);
    const button=row(command.label,Object.assign(document.createElement("button"),{type:"button",textContent:command.label}));
    button.addEventListener("click",()=>input.invoke(name));buttons.set(name,button);
  }
  const help=document.createElement("div");panel.append(help);
  const select=row("Action to rebind",document.createElement("select"));
  for(const command of input.getBindings())select.append(new Option(command.label,command.name));
  const key=row("Press a new key",Object.assign(document.createElement("input"),{type:"text",readOnly:true,placeholder:"Focus here, then press a key",disabled:!liveInput}));
  key.addEventListener("keydown",event=>{
    if(event.code==="Tab"||event.ctrlKey||event.altKey||event.metaKey||event.isComposing)return;
    event.preventDefault();
    try{input.rebind(select.value,[{code:event.code,shift:event.shiftKey}]);key.value=`${event.shiftKey?"Shift+":""}${event.code}`;status.textContent="";}
    catch(error){status.textContent=error.message;}
  });
  const unbind=row("Clear selected binding",Object.assign(document.createElement("button"),{type:"button",textContent:"Unbind",disabled:!liveInput}));
  unbind.addEventListener("click",()=>input.rebind(select.value,[]));
  const reset=row("Restore shortcuts",Object.assign(document.createElement("button"),{type:"button",textContent:"Defaults",disabled:!liveInput}));
  reset.addEventListener("click",()=>input.resetBindings());
  panel.append(status);
  const refresh=()=>{
    help.replaceChildren();
    for(const command of input.getBindings()){
      const line=document.createElement("div");
      line.textContent=`${command.label}: ${command.bindings.map(binding=>`${binding.shift?"Shift+":""}${binding.code}`).join(", ")||"unbound"}${command.enabled?"":" (unavailable)"}`;
      help.append(line);
      if(buttons.has(command.name))buttons.get(command.name).disabled=!command.enabled;
    }
  };
  const offInput=input.subscribe(refresh),offActions=actions.subscribe(refresh);
  const offControls=controls.subscribe(pose=>{if(document.activeElement!==degrees)degrees.value=String(Math.round(pose.fieldOfView*180/Math.PI*100)/100);});
  refresh();
  return ()=>{offInput();offActions();offControls();panel.remove();};
}


function DirtLevelFromWeeks(weeks, isDisabled = false)
{
  if (isDisabled || Number.isNaN(Number(weeks))) return 0;
  return Math.max(0.7 - 1 / (Math.pow(Math.max(Number(weeks), 0), 0.65) + 1 / 2.7), 0);
}

function BuildSettingsPanel({ actions, driver, postState, initialTemplate, select, current, locationPost, sun, flare, aimSun, age, clientDefaults, speed, maxSpeed, kills, damage, effect, cloak, skin, shipStates = [], setShipState })
{
  const document = globalThis.document;
  if (!document) return;

  const style = document.createElement("style");
  // EVE's own UI face, straight from the client (res:/ui/fonts) through the
  // runner's resource proxy: CCP's font is read, never copied into this repo.
  style.textContent = `
    @font-face { font-family: "Eve Sans Neue"; src: url("/resource/ui/fonts/evesansneue-regular.otf") format("opentype"); font-weight: 400; }
    @font-face { font-family: "Eve Sans Neue"; src: url("/resource/ui/fonts/evesansneue-bold.otf") format("opentype"); font-weight: 700; }
    #settings { position: fixed; top: 12px; left: 12px; z-index: 2; width: min(400px, calc(100vw - 24px)); box-sizing: border-box; padding: 8px 10px;
                background: transparent; border: none; color: #cfd6e4; text-shadow: 0 0 3px #000, 0 0 1px #000;
                font: 13px/1.6 "Eve Sans Neue", system-ui, sans-serif; }
    #settings summary { font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    #settings summary { cursor: pointer; }
    #settings label { display: flex; justify-content: space-between; gap: 8px; align-items: center; min-width: 0; }
    #settings select { max-width: 60%; min-width: 0; font: inherit; color: inherit; background: #000; border: 1px solid #2a3444; }
    #settings .columns { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
    #settings .column { min-width: 0; }
    #settings .column h4 { margin: 4px 0 2px; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: #8a93a3; }
    #settings .merge { margin: 0 0 4px; font-size: 11px; line-height: 1.5; color: #aab3c2; }
    #settings .group { margin: 4px 0 6px; padding: 2px 0 4px; }
    #settings .group h5 { margin: 0; font-size: 10px; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: #8a93a3; }
    #settings .merge div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #settings .effects { margin-top: 4px; padding-top: 4px; }
    #settings .note { color: #8a93a3; }
    #settings .fields { margin: 0 0 4px 10px; color: #aab3c2; }
    #settings .fields summary { font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 11px; }
    #settings .fields input[type=number], #settings .fields input[type=text] { width: 96px; font: inherit; color: inherit; background: #000; border: 1px solid #2a3444; }
    #settings { max-height: calc(100vh - 24px); overflow-x: hidden; overflow-y: auto; }
    #settings .sun { display: flex; gap: 4px; }
    #settings .sun input[type=range] { width: 50px; margin: 0; }
    #settings .slider { display: flex; gap: 6px; align-items: center; }
    #settings .slider input[type=range] { width: 100px; margin: 0; }
    #settings .slider output { width: 70px; text-align: right; font-size: 11px; color: #aab3c2; }
  `;
  document.head.append(style);

  const panel = document.createElement("details");
  panel.id = "settings";
  panel.open = true;
  panel.innerHTML = `<summary>Settings</summary>`;
  document.body.append(panel);

  // ONE COLUMN IN TOPIC SECTIONS - scene and post, ship, sun and engine - each
  // holding titled groups of related controls (operator, 2026-09-28).
  const grid = document.createElement("div");
  grid.className = "columns";
  panel.append(grid);
  const columns = [ "scene and post", "ship", "sun and engine" ].map(title =>
  {
    const column = document.createElement("div");
    column.className = "column";
    column.append(Object.assign(document.createElement("h4"), { textContent: title }));
    grid.append(column);
    return column;
  });
  let target = columns[0];
  const row = (label, control) =>
  {
    const element = document.createElement("label");
    element.append(label, control);
    target.append(element);
    return control;
  };
  // RELATED CONTROLS SIT TOGETHER: a titled box holding a control and the
  // read-outs it moves (begin/end bracket the rows that go in it).
  const begin = title =>
  {
    const box = Object.assign(document.createElement("div"), { className: "group" });
    box.append(Object.assign(document.createElement("h5"), { textContent: title }));
    target.append(box);
    target = box;
  };
  const end = () => { target = target.parentElement; };
  const choose = (options, value) =>
  {
    const control = document.createElement("select");
    for (const [ text, optionValue ] of options) control.append(new Option(text, String(optionValue)));
    control.value = String(value);
    return control;
  };

  const postToggle = row("post", Object.assign(document.createElement("input"), { type: "checkbox", checked: !postState.off }));
  postToggle.addEventListener("change", () => actions.invoke("post", postToggle.checked));
  const exposureWhenPostDisabled = row("auto exposure when post is disabled", Object.assign(document.createElement("input"), { type: "checkbox", checked: postState.autoExposureWhenPostDisabled }));
  exposureWhenPostDisabled.addEventListener("change", () => actions.invoke("autoExposureWhenPostDisabled", exposureWhenPostDisabled.checked));

  const templateNames = Object.keys(POST_TEMPLATES);
  const templates = choose([ [ "(none)", "" ], ...templateNames.filter(IsSunTemplate).map(name => [ name, name ]) ], initialTemplate);
  // THE SUN TEMPLATE IS THE ONE SUN CHOICE: it sets the scene's default post
  // process and names the flare. The flare picker stays as an override, and
  // the read-out says when the two disagree.
  begin("sun");
  row("template", templates);
  // The flare list is the client's own folder, read through the resource proxy.
  const flares = row("flare override", choose([ [ "off", "off" ], [ flare.current, flare.current ] ], flare.current));
  flares.addEventListener("change", async () => { await flare.select(flares.value); UpdatePairing(); });
  fetch("/resource/fisfx/lensflare/")
    .then(response => response.json())
    .then(listing =>
    {
      const names = listing.children.map(child => child.name).filter(name => name.endsWith(".black")).map(name => name.slice(0, -".black".length));
      flares.replaceChildren(...[ "off", ...names ].map(name => new Option(name, name)));
      flares.value = flare.current;
      UpdatePairing();
    })
    .catch(error => console.error(`lens flare list: ${error.message}`));
  const pairing = row("sun / flare", Object.assign(document.createElement("output"), { value: "" }));
  end();
  const UpdatePairing = () =>
  {
    const expected = templates.value ? FlareForSunTemplate(templates.value) : null;
    pairing.value = !expected ? "-" : flare.current === expected ? "match" : `flare ${flare.current}, template names ${expected}`;
  };

  // THE LOCATION IS A VOLUME: its template blends in by the camera's place in
  // the ellipsoid, which the volume resolves every frame; the read-out shows it.
  const locations = choose([ [ "(none)", "" ], ...templateNames.filter(name => !IsSunTemplate(name)).map(name => [ name, name ]) ], locationPost.initial);
  begin("location");
  row("location template", locations);
  locations.addEventListener("change", async () =>
  {
    locations.disabled = true;
    try
    {
      await locationPost.select(locations.value);
    }
    catch (error)
    {
      console.error(`location ${locations.value}: ${error.message}`);
    }
    finally
    {
      locations.disabled = false;
      // In "replaces scene default" mode the location IS the default, so the
      // effect switches follow it.
      RebuildEffects();
    }
  });
  // LOCATION MODE: a volume blends the location over the sun's default; the
  // other choice makes the location template the scene default itself, which
  // is how a client could bring a site's fog and god rays in (the Triglavian
  // override is one such case). The flare follows the sun either way.
  const mode = row("location mode", choose([ [ "volume", "volume" ], [ "replaces scene default", "replace" ] ], locationPost.mode()));
  mode.addEventListener("change", () => { locationPost.setMode(mode.value); RebuildEffects(); });
  end();

  // Falloff: the radii and the intensity they resolve to at the camera.
  begin("location falloff");
  for (const key of [ "inner", "outer" ])
  {
    const input = row(`location ${key} (m)`, Object.assign(document.createElement("input"), { type: "number", min: "0", step: "1000", value: String(locationPost.radii[key]) }));
    input.addEventListener("change", () =>
    {
      locationPost.radii[key] = Math.max(0, Number(input.value) || 0);
      locationPost.setRadii();
    });
  }
  const intensity = row("intensity at camera", Object.assign(document.createElement("output"), { value: "-" }));
  end();

  // Carbon's PostProcessEnums::Priority names (Tr2PostProcessEnums.h:58-66);
  // the attribute's priority is that enum, so only its values are offered.
  const priorityNames = [ "SCENE_DEFAULT_PRIORITY", "LOW_PRIORITY", "MEDIUM_PRIORITY", "HIGH_PRIORITY", "UI_PRIORITY" ];
  const PriorityName = value => priorityNames.find(name => Tr2PostProcessAttributes[name] === value) ?? String(value);
  begin("priority");
  const priority = row("location priority", choose(priorityNames.map(name => [ name, Tr2PostProcessAttributes[name] ]), locationPost.priority()));
  priority.addEventListener("change", () => locationPost.setPriority(Number(priority.value)));
  row("scene default priority", Object.assign(document.createElement("output"), {
    value: `SCENE_DEFAULT_PRIORITY (${Tr2PostProcessAttributes.SCENE_DEFAULT_PRIORITY})`
  }));
  target.append(Object.assign(document.createElement("div"), { textContent: "merge order" }));
  const mergeOrder = Object.assign(document.createElement("div"), { className: "merge" });
  target.append(mergeOrder);
  end();
  setInterval(() =>
  {
    const value = locationPost.intensity();
    intensity.value = value === null ? "- (no location)" : value.toFixed(3);
    const lines = locationPost.mergeOrder()
      .map(source => `${source.name}: ${PriorityName(source.priority)}, ${source.intensity.toFixed(3)}`);
    mergeOrder.replaceChildren(...(lines.length ? lines : [ "-" ]).map(line => Object.assign(document.createElement("div"), { textContent: line, title: line })));
  }, 250);

  // What the EVE client adds to the scene's default post process: tonemapping
  // and dynamic exposure where the template has none (see ApplyClientDefaults).
  const clientToggle = row("client defaults", Object.assign(document.createElement("input"), { type: "checkbox", checked: clientDefaults.enabled() }));
  clientToggle.addEventListener("change", () => clientDefaults.set(clientToggle.checked));

  const { Quality, AntiAliasingQuality } = EveSpaceSceneRenderDriver;
  const quality = row("quality", choose([ [ "low", Quality.LOW ], [ "medium", Quality.MEDIUM ], [ "high", Quality.HIGH ] ], driver.postProcess.GetPostProcessingQuality()));
  quality.addEventListener("change", () => driver.postProcess.SetPostProcessingQuality(Number(quality.value)));

  const antiAliasing = row("anti-aliasing", choose(Object.entries(AntiAliasingQuality).map(([ name, value ]) => [ name.toLowerCase(), value ]), driver.antiAliasingQuality));
  antiAliasing.addEventListener("change", () => { driver.antiAliasingQuality = Number(antiAliasing.value); });

  const { AmbientOcclusionQuality } = EveSpaceSceneRenderDriver;
  const ambientOcclusion = row("ambient occlusion", choose(Object.entries(AmbientOcclusionQuality).map(([ name, value ]) => [ name.toLowerCase(), value ]), driver.aoQuality));
  ambientOcclusion.addEventListener("change", () => { driver.aoQuality = Number(ambientOcclusion.value); });

  const { ShadowQuality } = EveSpaceSceneRenderDriver;
  const shadowChoices = [ [ "disabled", ShadowQuality.SHADOW_DISABLED ], [ "low", ShadowQuality.SHADOW_LOW ], [ "high", ShadowQuality.SHADOW_HIGH ] ];
  const shadows = row("shadows", choose(shadowChoices, driver.shadowQuality));
  shadows.addEventListener("change", () => { driver.shadowQuality = Number(shadows.value); });

  // Distortion: the DISTORTION batches warp the scene colour (Distortion.fx).
  const distortion = row("distortion", Object.assign(document.createElement("input"), { type: "checkbox", checked: driver.enableDistortion }));
  distortion.addEventListener("change", () => { driver.enableDistortion = distortion.checked; });

  target = columns[1];

  // Ship speed and max speed, both editable (operator, 2026-09-29), like
  // Graphite's panel that drives the ball and the object together. The
  // defaults keep the authoring convention: max speed 1, so the slider (0 to
  // 2 x max) reads 1 at full speed and 2 with a propulsion module. A real
  // max speed (m/s) gives trails their real distance.
  const shipMaxSpeed = Object.assign(document.createElement("input"), { type: "number", min: "0.01", step: "any", value: String(maxSpeed()) });
  row("max speed", shipMaxSpeed);
  const shipSpeed = Object.assign(document.createElement("input"), { type: "range", min: "0", max: String(2 * maxSpeed()), step: String(maxSpeed() / 100), value: "0" });
  const shipSpeedReadout = document.createElement("output");
  const shipSpeedField = Object.assign(document.createElement("span"), { className: "slider" });
  shipSpeedField.append(shipSpeed, shipSpeedReadout);
  row("speed", shipSpeedField);
  const showSpeed = () => { shipSpeedReadout.value = Number(shipSpeed.value).toFixed(2); };
  shipSpeed.addEventListener("input", () => { speed(Number(shipSpeed.value)); showSpeed(); });
  shipMaxSpeed.addEventListener("change", () =>
  {
    const previous = Number(shipSpeed.max) / 2;
    const next = Math.max(0.01, Number(shipMaxSpeed.value) || 1);
    const ratio = previous > 0 ? Number(shipSpeed.value) / previous : 0;
    maxSpeed(next);
    shipSpeed.max = String(2 * next);
    shipSpeed.step = String(next / 100);
    shipSpeed.value = String(ratio * next);
    speed(Number(shipSpeed.value));
    showSpeed();
  });
  showSpeed();

  // Kill marks: the ship's kill count, which its kill-counter decals display.
  const killCount = Object.assign(document.createElement("input"), { type: "range", min: "0", max: "999", step: "1", value: String(KILLS) });
  const killCountReadout = document.createElement("output");
  const killCountField = Object.assign(document.createElement("span"), { className: "slider" });
  killCountField.append(killCount, killCountReadout);
  row("kills", killCountField);
  const showKills = () => { killCountReadout.value = killCount.value; };
  killCount.addEventListener("input", () => { kills(Number(killCount.value)); showKills(); });
  showKills();

  // Damage: remaining shield, armor and hull, 0 to 1 (SetImpactDamageState),
  // and the five module animations Carbon names (SetImpactAnimation), which
  // fade on and off rather than taking a level.
  const damageLevels = { shield: 1, armor: 1, hull: 1 };
  for (const name of [ "shield", "armor", "hull" ])
  {
    const level = Object.assign(document.createElement("input"), { type: "range", min: "0", max: "1", step: "0.01", value: "1" });
    const levelReadout = document.createElement("output");
    const levelField = Object.assign(document.createElement("span"), { className: "slider" });
    levelField.append(level, levelReadout);
    row(name, levelField);
    const showLevel = () => { levelReadout.value = Number(level.value).toFixed(2); };
    level.addEventListener("input", () =>
    {
      damageLevels[name] = Number(level.value);
      damage(damageLevels.shield, damageLevels.armor, damageLevels.hull);
      showLevel();
    });
    showLevel();
  }
  // The shield two draw only while their kick-in runs (HasShieldActivity reads
  // IsKickInZero, EveImpactOverlay.cpp:337), so each switch-on plays once: a
  // button. The armor and hull three stay on while their fader is up
  // (IsZero): a checkbox.
  for (const name of [ "shieldhardening", "shieldboost" ])
  {
    const play = row(name, Object.assign(document.createElement("button"), { type: "button", textContent: "play" }));
    play.addEventListener("click", () => effect(name, true));
  }
  for (const name of [ "armorhardening", "armorrepair", "hullrepair" ])
  {
    const toggle = row(name, Object.assign(document.createElement("input"), { type: "checkbox", checked: false }));
    toggle.addEventListener("change", () => effect(name, toggle.checked));
  }

  // Cloak: the cloaking overlay's 6 s curve set dissolves the hull; unticking
  // removes it and restores the ship.
  const cloakToggle = row("cloak", Object.assign(document.createElement("input"), { type: "checkbox", checked: false }));
  cloakToggle.addEventListener("change", () => { cloak(cloakToggle.checked)?.catch(error => console.warn(error.message)); });

  // Ship states (ShipStates): each preset sets every variable its hull's
  // controllers name for that state, and the state machines do the rest.
  const statesBox = document.createElement("div");
  target.append(statesBox);
  const stateControls = new Map();
  let stateRevision = -1;

  // Skin change: swaps between the start DNA and angelbase through the
  // client skin-change transition (3 s).
  const skinButton = row("skin", Object.assign(document.createElement("button"), { type: "button", textContent: "change" }));
  skinButton.addEventListener("click", () => { skin()?.catch(error => console.warn(error.message)); });
  const actionStatus = Object.assign(document.createElement("output"), { role: "status" });
  target.append(actionStatus);
  const unsubscribe = actions.subscribe(state => {
    postToggle.checked=state.post;cloakToggle.checked=state.cloaked;
    exposureWhenPostDisabled.checked = state.autoExposureWhenPostDisabled;
    cloakToggle.disabled=!actions.enabled("cloak");skinButton.disabled=!actions.enabled("skin");
    shipSpeed.value=String(state.speed);shipMaxSpeed.value=String(state.maxSpeed);
    shipSpeed.max=String(2*state.maxSpeed);shipSpeed.step=String(state.maxSpeed/100);showSpeed();
    killCount.value=String(state.kills);showKills();
    actionStatus.textContent=[...state.pending.map(name=>name+" pending"),...Object.entries(state.errors).map(([name,error])=>name+": "+error)].join("; ");
    if(stateRevision!==state.revision){
      stateRevision=state.revision;statesBox.replaceChildren();stateControls.clear();
      statesBox.append(Object.assign(document.createElement("h5"),{textContent:"Ship state"}));
      if(!state.shipStates.length)statesBox.append(document.createTextNode("This hull exposes no controller state."));
      for(const current of state.shipStates){
        const toggle=Object.assign(document.createElement("input"),{type:"checkbox",title:current.names.join(", ")});
        const label=document.createElement("label");label.append(current.label,toggle);statesBox.append(label);
        toggle.addEventListener("change",()=>setShipState(current.kind,toggle.checked));stateControls.set(current.kind,toggle);
      }
    }
    for(const current of state.shipStates)stateControls.get(current.kind).checked=current.on;
  });

  // Ship age in weeks since last cleaned; the dirt level follows the game's
  // curve, which is flat past a few years, so the slider stops at five.
  const shipAge = Object.assign(document.createElement("input"), { type: "range", min: "0", max: "260", step: "1", value: "0" });
  const shipAgeReadout = document.createElement("output");
  const shipAgeField = Object.assign(document.createElement("span"), { className: "slider" });
  shipAgeField.append(shipAge, shipAgeReadout);
  row("ship age", shipAgeField);
  const showAge = () => { shipAgeReadout.value = `${shipAge.value}w · ${DirtLevelFromWeeks(Number(shipAge.value)).toFixed(2)}`; };
  shipAge.addEventListener("input", () => { age(Number(shipAge.value)); showAge(); });
  showAge();

  target = columns[2];

  // The sun as three sliders, x y z on one line; a zero vector is ignored
  // rather than normalised.
  const sunInputs = [ 0, 1, 2 ].map(index => Object.assign(document.createElement("input"), { type: "range", min: "-1", max: "1", step: "0.01", title: "xyz"[index], value: String(Math.round(sun.direction[index] * 100) / 100) }));
  const sunFields = Object.assign(document.createElement("span"), { className: "sun" });
  sunFields.append(...sunInputs);
  row("sun", sunFields);

  // Behind the hull from where the camera is now: the one placement that is
  // certainly on screen, which god rays need.
  const aim = Object.assign(document.createElement("button"), { type: "button", textContent: "behind hull" });
  aim.addEventListener("click", () =>
  {
    aimSun();
    sunInputs.forEach((input, index) => { input.value = String(Math.round(sun.direction[index] * 100) / 100); });
  });
  row("sun", aim);
  for (const input of sunInputs)
  {
    input.addEventListener("input", () =>
    {
      const values = sunInputs.map(element => Number(element.value));
      if (values.every(Number.isFinite) && values.some(value => value !== 0)) sun.direction.set(values);
    });
  }

  // The engine's registered settings (Tr2Renderer.getSettings(), Carbon's
  // trinity.settings), one control per setting, written straight through.
  const engineSettings = document.createElement("details");
  engineSettings.innerHTML = `<summary>engine settings</summary>`;
  target.append(engineSettings);
  const registry = Tr2Renderer.getSettings();
  for (const name of registry.GetNames())
  {
    const { valueType, applies, enum: enumType, values, carbon } = registry.FindSetting(name);
    const value = registry.GetValue(name);
    const enumValues = typeof enumType === "string" ? blue.enums.GetEnum(enumType) : enumType;
    const options = enumValues
      ? Object.entries(enumValues).filter(([ , optionValue ]) => typeof optionValue === "number")
      : values?.map(optionValue => [ String(optionValue), optionValue ]);
    const control = options
      ? choose(options, value)
      : valueType === "boolean"
        ? Object.assign(document.createElement("input"), { type: "checkbox", checked: value })
        : Object.assign(document.createElement("input"), { type: valueType === "number" ? "number" : "text", value: String(value), step: "any" });
    control.addEventListener("change", () =>
    {
      const next = valueType === "boolean" ? control.checked : valueType === "number" ? Number(control.value) : control.value;
      registry.SetValue(name, next);
    });
    // A change to a "create" or "load" setting shows only on the next object
    // made or the next ship built. A setting Carbon does not have is marked.
    const element = document.createElement("label");
    const label = `${name}${carbon ? "" : " (ours)"}${applies === "always" ? "" : ` (next ${applies})`}`;
    element.append(label, control);
    engineSettings.append(element);
  }

  const effects = document.createElement("div");
  effects.className = "effects";
  target.append(effects);

  // One switch per populated slot; the template's own effect is kept aside so
  // switching back on restores exactly what the file held.
  const RebuildEffects = () =>
  {
    effects.replaceChildren();
    const record = current();
    if (!record)
    {
      effects.append(Object.assign(document.createElement("div"), { className: "note", textContent: "no template: copy, sharpen, tonemap" }));
      return;
    }

    // READ THE SLOTS NOW, not the list taken at load: in the browser some
    // effects were attached after LoadPostTemplate listed them (ghostworld
    // listed three of seven while all seven ran), so the load-time list hid
    // switches for effects that were drawing.
    const live = [
      "colorCorrection", "tonemapping", "lut", "luts", "desaturate", "vignette", "fade", "filmGrain", "signalLoss",
      "bloom", "godRays", "fog", "dynamicExposure", "depthOfField", "taa"
    ].filter(slot => Array.isArray(record.postProcess[slot]) ? record.postProcess[slot].length : record.postProcess[slot]);

    // The template's own effects, kept on the record so a rebuild after a
    // switch was turned off still offers it back.
    const saved = record.saved ??= {};
    for (const slot of live) saved[slot] ??= record.postProcess[slot];

    for (const slot of new Set([ ...record.populated, ...Object.keys(saved) ]))
    {
      const unported = record.skipped.includes(slot);
      const toggle = Object.assign(document.createElement("input"), { type: "checkbox", checked: !unported && record.postProcess[slot] === saved[slot], disabled: unported });
      const label = document.createElement("label");
      label.append(unported ? `${slot} (not ported)` : slot, toggle);
      effects.append(label);

      toggle.addEventListener("change", () =>
      {
        record.postProcess[slot] = toggle.checked ? saved[slot] : (Array.isArray(saved[slot]) ? [] : null);
      });

      // PER-EFFECT SETTINGS: the effect's own numbers, switches and vectors,
      // edited in place on the object the renderer reads next frame.
      const effect = saved[slot];
      if (effect && !Array.isArray(effect) && !unported) effects.append(EffectFields(effect));
    }
  };

  // The same controls serve the persistent live post-process panel.
  const EffectFields = effect => createEffectFields(effect, { document }).element;

  templates.addEventListener("change", async () =>
  {
    templates.disabled = true;
    try
    {
      await select(templates.value);
      const paired = templates.value ? FlareForSunTemplate(templates.value) : null;
      if (paired && [ ...flares.options ].some(option => option.value === paired))
      {
        flares.value = paired;
        await flare.select(paired);
      }
      UpdatePairing();
    }
    catch (error)
    {
      console.error(`template ${templates.value}: ${error.message}`);
    }
    finally
    {
      templates.disabled = false;
      RebuildEffects();
      setTimeout(RebuildEffects, 1500);
    }
  });

  RebuildEffects();
  setTimeout(RebuildEffects, 1500);
  panel.addEventListener("toggle", () => { if (panel.open) RebuildEffects(); });
  return () => { unsubscribe(); panel.remove(); style.remove(); };
}

/**
 * A ship DNA taken apart: `hull:faction:race`, then `command?arg;arg` clauses
 * (src/sof/EveSOFDNA.js). `material` and its skin spelling `mesh` both carry
 * one material per generic material prefix; clauses the panel does not edit
 * (`variant`, `class`, `layout`...) are kept verbatim.
 *
 * @param {string} dna A ship DNA.
 * @returns {{hull: string, faction: string, race: string, materialCommand: string, materials: string[]|null, pattern: string[]|null, respathinsert: string|null, others: string[]}}
 */
function ParseShipDna(dna)
{
  const [ hull = "", faction = "", race = "", ...clauses ] = String(dna).split(":");
  const parsed = { hull, faction, race, materialCommand: "material", materials: null, pattern: null, respathinsert: null, others: [] };
  for (const clause of clauses)
  {
    const [ command, args = "" ] = clause.split("?");
    const values = args.split(";");
    if (command === "material" || command === "mesh")
    {
      parsed.materialCommand = command;
      parsed.materials = values;
    }
    else if (command === "pattern") parsed.pattern = values;
    else if (command === "respathinsert") parsed.respathinsert = values[0];
    else parsed.others.push(clause);
  }
  return parsed;
}

/**
 * The inverse of ParseShipDna. The material clause is written only when a
 * material is chosen (blank slots become `none`); the respathinsert clause
 * only when one is chosen, so its absence keeps the faction's own insert
 * (EveSOFDNA.cpp:963-964), while `none` suppresses it.
 *
 * @param {ReturnType<typeof ParseShipDna>} parts The DNA's parts.
 * @returns {string} The DNA.
 */
function FormatShipDna(parts)
{
  const clauses = [ parts.hull, parts.faction, parts.race ];
  if (parts.materials && parts.materials.some(Boolean))
  {
    clauses.push(`${parts.materialCommand}?${parts.materials.map(value => value || "none").join(";")}`);
  }
  if (parts.pattern && parts.pattern[0])
  {
    clauses.push(`pattern?${parts.pattern[0]};${parts.pattern[1] || "none"};${parts.pattern[2] || "none"}`);
  }
  if (parts.respathinsert !== null) clauses.push(`respathinsert?${parts.respathinsert}`);
  clauses.push(...parts.others);
  return clauses.join(":");
}

/**
 * THE SHIP PANEL: load a ship by type and skin, or edit its SOF DNA directly,
 * as the cppc harness and the Blender tools do. Either side fills the other:
 * a type/skin resolves to its DNA (tools-core dna/resolve), and an edited DNA
 * finds its type/skin by an exact record match (dna/search, `exact`). SDE
 * routes are pinned to the SDE build and SOF catalogs to the resources build
 * (the get-eve-resources skill: `latest` is two builds). The chosen DNA loads
 * through `apply` and goes into the URL as `?dna=`, so a view can be shared.
 *
 * @param {object} options
 * @param {string} options.initialDna The DNA the page started with.
 * @param {(dna: string, typeID: string|null) => Promise<unknown>} options.apply Loads explicit DNA and its known type.
 * @param {number} [options.materialCount=4] Generic material prefixes.
 */
async function BuildShipPanel({ initialDna, apply, materialCount = 4 })
{
  const document = globalThis.document;
  if (!document) return;

  const style = document.createElement("style");
  style.textContent = `
    #ship { position: fixed; top: 52px; right: 12px; z-index: 2; width: 300px; padding: 8px 10px;
            max-height: calc(100vh - 64px); overflow: auto;
            background: transparent; border: none; color: #cfd6e4; text-shadow: 0 0 3px #000, 0 0 1px #000;
            font: 13px/1.6 "Eve Sans Neue", system-ui, sans-serif; }
    #ship summary { font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer; }
    #ship h4 { margin: 6px 0 2px; font-size: 11px; color: #8a93a3; text-transform: uppercase; letter-spacing: 0.04em; }
    #ship label { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    #ship input, #ship select { width: 170px; font: inherit; color: inherit; background: #000; border: 1px solid #2a3444; }
    #ship textarea { width: 100%; box-sizing: border-box; font: 11px/1.4 monospace; color: inherit; background: #000; border: 1px solid #2a3444; }
    #ship .note { color: #8a93a3; font-size: 11px; min-height: 1.4em; }
    #ship button { font: inherit; }
  `;
  document.head.append(style);

  const panel = document.createElement("details");
  panel.id = "ship";
  panel.open = true;
  panel.innerHTML = "<summary>Ship</summary>";
  document.body.append(panel);

  const heading = text => panel.append(Object.assign(document.createElement("h4"), { textContent: text }));
  const row = (label, control) =>
  {
    const element = document.createElement("label");
    element.append(label, control);
    panel.append(element);
    return control;
  };
  const listInput = name =>
  {
    const list = Object.assign(document.createElement("datalist"), { id: `ship-${name}` });
    panel.append(list);
    const input = Object.assign(document.createElement("input"), { type: "text", spellcheck: false });
    input.setAttribute("list", list.id);
    return { input, fill: values => list.replaceChildren(...values.map(value => new Option(value, value))) };
  };
  const select = () => document.createElement("select");
  const note = Object.assign(document.createElement("div"), { className: "note" });

  // THE PAGE'S OWN BUILD, never `latest`: the runner reports the resource
  // build its bytes come from (and where tools-core is), so no catalog lists a
  // hull this build lacks. tools-core answers cross-origin, so the page asks it
  // directly; `?tools=` points elsewhere.
  const pageBuild = await (await fetch("/build")).json();
  const origin = new URLSearchParams(globalThis.location?.search ?? "").get("tools") || pageBuild.tools;
  const getJson = async path =>
  {
    const response = await fetch(`${origin}${path}`);
    const body = await response.json();
    if (!response.ok || body.error) throw new Error(body.error ?? `${path}: ${response.status}`);
    return body;
  };

  // Two facets (the get-eve-resources skill): resource routes take the page's
  // resource build, SDE routes the SDE that build reports.
  const { builds } = await getJson(`/eve/${pageBuild.resources}/build`);
  const sde = `/eve/${builds.sde}`;
  const resources = `/eve/${builds.resources}`;

  // TYPE AND SKIN.
  heading("Type");
  const search = row("search", Object.assign(document.createElement("input"), { type: "search", placeholder: "ship name" }));
  const typeSelect = row("type", select());
  const skinSelect = row("skin", select());

  // SOF.
  heading("SOF");
  const hull = listInput("hull");
  const faction = listInput("faction");
  const race = select();
  row("hull", hull.input);
  row("faction", faction.input);
  row("race", race);
  const material = listInput("material");
  const materialInputs = [];
  for (let index = 0; index < materialCount; index++)
  {
    const input = Object.assign(document.createElement("input"), { type: "text", spellcheck: false, placeholder: "(none)" });
    input.setAttribute("list", "ship-material");
    materialInputs.push(row(`material${index + 1}`, input));
  }
  const pattern = listInput("pattern");
  row("pattern", pattern.input);
  const patternMaterials = [ 1, 2 ].map(index =>
  {
    const input = Object.assign(document.createElement("input"), { type: "text", spellcheck: false, placeholder: "(none)" });
    input.setAttribute("list", "ship-material");
    return row(`pattern material${index}`, input);
  });
  const respathinsert = row("respathinsert", select());

  heading("DNA");
  const dnaText = Object.assign(document.createElement("textarea"), { rows: 3, spellcheck: false });
  panel.append(dnaText);
  const load = Object.assign(document.createElement("button"), { type: "button", textContent: "load" });
  panel.append(load, note);

  // Catalogs. WORKAROUND: the per-hull pattern route
  // (/sof/hulls/<hull>/patterns/) fails for every hull while one pattern file
  // (cny_2025_triglavian.black) names itself cny_2026_triglavian, so the full
  // pattern list stands in until tools-core is fixed; it can offer patterns
  // the hull has no data for.
  const [ hulls, factions, races, materials, patterns ] = await Promise.all(
    [ "hulls", "factions", "races", "materials", "patterns" ].map(name => getJson(`${resources}/sof/${name}`)));
  hull.fill(hulls);
  faction.fill(factions);
  race.replaceChildren(...races.map(name => new Option(name, name)));
  material.fill([ "none", ...materials ]);
  pattern.fill(patterns);

  // THE THREE respathinsert STATES (EveSOFDNA.cpp:963-964): no clause keeps
  // the faction's insert, "none" suppresses it, a name replaces it.
  const FACTION_DEFAULT = "\u0000faction";
  const fillInserts = async (hullName, current) =>
  {
    let inserts = [];
    try { inserts = await getJson(`${resources}/sof/hulls/${encodeURIComponent(hullName)}/respathinserts`); }
    catch { inserts = []; }
    const names = [ ...new Set([ ...inserts, ...(current && current !== "none" ? [ current ] : []) ]) ];
    respathinsert.replaceChildren(new Option("(faction default)", FACTION_DEFAULT), new Option("none", "none"), ...names.map(name => new Option(name, name)));
    respathinsert.value = current === null ? FACTION_DEFAULT : current;
  };

  const readFields = previous => ({
    hull: hull.input.value.trim(),
    faction: faction.input.value.trim(),
    race: race.value,
    materialCommand: previous.materialCommand,
    materials: materialInputs.map(input => input.value.trim()),
    pattern: [ pattern.input.value.trim(), ...patternMaterials.map(input => input.value.trim()) ],
    respathinsert: respathinsert.value === FACTION_DEFAULT ? null : respathinsert.value,
    others: previous.others
  });

  let parts = ParseShipDna(initialDna);
  const writeFields = async next =>
  {
    parts = next;
    hull.input.value = next.hull;
    faction.input.value = next.faction;
    race.value = next.race;
    materialInputs.forEach((input, index) => { input.value = next.materials?.[index] && next.materials[index] !== "none" ? next.materials[index] : ""; });
    pattern.input.value = next.pattern?.[0] ?? "";
    patternMaterials.forEach((input, index) =>
    {
      const value = next.pattern?.[index + 1];
      input.value = value && value !== "none" ? value : "";
    });
    await fillInserts(next.hull, next.respathinsert);
    dnaText.value = FormatShipDna(next);
  };

  // Types found by name, kept to ships and anything with a model: published
  // types that carry a graphicID. Skins list the type's SKIN records.
  const fillSkins = async (typeID, selected = "") =>
  {
    const { items } = await getJson(`${sde}/sde/skins?field=types&contains=${typeID}&limit=200`);
    skinSelect.replaceChildren(new Option("(default)", ""), ...items.map(item => new Option(item.payload.internalName ?? `skin ${item.id}`, item.id)));
    skinSelect.value = String(selected ?? "");
  };
  const setType = async (typeID, name, skinID = "") =>
  {
    if (![ ...typeSelect.options ].some(option => option.value === String(typeID)))
    {
      typeSelect.replaceChildren(new Option(name, String(typeID)));
    }
    typeSelect.value = String(typeID);
    await fillSkins(typeID, skinID);
  };
  const clearType = () =>
  {
    typeSelect.replaceChildren();
    skinSelect.replaceChildren();
  };

  // DNA -> type/skin: the exact record match only; none clears the type side.
  const findType = async dna =>
  {
    try
    {
      const { matches = [] } = await getJson(`${sde}/dna/search?q=${encodeURIComponent(dna)}&limit=40`);
      const match = matches.find(entry => entry.exact && entry.dna === dna) ?? matches.find(entry => entry.exact);
      if (!match) { clearType(); return; }
      const type = await getJson(`${sde}/sde/types/${match.typeID}`);
      await setType(match.typeID, type.payload?.name?.en ?? `type ${match.typeID}`, match.skinID ?? "");
    }
    catch (error) { clearType(); note.textContent = error.message; }
  };

  const loadDna = async (dna, typeID = null) =>
  {
    note.textContent = `loading ${dna}`;
    try
    {
      await apply(dna, typeID);
      const url = new URL(globalThis.location.href);
      url.searchParams.set("dna", dna);
      globalThis.history.replaceState(null, "", url);
      note.textContent = "";
    }
    catch (error) { note.textContent = `load failed: ${error.message}`; }
  };

  // Type/skin -> DNA: resolve, fill the SOF side, load.
  // A search result is a type ("typeID") or a skin on its type ("typeID:skinID").
  const selectedTypeID = () => typeSelect.value.split(":")[0];
  const resolveSelection = async () =>
  {
    if (!typeSelect.value) return;
    const skin = skinSelect.value ? `&skinID=${skinSelect.value}` : "";
    try
    {
      const { dna } = await getJson(`${sde}/dna/resolve?typeID=${selectedTypeID()}${skin}`);
      await writeFields(ParseShipDna(dna));
      await loadDna(dna, selectedTypeID());
    }
    catch (error) { note.textContent = `no DNA: ${error.message}`; }
  };

  let searchTimer = null;
  let skinLibrary = null;
  search.addEventListener("input", () =>
  {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () =>
    {
      const query = search.value.trim();
      if (query.length < 2) return;
      // TYPES AND SKINS BY NAME, as skindr searches: the SKIN library's name
      // index (`/skin`, `names`: lowercased name -> type and skin entries),
      // loaded once. Types are kept only when they have a graphic (a thing
      // that can be drawn); that also drops SKIN licence items, which are
      // graphic-less types named like their skin.
      skinLibrary ??= getJson(`${sde}/skin`);
      const { names, skins } = await skinLibrary;
      const needle = query.toLowerCase();
      const results = [];
      for (const [ name, entries ] of Object.entries(names))
      {
        if (!name.includes(needle)) continue;
        for (const entry of entries)
        {
          if (entry.kind === "type" && entry.graphicID !== null) results.push([ name, String(entry.typeID) ]);
          else if (entry.kind === "skin") results.push([ skins[entry.skinID]?.internalName ?? name, `${entry.typeID}:${entry.skinID}` ]);
        }
        if (results.length >= 200) break;
      }
      typeSelect.replaceChildren(new Option(`${results.length} found`, ""), ...results.map(([ label, value ]) => new Option(label, value)));
      skinSelect.replaceChildren();
    }, 250);
  });
  typeSelect.addEventListener("change", async () =>
  {
    if (!typeSelect.value) return;
    const [ typeID, skinID = "" ] = typeSelect.value.split(":");
    await fillSkins(typeID, skinID);
    await resolveSelection();
  });
  skinSelect.addEventListener("change", resolveSelection);

  // SOF edits -> DNA text and the type side; loading waits for "load".
  const onSofEdit = async () =>
  {
    const next = readFields(parts);
    if (next.hull !== parts.hull) await fillInserts(next.hull, next.respathinsert);
    parts = next;
    dnaText.value = FormatShipDna(next);
    await findType(dnaText.value);
  };
  for (const control of [ hull.input, faction.input, race, ...materialInputs, pattern.input, ...patternMaterials, respathinsert ])
  {
    control.addEventListener("change", onSofEdit);
  }
  dnaText.addEventListener("change", async () =>
  {
    await writeFields(ParseShipDna(dnaText.value.trim()));
    await findType(dnaText.value.trim());
  });
  load.addEventListener("click", () => loadDna(dnaText.value.trim(), selectedTypeID() || null));

  await writeFields(parts);
  await findType(initialDna);
}

/**
 * Resolves the selected hull's unskinned appearance through the page's pinned SDE.
 * This is client UI behavior; SOF has no hull.defaultFaction field.
 *
 * @param {string} dna Current skin DNA.
 * @param {number|string|null} typeID Explicit type selection, when known.
 * @returns {Promise<string>} Same-hull default DNA.
 */
async function ResolveDefaultSkinDna(dna, typeID)
{
  const page = await (await fetch("/build")).json();
  const origin = new URLSearchParams(globalThis.location?.search ?? "").get("tools") || page.tools;
  const getJson = async path =>
  {
    const response = await fetch(origin + path);
    const body = await response.json();
    if (!response.ok || body.error) throw new Error(body.error ?? `${path}: ${response.status}`);
    return body;
  };
  const { builds } = await getJson(`/eve/${page.resources}/build`);
  const sde = `/eve/${builds.sde}`;
  return resolveDemoDefaultDna(dna, typeID, {
    search: query => getJson(`${sde}/dna/search?q=${encodeURIComponent(query)}&limit=500`),
    resolve: id => getJson(`${sde}/dna/resolve?typeID=${encodeURIComponent(id)}`)
  });
}

/**
 * DIAGNOSTIC COUNTS for `demo.post()`. Tr2Renderer's draw verbs return
 * whether they drew; an effect that has not loaded, or a blit with no
 * material, returns false and throws nothing - which is how a black canvas
 * with no error happens. Counting them per verb says which step drew nothing.
 */
const DRAW_COUNTS = {};
for (const verb of [ "DrawScreenQuad", "DrawTexture" ])
{
  const original = Tr2Renderer.prototype[verb];
  Tr2Renderer.prototype[verb] = function (...args)
  {
    const result = original.apply(this, args);
    const key = `${verb}:${result ? "drew" : "nothing"}`;
    DRAW_COUNTS[key] = (DRAW_COUNTS[key] ?? 0) + 1;
    if (verb === "DrawScreenQuad") CaptureExposureBinding(args[1]);
    return result;
  };
}

/**
 * WHAT TAA AND TAACOPY BIND FOR "Exposure", captured at the draw (RenderTaa
 * nulls the parameter right after). Both shaders divide by an exposure read
 * from that buffer; the black frame reads as exposure 0, while the pool's
 * "Exposure Buffer" holds a measured value. This says which buffer the draw
 * really had: the parameter's, the description's, and the bind group's.
 */
const EXPOSURE_BINDINGS = {};

function CaptureExposureBinding(effect)
{
  const path = effect?.GetEffectPathName?.() ?? "";
  const name = /\/taacopy\.fx$/iu.test(path) ? "taaCopy" : /\/taa\.fx$/iu.test(path) ? "taa" : null;
  if (!name) return;

  const pool = POOL_BUFFERS.get("Exposure Buffer") ?? null;
  const poolDevice = pool?.GetDeviceBuffer?.() ?? null;
  const held = effect.GetResourceByName("Exposure")?.gpuBuffer?.GetGpuBuffer?.() ?? null;
  const passes = [];

  (effect.parametersForPasses ?? []).forEach((technique, techniqueIndex) => (technique?.passes ?? []).forEach((pass, passIndex) =>
  {
    const srvBuffers = (pass.resourceSetDesc?.m_srv ?? []).filter(record => record.type === 1).map(record => record.buffer === pool ? "pool Exposure Buffer" : record.buffer ? "another buffer" : "null");
    const entries = pass.resourceSet?.m_resourceSet?.implementation?.m_entries ?? null;
    const bound = entries
      ? [ ...entries ].filter(([ , entry ]) => entry?.buffer).map(([ key, entry ]) => ({ slot: key, buffer: entry.buffer === poolDevice ? "pool Exposure Buffer" : `${entry.buffer.label || "unlabelled"} (${entry.buffer.size} B)` }))
      : "no resource set";
    passes.push({ technique: techniqueIndex, pass: passIndex, srvBuffers, bound });
  }));

  EXPOSURE_BINDINGS[name] = {
    option: effect.GetOption("DYNAMIC_EXPOSURE_TOGGLE"),
    parameterHoldsPoolBuffer: pool ? held === pool : "no pool buffer yet",
    poolHasDeviceBuffer: Boolean(poolDevice),
    passes
  };
}
{
  const original = Tr2Renderer.runComputeShader;
  Tr2Renderer.runComputeShader = function (...args)
  {
    const result = original.apply(this, args);
    const key = `runComputeShader:${result ? "dispatched" : "nothing"}`;
    DRAW_COUNTS[key] = (DRAW_COUNTS[key] ?? 0) + 1;
    return result;
  };
}

/**
 * `?stage=` SKIPS POST-PROCESS STAGES to find the one that writes black.
 * nosharpen: CAS is skipped. notonemap: tonemapping becomes a plain copy of
 * its input (the texture it would read as BlitOriginal). raw: both.
 */
const STAGE = new URLSearchParams(globalThis.location?.search ?? "").get("stage") ?? "";
if (STAGE === "nosharpen" || STAGE === "raw")
{
  const original = Tr2PostProcessRenderer.prototype.RenderSharpening;
  Tr2PostProcessRenderer.prototype.RenderSharpening = function (_enable, ...args)
  {
    return original.call(this, false, ...args);
  };
}
if (STAGE === "notonemap" || STAGE === "raw")
{
  Tr2PostProcessRenderer.prototype.RenderTonemapping = function (dest, _postprocess, renderContext, renderer)
  {
    const source = this.tonemappingEffect.GetResourceByName("BlitOriginal").GetTextureProvider().GetTexture();
    const esm = renderContext.GetEffectStateManager();

    esm.PushRenderTarget(dest);
    try
    {
      renderer.DrawTexture(renderContext, source);
    }
    finally
    {
      esm.PopRenderTarget();
    }
  };
}

/**
 * THE POOL'S TEXTURES BY NAME, for `demo.readback()`: the last texture each
 * name was borrowed as. The pool keeps them after they are freed, so their
 * contents from the last frame can still be read.
 */
const POOL_TEXTURES = new Map();
{
  const original = Tr2GpuResourcePool.prototype.GetTempTexture;
  Tr2GpuResourcePool.prototype.GetTempTexture = function (name, description)
  {
    const handle = original.call(this, name, description);
    POOL_TEXTURES.set(name, handle.Get());
    return handle;
  };
}

/**
 * THE CASCADES' DRAWS, for `demo.shadows()`: every RenderBatches with the
 * "Shadow" technique since the last report, and the batches they walked.
 */
const SHADOW_DRAWS = { calls: 0, batches: 0 };
{
  const original = Tr2RenderContext.prototype.RenderBatches;
  Tr2RenderContext.prototype.RenderBatches = function (batches, techniqueName, ...rest)
  {
    if (techniqueName === "Shadow")
    {
      SHADOW_DRAWS.calls += 1;
      SHADOW_DRAWS.batches += batches?.GetBatchCount?.() ?? 0;
    }
    return original.call(this, batches, techniqueName, ...rest);
  };
}

/**
 * What reached the cascaded atlas: per cell of its 8 x 2 grid, the texels
 * nearer than the clear (depth below 1) and the nearest depth. Read from the
 * float copy's staging buffer (CjsWebgpuTextureAL._depthShadow), which holds
 * the atlas as it was when the shadow pass unbound it.
 *
 * @param {GPUDevice} device The device.
 * @param {object} atlas The atlas's CjsWebgpuTextureAL.
 * @returns {Promise<object>} Per-cell coverage, or why there is none.
 */
async function ReadAtlasCoverage(device, atlas)
{
  const shadow = atlas?._depthShadow;
  if (!shadow) return "no float copy of the atlas";

  const width = atlas.GetWidth();
  const height = atlas.GetHeight();
  const staging = device.createBuffer({ size: shadow.buffer.size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(shadow.buffer, 0, staging, 0, shadow.buffer.size);
  device.queue.submit([ encoder.finish() ]);
  await staging.mapAsync(GPUMapMode.READ);

  const depths = new Float32Array(staging.getMappedRange());
  const stride = shadow.bytesPerRow / 4;
  const cellWidth = width / 8;
  const cellHeight = height / 2;
  const cells = Array.from({ length: 16 }, () => ({ written: 0, nearest: 1 }));

  for (let y = 0; y < height; y += 1)
  {
    const row = y * stride;
    const cellRow = Math.floor(y / cellHeight) * 8;
    for (let x = 0; x < width; x += 1)
    {
      const depth = depths[row + x];
      if (!(depth < 1)) continue;
      const cell = cells[cellRow + Math.floor(x / cellWidth)];
      cell.written += 1;
      if (depth < cell.nearest) cell.nearest = depth;
    }
  }

  staging.unmap();
  staging.destroy();
  return { size: `${width}x${height}`, cells: cells.map((cell, index) => `${index}: ${cell.written} texels, nearest ${cell.nearest.toFixed(4)}`) };
}

/**
 * THE POOL'S PERSISTENT TEXTURES BY NAME, for `demo.taa()`: TAA's two
 * accumulators and its cooldown map live across frames, not in the temp pool.
 */
{
  const original = Tr2GpuResourcePool.prototype.GetPersistentTexture;
  Tr2GpuResourcePool.prototype.GetPersistentTexture = function (name, ...rest)
  {
    const handle = original.call(this, name, ...rest);
    POOL_TEXTURES.set(name, handle.Get());
    return handle;
  };
}

/**
 * THE POOL'S PERSISTENT BUFFERS BY NAME, for `demo.exposure()`: the
 * "Exposure Buffer" dynamic exposure measures into and tonemapping reads.
 */
const POOL_BUFFERS = new Map();
{
  const original = Tr2GpuResourcePool.prototype.GetPersistentBuffer;
  Tr2GpuResourcePool.prototype.GetPersistentBuffer = function (name, ...rest)
  {
    const handle = original.call(this, name, ...rest);
    POOL_BUFFERS.set(name, handle.Get());
    return handle;
  };
}

/**
 * Reads a pool buffer's current GPU contents as 32-bit floats.
 *
 * @param {GPUDevice} device The device.
 * @param {string} name The pool name, e.g. "Exposure Buffer".
 * @returns {Promise<number[]|string>} The floats, or why there are none.
 */
async function ReadPoolBuffer(device, name)
{
  const buffer = POOL_BUFFERS.get(name)?.GetDeviceBuffer?.();
  if (!buffer) return `no GPU buffer named ${name} yet`;

  const staging = device.createBuffer({ size: buffer.size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(buffer, 0, staging, 0, buffer.size);
  device.queue.submit([ encoder.finish() ]);
  await staging.mapAsync(GPUMapMode.READ);
  const values = Array.from(new Float32Array(staging.getMappedRange().slice(0)));
  staging.unmap();
  staging.destroy();
  return values;
}

/** Bytes per texel for the formats the post chain uses. */
const TEXEL_BYTES = { "rgba16float": 8, "bgra8unorm": 4, "rgba8unorm": 4, "rgba32float": 16, "r32float": 4, "rg16float": 4, "r32uint": 4, "rgba8snorm": 4, "rgb10a2unorm": 4, "r8unorm": 1 };

/** Decodes one IEEE-754 binary16 value. */
function Half(bits)
{
  const exponent = (bits >> 10) & 0x1f, fraction = bits & 0x3ff, sign = bits & 0x8000 ? -1 : 1;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

/** Per format: reads the texel at a byte offset as [ r, g, b, a ]. */
const TEXEL_DECODERS = {
  "rgba16float": (view, at) => [ 0, 2, 4, 6 ].map(c => Half(view.getUint16(at + c, true))),
  "bgra8unorm": (view, at) => [ 2, 1, 0, 3 ].map(c => view.getUint8(at + c) / 255),
  "rgba8unorm": (view, at) => [ 0, 1, 2, 3 ].map(c => view.getUint8(at + c) / 255),
  "rgba32float": (view, at) => [ 0, 4, 8, 12 ].map(c => view.getFloat32(at + c, true)),
  "r32float": (view, at) => [ view.getFloat32(at, true), 0, 0, 0 ],
  // TAA's velocity map (screen-space motion) and cooldown map (a counter).
  "rg16float": (view, at) => [ Half(view.getUint16(at, true)), Half(view.getUint16(at + 2, true)), 0, 0 ],
  "r32uint": (view, at) => [ view.getUint32(at, true), 0, 0, 0 ],
  // The shadow pass's screen-space factor (1 lit, 0 shadowed).
  "r8unorm": (view, at) => [ view.getUint8(at) / 255, 0, 0, 0 ],
  // CORTAO's output and blur (bent normal in RGB, occlusion in A), and the
  // depth pass's normal map.
  "rgba8snorm": (view, at) => [ 0, 1, 2, 3 ].map(c => Math.max(view.getInt8(at + c) / 127, -1)),
  "rgb10a2unorm": (view, at) =>
  {
    const bits = view.getUint32(at, true);
    return [ (bits & 0x3ff) / 1023, ((bits >>> 10) & 0x3ff) / 1023, ((bits >>> 20) & 0x3ff) / 1023, (bits >>> 30) / 3 ];
  }
};

/**
 * Reads a texture back and reports its colour: texels with non-zero RGB,
 * mean and max RGBA, and the centre texel.
 *
 * @param {GPUDevice} device The device.
 * @param {GPUTexture} texture The texture.
 * @returns {Promise<object>} The texture's format, size and colour statistics.
 */
async function CountNonZeroTexels(device, texture)
{
  const texel = TEXEL_BYTES[texture.format];
  if (!texel) return { format: texture.format, skipped: "format not counted" };
  // A sampled-only texture (uploaded data, the 4x4 black) cannot be a copy
  // source; copying it is a validation error that voids the whole submit.
  if (!(texture.usage & GPUTextureUsage.COPY_SRC)) return { format: texture.format, skipped: "not a copy source" };
  const bytesPerRow = Math.ceil(texture.width * texel / 256) * 256;
  const buffer = device.createBuffer({ size: bytesPerRow * texture.height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const encoder = device.createCommandEncoder();

  encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, { width: texture.width, height: texture.height });
  device.queue.submit([ encoder.finish() ]);
  await buffer.mapAsync(GPUMapMode.READ);

  // COLOUR, NOT BYTES. Counting any non-zero byte let an opaque black image
  // (alpha 1, RGB 0) report as fully populated, so this decodes each texel to
  // RGBA and counts only texels whose RGB is non-zero.
  const view = new DataView(buffer.getMappedRange());
  const decode = TEXEL_DECODERS[texture.format];
  const sum = [ 0, 0, 0, 0 ], max = [ 0, 0, 0, 0 ];
  let nonZero = 0;
  for (let y = 0; y < texture.height; y++)
  {
    for (let x = 0; x < texture.width; x++)
    {
      const rgba = decode(view, y * bytesPerRow + x * texel);
      if (rgba[0] || rgba[1] || rgba[2]) nonZero++;
      for (let c = 0; c < 4; c++)
      {
        sum[c] += rgba[c];
        if (rgba[c] > max[c]) max[c] = rgba[c];
      }
    }
  }
  const count = texture.width * texture.height;
  const round = values => values.map(value => Math.round(value * 1000) / 1000);
  const centre = round(decode(view, (texture.height >> 1) * bytesPerRow + (texture.width >> 1) * texel));
  buffer.unmap();
  buffer.destroy();
  return {
    format: texture.format,
    size: `${texture.width}x${texture.height}`,
    nonZeroRgbTexels: nonZero,
    meanRgba: round(sum.map(value => value / count)),
    maxRgba: round(max),
    centreRgba: centre
  };
}

{
  // A refused pipeline returns false from the draw and records its reason in
  // m_pipelineFailure; counting the reasons shows a draw that silently skipped.
  const original = CjsWebgpuRenderContextAL.prototype._RefusePipeline;
  CjsWebgpuRenderContextAL.prototype._RefusePipeline = function (reason)
  {
    const key = `pipelineRefused:${reason}`;
    DRAW_COUNTS[key] = (DRAW_COUNTS[key] ?? 0) + 1;
    return original.call(this, reason);
  };
}

/** One effect's load state, for `demo.post()`. */
function EffectState(effect)
{
  if (!effect) return "none";
  const res = effect.GetEffectRes();
  return {
    path: effect.GetEffectPathName(),
    resolved: effect.actualEffectFilePath,
    resource: res ? { state: res.state, good: res.IsGood() } : null,
    shader: Boolean(effect.GetShaderStateInterface())
  };
}


/** Used only when the SOF document cannot be had; see `EffectPath`. */
const EFFECT = EffectPath("res:/graphics/effect/managed/space/spaceobject/v5/quad/quadv5.fx");


/**
 * Turns a SOF effect path into the container this backend loads, through the
 * runtime's own resolver (`ResolveEffectPath`, which Carbon does in
 * `Tr2Effect` with the platform name and the tier). No prebuilt overlay is
 * needed: the byte source reads the shipped dx11 container for it and
 * `RegisterShaderResources` translates in memory.
 *
 * A SOF DOCUMENT NAMES NO BACKEND. It carries
 * `res:/graphics/effect/.../quadv5.fx` - the neutral path - and the resolver
 * substitutes the backend tree and the quality tier: `/effect/` becomes
 * `/effect.webgpu/` and `.fx` becomes the tier's suffix.
 *
 * AND THE NAME DOES NOT CHANGE. Every variant of a shader shares one name; the
 * VARIANT is chosen by the effect's `options`, which the document also carries,
 * and `Tr2Effect.RebuildCachedData` passes them to `GetShader`. An earlier
 * version of this demo hardcoded `unpacked_quadv5`, treating a permutation as
 * if it were a separate shader, which is not how the loader works.
 *
 * @param {string} effectFilePath The document's `effectFilePath`.
 * @returns {string} A resource path, without the `res:/` prefix.
 */
function EffectPath(effectFilePath)
{
  return ResolveEffectPath(effectFilePath, { platformName: "webgpu", shaderModel: TIER })
    .replace(/^res:\/+/u, "");
}

/** An Amarr frigate. Real geometry, real declaration, real packed tangents. */
const DEFAULT_HULL = "dx9/model/ship/amarr/frigate/af1/af1_t1.gr2";

/**
 * The DNA whose built SOF document names this hull's maps, constants and
 * geometry. `?dna=` picks another, e.g. `?dna=at1_t1:amarrbase:amarr`.
 */
// ?alpha=1: a transparent canvas. The clear alpha is 0, no nebula is drawn,
// the canvas composites premultiplied over a checkerboard, so whatever the
// effects and the post process leave in alpha shows through.
const ALPHA = new URLSearchParams(globalThis.location?.search ?? "").get("alpha") === "1";

const DNA = new URLSearchParams(globalThis.location?.search ?? "").get("dna") || "angb1_t1:capsuleerday_25_angel:angel:pattern?capsuleerday_25_angel;green_carapace_darker_polished;green_carapace_mirror";

/**
 * The kill count a loaded ship shows through its kill-counter decals: Carbon's
 * EveShip2 displayKillCounterValue, which the client sets from the pilot's
 * kills. `?kills=` sets it at load, 0 to 999.
 *
 * @param {*} value A requested count.
 * @returns {number} A whole count, 0 to 999.
 */
function DemoKillCount(value)
{
  return Math.min(Math.max(Math.trunc(Number(value) || 0), 0), 999);
}

const KILLS = DemoKillCount(new URLSearchParams(globalThis.location?.search ?? "").get("kills"));

/**
 * `?scene=stub` keeps the hand-built hull and the stand-in scene; the default
 * builds the ship through EveSOF into a real EveSpaceScene, so every area
 * Trinity collects - decals, boosters, attachments - reaches the driver.
 */
const SCENE_MODE = new URLSearchParams(globalThis.location?.search ?? "").get("scene") === "stub" ? "stub" : "sof";

/**
 * The universe scene the demo loads as its EveSpaceScene, as the client loads
 * one per system: its background effect (the visible nebula), environment
 * maps, nebula intensity, ambient colour and fog. `?nebula=` picks another of
 * the client's res:/dx9/scene/universe/*_cube files, e.g. `?nebula=c07`.
 */
const SCENE_UNIVERSE = `res:/dx9/scene/universe/${new URLSearchParams(globalThis.location?.search ?? "").get("nebula") || "a01"}_cube.black`;

/**
 * Builds the ship through the runtime's own EveSOF, reading SOF's data files
 * lazily from tools-core through the runner's resource route - only the
 * handful a DNA touches, not the 184 MB data.black. The build is the runtime
 * in this tree, not tools-core's published one.
 *
 * @param {string} dna The ship DNA.
 * @returns {Promise<EveShip2>} The ship.
 */
async function BuildSofShip(dna)
{
  const sof = new EveSOF().Register({
    lazyData: {
      source: path => ResourceBytes(String(path).replace(/^res:\/+/u, "")),
      // The file index, once composed: a material it does not list is absent,
      // as Carbon's GetMaterialData answers nullptr (CjsSofLibraryBuilder).
      // Before the index is there every file counts as present, so a missing
      // one still fails loudly rather than vanishing.
      exists: path => !bePathsReady || blue.paths.FileExists(path)
    },
    // THE HOST'S OBJECT LOADER, so the async build inlines each effect child
    // as Carbon's SOF does (BeResMan->LoadObject, EveSOF.cpp:2005, 2168)
    // instead of emitting an EveChildRef: the file's root as model values.
    resources: {
      getObject: async path =>
      {
        const read = CjsBlackFormat.read(await ResourceBytes(String(path).replace(/^res:\/+/u, "")), { emit: "json" });
        return (read.root ?? read).object ?? null;
      }
    },
    // The EVE client's volumetricTrailPath (Carbon registers the setting
    // empty, EveSOF.cpp:64-65, and the client fills it): the one generic
    // booster trail mesh in the client's resources.
    volumetricTrailPath: "res:/dx9/model/ship/booster/volumetrictrail.gr2"
  });

  await sof.InitializeAsync();
  // Inserts need BePaths, so the build waits for it (about 0.3 s). The 15 s cap
  // is for a network failure only, and says so.
  const composed = await Promise.race([
    BEPATHS_COMPOSED.then(() => true),
    new Promise(done => setTimeout(() => done(false), 15000))
  ]);
  if (!composed) console.warn(`BePaths still loading from ${bePathsUrl} after 15 s; ${dna} is built without resPathInserts.`);
  const values = await sof.BuildValuesFromDNAAsync(dna);
  const diagnostics = sof.GetBuildDiagnostics();
  if (diagnostics?.length) console.warn(`SOF ${dna}: ${JSON.stringify(diagnostics).slice(0, 400)}`);
  // The client starts a loaded ship's controllers (EveSpaceObject2::
  // StartControllers, cpp:4318, reaching every effect child); unstarted, no
  // state machine runs, so speed readouts, heat and state effects never show.
  return hydrateDemoShip(values);
}


/**
 * Rest-pose bones for skinned hulls: every bone identity, so a vertex stays
 * where the geometry authored it whatever bone it names. A stand-in for an
 * animation updater, which this demo does not have.
 *
 * The skinned shaders read Carbon's `BoneTransforms` - rows of `Float4x3`, 12
 * floats each - at `boneIndex + boneOffsets.x` from the per-object block
 * (`EveSpaceObject2.cpp:1424-1428`); an index past the end reads zeros, which
 * collapses the hull to the origin.
 */
const REST_POSE_BONES = 256;

function RestPoseBones(count)
{
  const rows = new Float32Array(count * 12);

  for (let bone = 0; bone < count; bone += 1)
  {
    rows[bone * 12] = 1;
    rows[bone * 12 + 5] = 1;
    rows[bone * 12 + 10] = 1;
  }

  return rows;
}


/**
 * `?detail=1`: a TEST SETUP, not a real ship. Only skinned hulls (titans,
 * carriers) author the detail shader, and this demo does not skin yet, so the
 * hull area borrows `quaddetailv5` and at1_t1's Amarr detail maps and
 * constants. Its browser container merges Detail1Map..Detail3Map into one
 * texture array at t9, which is what this exercises: the effect keeps the
 * three named parameters and `CjsTextureArrayBridge` binds
 * `dynamic:/texturearray/<their paths>` in the merged register.
 */
const DETAIL_TEST = new URLSearchParams(globalThis.location?.search ?? "").get("detail") === "1";

const DETAIL_TEXTURES = Object.freeze({
  Detail1Map: "res:/dx9/model/shared/amarr/textures/ama_plating_detail_01_horizontal.dds",
  Detail2Map: "res:/dx9/model/shared/amarr/textures/ama_plating_detail_02_horizontal.dds",
  Detail3Map: "res:/dx9/model/shared/amarr/textures/ama_detail_blank.dds"
});

// at1_t1:amarrbase:amarr's area_hull values.
const DETAIL_CONSTANTS = Object.freeze({
  Detail1Data: [ 5, 0.8, 0, 0 ],
  Detail2Data: [ 6, 0.8, 0.5, 0 ],
  Detail3Data: [ 0, 0, 0, 0 ],
  DetailAlbedoColor: [ 0, 0, 0, 0 ],
  DetailFresnelColor: [ 0, 0, 0, 0 ],
  DetailSelector: [ 0.8, 0, 0, 0.8 ]
});

/**
 * The hull area's effect values moved onto the detail shader, for `?detail=1`.
 *
 * @param {object} effect SOF effect values.
 * @returns {object} A copy naming `quaddetailv5`, with the detail maps and constants.
 */
function WithDetailMaps(effect)
{
  return {
    ...effect,
    effectFilePath: effect.effectFilePath.replace(/quadv5\.fx$/u, "quaddetailv5.fx"),
    resources: [
      ...effect.resources,
      ...Object.entries(DETAIL_TEXTURES).map(([ name, resourcePath ]) => ({ _type: "TriTextureParameter", name, resourcePath }))
    ],
    constParameters: [
      ...(effect.constParameters ?? []),
      ...Object.entries(DETAIL_CONSTANTS).map(([ name, value ]) => ({ _type: "Tr2ConstantEffectParameter", name, value }))
    ]
  };
}


/**
 * Fetches the built SOF document for one DNA through the runner's proxy.
 *
 * @param {string} dna The DNA string.
 * @returns {Promise<object|null>} The document, or null when it cannot be had.
 */
async function SofDocument(dna)
{
  try
  {
    const response = await fetch(`/sof/${dna}`);

    // Not fatal: without it the material is empty and the hull draws white,
    // which is exactly where this demo was before and still worth seeing.
    if (!response.ok) return null;

    return await response.json();
  }
  catch
  {
    return null;
  }
}


/**
 * PLACEHOLDER ALLIANCE AND CORP LOGOS. The client points a ship's banner
 * external parameters (named by EveSOF, EveSOF.cpp:1682-1696) at the owning
 * alliance's and corporation's images at runtime; the demo has neither, so it
 * points them at two public images shipped beside the demo, in `banners/`.
 * Temporary: remove once the demo can name a real alliance.
 */
const DEMO_BANNERS = Object.freeze({
  AllianceLogoResPath: "res:/cjsdemo/banner/alliance.png",
  CorpLogoResPath: "res:/cjsdemo/banner/corporation.png"
});

/**
 * Points a ship's alliance and corp banner parameters at the placeholders.
 *
 * @param {EveShip2} ship The built ship.
 * @returns {string[]} The parameters set.
 */
function ApplyDemoBanners(ship)
{
  const set = [];
  for (const parameter of ship.externalParameters)
  {
    const path = DEMO_BANNERS[parameter.name];
    if (!path) continue;
    parameter.SetValue(path);
    set.push(parameter.name);
  }
  return set;
}

/**
 * Fetches one placeholder banner image from the demo folder.
 *
 * @param {string} name `alliance.png` or `corporation.png`.
 * @returns {Promise<Uint8Array>} The bytes.
 */
async function DemoBannerBytes(name)
{
  const response = await fetch(`/test/trinityal/webgpu/demo/banners/${name}`);

  if (!response.ok) throw new Error(`demo banner ${name}: ${response.status} ${response.statusText}`);

  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Fetches one client resource through the runner's proxy.
 *
 * @param {string} path Logical resource path, without the `res:/` prefix.
 * @returns {Promise<Uint8Array>} The bytes.
 */
async function ResourceBytes(path)
{
  // The client ships red files compiled: a .red is read as its .black, as
  // Carbon's file system swaps it (SubstituteBlackForRedInFilename,
  // blue/src/BlueFileUtil.cpp:374-387).
  path = String(path).replace(/.red$/u, ".black");
  const response = await fetch(`/resource/${path}`);

  if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`);

  return new Uint8Array(await response.arrayBuffer());
}


/**
 * Reads a GR2 hull into the CMF shape the mesh path takes.
 *
 * Both halves are the public one-shot readers: `CjsGr2Format.read` gives shared
 * geometry, `CjsCmfFormat.loadShared` projects it to a CMF graph with a
 * declaration and LOD areas. An earlier version reached past them into the gr2
 * target projection, which is not exported from the built package at all - so
 * the demo only ran from source, and raw Node then choked on the decorators in
 * the modules beside it.
 *
 * @param {Uint8Array} bytes Container bytes.
 * @returns {object} A CMF-shaped mesh.
 */
function HullMesh(bytes)
{
  return CjsCmfFormat.loadShared(CjsGr2Format.read(bytes)).meshes[0];
}


/** The channels and declaration the `unpacked_` shader family reads. */
const UNPACKED_DECLARATION = Object.freeze([
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "Tangent", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "Binormal", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2 },
  { usage: "TexCoord", usageIndex: 1, type: "Float32", elementCount: 2 },
  { usage: "BoneIndices", usageIndex: 0, type: "UInt16", elementCount: 4 }
]);

/**
 * The declaration the packed shader family (`quadv5`, `skinned_quadv5`, ... -
 * no `unpacked_` prefix) reads: TANGENT0 is the file's legacy packed frame, a
 * vec4 of angles the vertex shader decodes with sin/cos
 * (`PackTangentsLegacy`, mesh/src/cmf/tangents.cpp). Feeding it the decoded
 * tangent VECTOR instead - what this demo did until 2026-09-26 - makes the
 * shader decode a direction as angles, and every normal-mapped surface lights
 * wrong.
 */
const PACKED_DECLARATION = Object.freeze([
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "Tangent", usageIndex: 0, type: "Float32", elementCount: 4 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2 },
  { usage: "TexCoord", usageIndex: 1, type: "Float32", elementCount: 2 },
  { usage: "BoneIndices", usageIndex: 0, type: "UInt16", elementCount: 4 }
]);

/**
 * Whether every area's shader reads the packed frame. One vertex buffer serves
 * every area, so a hull mixing the two families cannot satisfy both here.
 *
 * @param {object[]} areas SOF document areas.
 * @returns {boolean} True when no area names an `unpacked_` shader.
 */
function ReadsPackedTangents(areas)
{
  return !areas.some(area => /\/unpacked/u.test(area.effect?.effectFilePath ?? ""));
}


/**
 * Re-declares a hull's vertices in the form the `unpacked_` shaders read.
 *
 * THREE TANGENT FORMS EXIST - unpacked, packed, and packed legacy - and a hull
 * and a shader need not agree on which. This one stores the legacy packed frame,
 * and `unpacked_quadv5` declares explicit normal, tangent and binormal plus a
 * second UV set and bone indices, so a declaration taken straight off the
 * container satisfies POSITION and TEXCOORD0 alone. The backend then refuses
 * the draw and names what it could not supply, which is how this demo found out:
 * `a vertex element for input 6:0, 2:0, 4:0, 5:1`.
 *
 * THE DECODE IS REAL WORK, and a previous version of this comment claimed it was
 * not. The mesh does arrive with `normal`, `tangent`, `binormal`, `texcoord1`
 * and `blendIndice` KEYS - but they are EMPTY. Reading the key list and not the
 * lengths is what produced the wrong claim, and deleting the decode on the
 * strength of it broke the hull. Only `position`, `texcoord0` and
 * `packedTangentLegacy` carry data.
 *
 * THE CHANNELS THAT MATTER ARE THE LOD'S. `PackLodGeometry` reads
 * `lod.vertex ?? mesh.vertex`, so the LOD is what the draw is built from and
 * what has to be filled. They are the same object for this hull, and writing to
 * the mesh alone would have been silently ignored for one that differed.
 *
 * Choosing the tangent form per shader belongs in the mesh path rather than in a
 * demo; this is the smallest thing that lets one hull meet one shader.
 *
 * Carbon's DX11 path FABRICATES a missing element so the layout still builds
 * (`Tr2VertexLayoutALDx11.cpp:179-207`) and ccpwgl disables the attribute; this
 * backend refuses instead, so something must supply what both of them fake.
 *
 * @param {object} mesh CMF mesh, mutated in place.
 * @param {boolean} [packed] Keep the packed frame for the packed shader family.
 * @returns {object} The same mesh, with the matching declaration.
 */
function Unpack(mesh, packed = false)
{
  for (const channels of new Set([ mesh.vertex, ...(mesh.lods ?? []).map(lod => lod.vertex) ]))
  {
    if (!channels) continue;

    const packedFrame = channels.packedTangentLegacy;
    const count = (channels.position?.length ?? 0) / 3;

    if (!count || !packedFrame?.length) continue;

    channels.texcoord1 = Array.from(channels.texcoord0 ?? new Array(count * 2).fill(0));
    channels.blendIndice = new Array(count * 4).fill(0);

    if (packed)
    {
      channels.tangent = Array.from(packedFrame);
      continue;
    }

    const normal = new Array(count * 3);
    const tangent = new Array(count * 3);
    const binormal = new Array(count * 3);

    for (let i = 0; i < count; i += 1)
    {
      const frame = decodeTangentFrame(packedFrame.slice(i * 4, i * 4 + 4));
      const at = i * 3;

      for (let axis = 0; axis < 3; axis += 1)
      {
        normal[at + axis] = frame.N[axis];
        tangent[at + axis] = frame.T[axis];
        binormal[at + axis] = frame.B[axis];
      }
    }

    channels.normal = normal;
    channels.tangent = tangent;
    channels.binormal = binormal;
  }

  let offset = 0;

  mesh.decl = (packed ? PACKED_DECLARATION : UNPACKED_DECLARATION).map(element =>
  {
    const stride = element.type === "UInt16" ? 2 : 4;
    const placed = { ...element, offset, stream: 0 };

    offset += stride * element.elementCount;

    return placed;
  });

  if (!packed && !mesh.lods?.[0]?.vertex?.normal?.length && !mesh.vertex.normal?.length)
  {
    throw new Error("hull carries no packed tangent frame to expand");
  }

  return mesh;
}


/**
 * The bounding sphere of a mesh's positions, so the camera can frame it.
 *
 * @param {object} mesh CMF mesh.
 * @returns {{centre: Float32Array, radius: number}} Centre and radius.
 */
function Bounds(mesh)
{
  const position = mesh.vertex.position;
  const min = [ Infinity, Infinity, Infinity ];
  const max = [ -Infinity, -Infinity, -Infinity ];

  for (let i = 0; i < position.length; i += 3)
  {
    for (let axis = 0; axis < 3; axis += 1)
    {
      min[axis] = Math.min(min[axis], position[i + axis]);
      max[axis] = Math.max(max[axis], position[i + axis]);
    }
  }

  const centre = vec3.fromValues((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  const radius = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 || 1;

  return { centre, radius };
}


/**
 * A geometry resource of the shape `Tr2MeshBase` asks for.
 *
 * @param {object} mesh CMF mesh.
 * @param {string} path Resource path.
 * @returns {object} The resource.
 */
function GeometryResource(mesh, path)
{
  return {
    GetPath: () => path,
    IsGood: () => true,
    GetPayload: () => ({ meshes: [ mesh ] }),
    GetMeshVertexElements: () => mesh.decl,
    GetMeshLod: () => mesh.lods[0]
  };
}


/**
 * The material: a real `Tr2Effect` over a real container.
 *
 * `RebuildCachedData` is what maps the container's authored constants onto the
 * byte offsets the material uploads from, and `registerShaderHandles` is what
 * turns the pass's reserved slots into live render-state and shader-program
 * handles. Both are the shipped calls; nothing about the material is a stand-in.
 *
 * @param {Uint8Array} bytes Container bytes.
 * @param {string} path Resource path.
 * @returns {object} The effect, used as the area's material.
 */
async function Material(path, values = null)
{
  const resource = blue.resMan.GetResource(path, { requirement: ResourceRequirement.SHADER });

  await resource.Ready();

  // HYDRATED FROM THE SOF DOCUMENT WHEN THERE IS ONE. The built document for a
  // DNA carries the area's whole effect - its constant parameters and a
  // `TriTextureParameter` per map, named as the shader declares them - so
  // `Tr2Effect.from` produces the real material rather than an empty one whose
  // textures a demo would have to invent. Only the effect RESOURCE is
  // substituted: the document names the dx11 `.fx`, and this backend needs the
  // WebGPU container of the same effect.
  const effect = values ? Tr2Effect.from(values) : new Tr2Effect();

  effect.effectResource = resource;
  effect.RebuildCachedData();

  Tr2EffectStateManager.registerShaderHandles(effect.shader);

  return effect;
}


/**
 * The scene-owned textures `quadv5` declares, and what "nothing" means for each.
 *
 * ZERO IS THE WRONG NOTHING FOR MOST OF THESE, which is why the hull came out
 * near-black once it stopped being white. The pixel stage declares nine
 * textures: six are the material's own maps, and these three belong to the
 * SCENE. Nothing supplies them here, so the backend substitutes its zero-filled
 * 1x1 dummy - and a zero ambient-occlusion map means FULLY OCCLUDED, a zero
 * shadow map means FULLY SHADOWED. The ship is then lit by almost nothing, and
 * the frame is not wrong so much as unanswered.
 *
 * Carbon's scene owns these: `EveSpaceScene` binds its environment cube, its
 * shadow map and the SSAO target. A stand-in scene has none, so the neutral
 * value each one carries when the feature is off is supplied instead - which is
 * what the backend's dummy should arguably be doing per texture rather than
 * handing every slot the same zeros.
 *
 * THE ENVIRONMENT CUBE IS NOT NEUTRAL-ABLE THE SAME WAY. A flat grey cube gives
 * flat reflections rather than none, so it is left dark deliberately and named
 * here: a real scene environment map is the next thing this demo needs.
 */
/**
 * What the shader's `Sun.DirWorld` holds, which is NOT the scene's own value.
 *
 * A SCENE STORES THE DIRECTION THE LIGHT TRAVELS and the shader wants the
 * direction TOWARD the sun, so the per-frame block carries the NEGATED vector.
 * ccpwgl does exactly this in `EveSpaceScene.GetPerFrameSunDirection`
 * (`EveSpaceScene.js:2775-2785`): copy, negate, normalise.
 *
 * Writing the un-negated direction inverts every sun term at once. It does not
 * look like darkness, it looks like the lighting is inside out - shadow where
 * the reflection should be, and a dull disc where the sun should be mirrored,
 * which is what the operator saw and named before I did.
 *
 * The scene direction defaults to straight down, (0, -1, 0) - a top-down sun,
 * which is the easiest one to read a hull under; ccpwgl's own default is
 * (1, -1, 1). `?sun=x,y,z` sets it, and the settings panel moves it live.
 *
 * @returns {number[]} The toward-sun unit vector for `Sun.DirWorld`.
 */
function SunDirWorld()
{
  const direction = vec3.negate(vec3.create(), SUN.direction);

  return Array.from(vec3.normalize(direction, direction));
}

/**
 * THE ONE SUN, in the scene's convention: `direction` is the way the light
 * TRAVELS, as EveSpaceScene.sunDirection is. Everything that shows the sun
 * reads it every frame - the per-frame blocks (through SunDirWorld), the
 * scene's sunDirection, and the lens flare's position - so moving it moves
 * the lighting, the flare and the god rays together. God rays draw only while
 * the sun is in front of the camera: their vertex stage opts out otherwise.
 */
const SUN = { direction: ParseSunDirection(new URLSearchParams(globalThis.location?.search ?? "").get("sun")) };

/** `?sun=x,y,z` as a direction, or straight down for anything unusable. */
function ParseSunDirection(text)
{
  const parts = String(text ?? "").split(",").map(Number);

  return parts.length === 3 && parts.every(Number.isFinite) && parts.some(value => value !== 0)
    ? vec3.fromValues(parts[0], parts[1], parts[2])
    : vec3.fromValues(0, -1, 0);
}


/**
 * `?probe=copy`: a STEP TOWARD Carbon's reflection probe, not the probe.
 *
 * Tr2ReflectionProbe fills EveSpaceSceneEnvMap with a 256x256 HDR cube it
 * builds with compute (Tr2ReflectionProbe.cpp:15-16, 272, 347-381). This runs
 * its last pass alone - CopyCube.fx, the nebula into the cube's top mip, with
 * Hollywood backlighting at the scene's values (EveSpaceScene.cpp:211-212) -
 * so the compute path is exercised end to end: in-memory translation, a
 * writable cube render target, storage bindings and a dispatch. The cube has
 * one mip because nothing fills the others until the filter passes run.
 */
const PROBE_MODE = new URLSearchParams(globalThis.location?.search ?? "").get("probe");

const COPY_CUBE = "res:/graphics/effect/managed/space/System/Reflection/CopyCube.fx";

/**
 * Carbon's reflection probe filtering the nebula into EveSpaceSceneEnvMap:
 * `customSourceTexture` and `RunFilter`, the two Carbon exposes to Blue for
 * exactly this ("Filters the currently set texture"). EveSpaceScene gives its
 * probe the scene's backlight (EveSpaceScene.cpp:211-212, 3220-3221). The
 * default; `?probe=off` binds the unfiltered nebula instead.
 */
async function ReflectionProbe(renderContext, al, areas)
{
  SetEffectPathDefaults({ platformName: "webgpu", shaderModel: TIER });

  const envPath = SCENE_TEXTURES.find(scene => scene.name === "EveSpaceSceneEnvMap").path;
  const nebula = blue.resMan.GetResource(`res:/${envPath}`, { requirement: ResourceRequirement.TEXTURE });

  await nebula.Ready();
  // Carbon's TriTextureRes makes its texture in DoPrepare; ours at first bind.
  RealizeTexture(nebula, renderContext);

  const probe = new Tr2ReflectionProbe();
  probe.customSourceTexture = nebula;
  probe.SetBackLightColor([ 2, 2, 2, 2 ]);
  probe.SetBackLightContrast(8);

  // The effects load through the resource manager, as the scene's would; the
  // first frame the probe filters is the first one they are all ready for.
  if (!probe.DoPrepareResources(PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT, renderContext))
  {
    throw new Error("reflection probe resources could not be created");
  }
  await Promise.all([ probe._preFilterEffect, probe._filterEffect, probe._copyMipEffect ]
    .map(effect => effect.effectResource.Ready()));
  await new Promise(resolve => setTimeout(resolve, 0));

  al.BeginScene();
  probe.Filter(renderContext);
  await al.EndScene();

  const reflection = probe.GetReflection();
  for (const area of areas)
  {
    area.material.GetResourceByName("EveSpaceSceneEnvMap").SetResource(reflection);
  }
  globalThis.__probe = { mips: reflection.GetMipCount(), size: reflection.GetWidth(), failure: al.m_pipelineFailure ?? null };
  console.log(`probe: ${JSON.stringify(globalThis.__probe)}`);
}

async function ProbeCopyCube(renderContext, al, areas)
{
  SetEffectPathDefaults({ platformName: "webgpu", shaderModel: TIER });

  const envPath = SCENE_TEXTURES.find(scene => scene.name === "EveSpaceSceneEnvMap").path;
  const nebula = blue.resMan.GetResource(`res:/${envPath}`, { requirement: ResourceRequirement.TEXTURE });

  await nebula.Ready();
  // Carbon's TriTextureRes makes its texture in DoPrepare; ours at first bind.
  RealizeTexture(nebula, renderContext);

  const target = new Tr2RenderTarget();
  target.SetName("ReflectionProbe");
  // ?probe=mips gives the cube Carbon's eight levels and fills them with
  // GenerateMipMaps - a box chain, NOT the probe's filter; it proves the AL's
  // mip generation, and the filter passes replace it.
  const mipCount = PROBE_MODE === "mips" ? 8 : 1;
  const created = target.CreateArray(256, 256, 1, mipCount, PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT,
    ExFlag.EX_BIND_UNORDERED_ACCESS, TextureType.TEX_TYPE_CUBE, renderContext);
  if (created !== 0) throw new Error(`probe cube CreateArray failed: ${created}`);

  const copy = new Tr2Effect();
  copy.SetEffectPathName(COPY_CUBE);
  await copy.effectResource.Ready();
  copy.RebuildCachedData();
  Tr2EffectStateManager.registerShaderHandles(copy.shader);

  copy.SetOption("HOLLYWOOD_MODE", "HOLLYWOOD_ON");
  copy.SetParameter("tex_hi_res", nebula);
  copy.SetParameter("tex_lo_res", target);
  copy.SetParameter("BackLightColor", [ 2, 2, 2, 2 ]);
  copy.SetParameter("BackLightContrast", 8);
  copy.SetParameter("ViewDirection", [ 0, 1, 0 ]);

  al.BeginScene();
  const dispatched = Tr2Renderer.runComputeShader(copy, 256 / 8, 256 / 8, 6, renderContext);
  const mipped = mipCount > 1 ? target.GenerateMipMaps(renderContext) : null;
  await al.EndScene();
  if (!dispatched) throw new Error(`probe CopyCube did not dispatch: ${al.m_pipelineFailure ?? "no compute pass"}`);

  for (const area of areas)
  {
    area.material.GetResourceByName("EveSpaceSceneEnvMap").SetResource(target);
  }

  // EVIDENCE THE DISPATCH WROTE: read back the centre texel of two faces. An
  // untouched rgba16float target reads all zeros.
  const device = al.GetWebgpu().GetDevice();
  const texels = [];
  for (const [ face, mip ] of [ [ 0, 0 ], [ 3, 0 ], ...(mipCount > 1 ? [ [ 0, 3 ], [ 0, 7 ] ] : []) ])
  {
    const readback = device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const encoder = device.createCommandEncoder();
    const texel = (256 >> mip) >> 1;
    encoder.copyTextureToBuffer(
      { texture: target.GetRenderTarget().GetDeviceTexture(), mipLevel: mip, origin: { x: texel, y: texel, z: face } },
      { buffer: readback, bytesPerRow: 256 },
      { width: 1, height: 1, depthOrArrayLayers: 1 });
    device.queue.submit([ encoder.finish() ]);
    await readback.mapAsync(GPUMapMode.READ);
    texels.push(Array.from(new Uint16Array(readback.getMappedRange().slice(0, 8))));
    readback.unmap();
  }
  globalThis.__probe = { dispatched, mipped, faces: target.GetArraySize(), size: target.GetWidth(), mips: target.GetMipCount(), texels };
  console.log(`probe: ${JSON.stringify(globalThis.__probe)}`);
}

const SCENE_TEXTURES = Object.freeze([
  // 1.0 is "not occluded". Zero darkened every surface uniformly.
  { name: "SSAOMap", colour: [ 255, 255, 255, 255 ] },
  // A depth map read as "nothing is closer than this", so nothing is shadowed.
  { name: "EveSpaceSceneShadowMap", colour: [ 255, 255, 255, 255 ] },
  // THE ENVIRONMENT CUBE HAS NO NEUTRAL, so a real one is loaded instead.
  // A black cube is not "no reflection", it is a reflection OF BLACK: the hull
  // came out with a dark grey disc where the sun should have been mirrored, and
  // every polished surface reflected nothing. A flat grey cube is no better, it
  // just reflects flat grey, which is why ccpwgl leaves this parameter empty
  // rather than defaulting it.
  //
  // A SCENE OWNS THIS ONE, and it is the NEBULA. Carbon binds the reflection
  // probe's cube here, or without a probe the static env map - the scene's
  // `envMapResPath`, the full backdrop cube (`EveSpaceScene.cpp:3207-3226`).
  // The small `<scene>_cube_refl.dds` files feed EnvMap1/ReflectionMap, a
  // different variable; binding one here (the Amarr ship-icon cube, until
  // 2026-09-26) reflected a 128x128 icon backdrop. This demo has no probe, so
  // it binds a universe nebula; `?env=` picks another. A STAND-IN for scene
  // data: a real scene supplies its own and this line goes away.
  { name: "EveSpaceSceneEnvMap", path: new URLSearchParams(globalThis.location?.search ?? "").get("env") || "dx9/scene/universe/a01_cube.dds" }
]);


// Blue's resource manager, which every texture comes through. A texture
// parameter fetches its own path when the path is set
// (`TriTextureParameter.Initialize`), as Carbon's does, so the demo supplies
// only the byte source and the texture routes. Textures load as Carbon's
// HostBitmap through the ordinary image route - including `dynamic:/color`
// and the texture pack and array constructors a merged shader slot resolves.
//
// Effects are requested at their WebGPU paths and translated in memory: the
// source answers an `effect.webgpu/` path with the shipped `effect.dx11/`
// container, and `RegisterShaderResources` converts it. No prebuilt overlay.
blue.resMan.Register({
  source: {
    Read: path =>
    {
      const logical = String(path).replace(/^res:\//u, "");
      // The placeholder banners (see DEMO_BANNERS) come from the runner.
      if (logical.startsWith("cjsdemo/banner/")) return DemoBannerBytes(logical.slice("cjsdemo/banner/".length));
      return ResourceBytes(logical.replace("graphics/effect.webgpu/", "graphics/effect.dx11/"));
    }
  }
});
RegisterTextureResources(blue.resMan);
RegisterSolidColorTexture(blue.resMan);
RegisterTextureArray(blue.resMan);
RegisterTexturePack(blue.resMan);
RegisterShaderResources(blue.resMan, { translator: CjsWebgpuFormat });
// A SOF ship's Tr2Mesh asks the manager for its .gr2 as GEOMETRY.
RegisterGeometryResources(blue.resMan);
// Red and black object files, which an EveChildRef loads by path.
RegisterObjectResources(blue.resMan);
// Effects resolve their platform path when they hydrate, so the defaults are
// set before any SOF ship is built.
SetEffectPathDefaults({ platformName: "webgpu", shaderModel: TIER });

// BEPATHS, composed as Carbon's client composes it (ResourceLoading.cpp): a
// RemoteFileCache over THIS build's resfileindex, registered as a file system.
// SOF's resPathInsert selection asks BePaths whether each inserted texture
// exists (EveSOFDNA.cpp:11-14), so without this no DNA or faction insert
// (navy, bloodraider...) ever applies. A faction whose insert folder a hull
// lacks (most *base factions) falls back to the default textures, as in game.
// The index is ~20 MB from local tools-core, so it loads in the BACKGROUND:
// nothing at module level waits for it (a top-level await on it once stalled
// the whole page). BuildSofShip waits for it, capped, before building.
let bePathsUrl = "/build";
/** Whether BePaths composed from the page build's index (ComposeBePaths). */
let bePathsReady = false;
const BEPATHS_COMPOSED = ComposeBePaths();

// SKIN CHANGES RUN ONE AT A TIME. Choosing a skin in the ship panel already
// loads it, so a "load" click, or another choice inside the 3 s transition,
// started a second change that took the same old ship. The finishing change
// then spliced index -1 (the scene's LAST object) and left the demo's ship
// pointing at a ship no longer drawn, so every later change dissolved the
// wrong one. Each change now starts from the ship the previous one left.
let skinChangeQueue = Promise.resolve();
function SerializeSkinChange(change)
{
  const run = skinChangeQueue.then(change);
  // The queue only needs to know the change ENDED; the caller still gets the
  // rejection through `run`.
  skinChangeQueue = run.then(() => undefined, () => undefined);
  return run;
}

/** Composes BePaths over the page build's resfileindex; never throws. */
async function ComposeBePaths()
{
  const started = performance.now();
  let url = "/build";
  try
  {
    const pageBuild = await (await fetch(url, { signal: AbortSignal.timeout(10000) })).json();
    url = `${pageBuild.tools}/eve/${pageBuild.resources}/app/resfileindex.txt`;
    bePathsUrl = url;
    const index = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!index.ok) throw new Error(`HTTP ${index.status}`);
    const text = await index.text();
    const remoteFileCache = new RemoteFileCache();
    remoteFileCache.AddFileIndex(text);
    // Registered for EXISTENCE only (BePaths->FileExists). It is not installed
    // with SetRemoteFileCache: that makes FileExistsLocally ask this cache's
    // local byte store, and this page has none - its bytes come from the
    // runner - so the lookup threw inside texture setup and stalled the page.
    blue.paths.RegisterFileSystem(new BlueResFileSystemRemote(remoteFileCache));
    bePathsReady = true;
    console.info(`BePaths composed from ${url}: ${text.length} bytes in ${Math.round(performance.now() - started)} ms`);
  }
  catch (error)
  {
    console.warn(`BePaths not composed from ${url} after ${Math.round(performance.now() - started)} ms; resPathInserts will not apply: ${error.message}`);
  }
}
// The renderer's shader model follows the tier, as the client sets it:
// controllers read it through ShaderQuality() (the hull fire gates on 2).
Tr2Renderer.SetShaderModel({ lo: TR2SHADERMODEL.TR2SM_3_0_LO, hi: TR2SHADERMODEL.TR2SM_3_0_HI }[TIER] ?? TR2SHADERMODEL.TR2SM_3_0_DEPTH);

/**
 * A scene texture's path: a client file, or a flat colour as Carbon's
 * `dynamic:/color/r,g,b,a` (float components).
 *
 * @param {object} scene A `SCENE_TEXTURES` entry.
 * @returns {string} The resource path.
 */
function SceneTexturePath(scene)
{
  return scene.path
    ? `res:/${scene.path}`
    : `dynamic:/color/${scene.colour.map(byte => byte / 255).join(",")}`;
}


/**
 * Waits for every texture the material's parameters already requested.
 *
 * A `TriTextureParameter` binds `GetResource()`, and until that resource is
 * PREPARED the backend gets Carbon's fallback rather than a texture. Waiting is
 * the demo's choice, so the first frame shows the finished hull; a scene may
 * equally draw at once and let each texture replace the fallback as it
 * arrives. A failed texture keeps the fallback and is named.
 *
 * BC STAYS BC. The hull's maps are BC7, which WebGPU exposes only behind the
 * `texture-compression-bc` feature. The image route keeps the file's format,
 * so a device without that feature cannot take them; decoding for such a
 * device is not wired yet.
 *
 * @param {object} effect The hydrated effect.
 * @returns {Promise<{loaded: number, failed: string[]}>} What arrived.
 */
async function LoadTextures(effect)
{
  const failed = [];
  let loaded = 0;

  await Promise.all((effect.resources ?? []).map(async parameter =>
  {
    if (!parameter.resourcePath) return;

    const resource = parameter.GetResource();

    try
    {
      await resource.Ready();
      if (!resource.GetBitmap()) throw new Error(`${parameter.resourcePath}: no image`);
      loaded += 1;
    }
    catch (error)
    {
      // Named rather than swallowed: a hull missing one map should say which.
      failed.push(`${parameter.name}: ${error.message}`);
    }
  }));

  return { loaded, failed };
}


/**
 * One renderable holding the hull's areas.
 *
 * @param {object} material The effect.
 * @param {object} geometry The geometry resource.
 * @param {object} mesh CMF mesh, for its area count.
 * @param {object} perObject The per-object payload pair.
 * @returns {object} The renderable.
 */
function HullRenderable(areas, geometry, perObject)
{
  // ONE MESH AREA PER DOCUMENT AREA, EACH WITH ITS OWN SHADER. This built a
  // single area spanning every geometry range and gave the whole mesh the FIRST
  // area's material - so `area_booster` was drawn with `quadv5` instead of the
  // `quadheatv5` the document names for it. That is why the booster showed
  // texture but no heat: it was not running the heat shader at all. The index
  // and count come from the document too, rather than being assumed.
  const meshAreas = areas.map(({ material, index, count }) =>
  {
    const area = new Tr2MeshArea();

    area.SetMaterial(material);
    area.SetIndex(index);
    area.SetCount(count);

    return area;
  });

  return {
    GetPerObjectData: () => perObject,
    HasTransparentBatches: () => false,
    GetBatches(accumulator, batchType, perObjectData)
    {
      if (batchType !== TriBatchType.TRIBATCHTYPE_OPAQUE) return false;

      // The real batch-building path: the declaration is translated here and
      // the draw arguments come from the LOD's areas.
      const base = new Tr2MeshBase();

      base.meshIndex = 0;
      base.GetGeometryResource = () => geometry;

      return base.GetBatches(accumulator, meshAreas, perObjectData);
    }
  };
}


/**
 * How many pixels differ from the clear colour.
 *
 * Read back off the GPU rather than inferred from a screenshot: both cheaper
 * proxies have given a wrong answer here before, in both directions.
 *
 * THE TEXTURE IS THE ONE THE PASS RENDERED INTO, passed in, and that is the
 * whole correction. This called `context.getCurrentTexture()` itself, which
 * after a submit can hand back a DIFFERENT swap-chain image than the frame was
 * drawn into - so it counted zero while the hull was on screen, and the demo
 * then ran its cull-inverted second frame and wiped the hull away. The operator
 * saw the silhouette for a split second; the instruments reported nothing.
 *
 * @param {GPUDevice} device Live device.
 * @param {GPUTexture} texture The texture the frame rendered into.
 * @param {HTMLCanvasElement} canvas The canvas drawn into.
 * @returns {Promise<number>} Count of non-clear pixels.
 */
async function CountDrawnPixels(device, texture, canvas)
{
  if (!texture) return 0;

  const bytesPerRow = Math.ceil(canvas.width * 4 / 256) * 256;
  const buffer = device.createBuffer({
    size: bytesPerRow * canvas.height,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const encoder = device.createCommandEncoder();

  encoder.copyTextureToBuffer(
    { texture },
    { buffer, bytesPerRow },
    { width: canvas.width, height: canvas.height }
  );

  device.queue.submit([ encoder.finish() ]);

  await buffer.mapAsync(GPUMapMode.READ);

  const pixels = new Uint8Array(buffer.getMappedRange());
  const clear = [ pixels[0], pixels[1], pixels[2] ];
  let drawn = 0;

  for (let y = 0; y < canvas.height; y += 1)
  {
    for (let x = 0; x < canvas.width; x += 1)
    {
      const at = y * bytesPerRow + x * 4;

      if (pixels[at] !== clear[0] || pixels[at + 1] !== clear[1] || pixels[at + 2] !== clear[2]) drawn += 1;
    }
  }

  buffer.unmap();
  buffer.destroy();

  return drawn;
}


/**
 * An EveCamera orbiting the hull, as the client's space camera orbits a ship.
 *
 * The camera's parent is the hull's centre (`extraTranslation`), its distance
 * `translationFromParent`. It starts on the angle the demo used to fix: yaw a
 * quarter turn between +X and +Z, pitched slightly down onto the hull. The clip
 * planes follow the hull's size; the camera's defaults (10 to 10,000,000) suit
 * a scene, not one frigate.
 *
 * @param {object} bounds Centre and radius of the hull.
 * @returns {EveCamera} The camera.
 */
function OrbitCamera(bounds)
{
  const camera = new EveCamera();

  camera.useExtraTranslation = true;
  vec3.copy(camera.extraTranslation, bounds.centre);
  camera.fieldOfView = Math.PI / 4;
  camera.frontClip = Math.max(1, bounds.radius * 0.05);
  camera.backClip = bounds.radius * 100;
  camera.translationFromParent = bounds.radius * 2.2;
  camera.SetOrbit(Math.PI / 4, -0.3);
  return camera;
}

/**
 * A frame-rate readout in the bottom-left corner, after skindr's FpsMeter: the
 * number is a one-second average, the graph is every frame's rate over the last
 * two seconds against a fixed 60 ceiling, so a single stalled frame shows.
 * Fed from the loop's own requestAnimationFrame timestamps.
 *
 * @returns {{Sample: (timestamp: number) => void}} The meter.
 */
function CreateFpsMeter()
{
  const SAMPLES = 120, CEILING = 60;
  const host = document.createElement("div");
  host.id = "fps";
  host.style.cssText = "position: fixed; left: 12px; bottom: 12px; z-index: 2; display: flex; gap: 8px; align-items: center;"
    + " color: #cfd6e4; font: 13px/1 ui-monospace, monospace; text-shadow: 0 0 3px #000, 0 0 1px #000; pointer-events: none;";
  const label = document.createElement("span");
  label.textContent = "-- fps";
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLES;
  canvas.height = 24;
  // The page sizes every canvas to the viewport (index.html); this one is fixed.
  canvas.style.cssText = `width: ${SAMPLES}px; height: 24px;`;
  host.append(label, canvas);
  document.body.append(host);
  const context = canvas.getContext("2d");
  const samples = new Float32Array(SAMPLES);
  let at = 0, last = 0, windowStart = 0, windowFrames = 0;

  return {
    Sample(timestamp)
    {
      if (last)
      {
        const dt = (timestamp - last) / 1000;
        samples[at] = dt > 0 ? 1 / dt : 0;
        at = (at + 1) % SAMPLES;
      }
      last = timestamp;

      if (!windowStart) windowStart = timestamp;
      windowFrames += 1;
      if (timestamp - windowStart >= 1000)
      {
        label.textContent = `${Math.round(windowFrames * 1000 / (timestamp - windowStart))} fps`;
        windowStart = timestamp;
        windowFrames = 0;
      }

      context.clearRect(0, 0, SAMPLES, 24);
      context.beginPath();
      for (let i = 0; i < SAMPLES; i++)
      {
        const y = 24 - Math.min(1, samples[(at + i) % SAMPLES] / CEILING) * 24;
        if (i === 0) context.moveTo(i, y);
        else context.lineTo(i, y);
      }
      context.strokeStyle = "#f7941d";
      context.lineWidth = 1;
      context.stroke();
    }
  };
}


/**
 * Keeps the canvas's backing size equal to its displayed size.
 *
 * The page sizes the canvas once at load, and CSS then stretches it to the
 * window, so a resize (or devtools opening) distorted the image. When the two
 * differ this resizes the canvas, reconfigures the render target and updates
 * the viewport constants.
 *
 * @param {HTMLCanvasElement} canvas The canvas.
 * @param {object} renderTarget The canvas render target.
 * @param {{vs: object, ps: object}} frame The per-frame blocks.
 * @returns {void}
 */
function FitCanvas(canvas, renderTarget, frame)
{
  const width = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio));
  const height = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio));
  if (width === canvas.width && height === canvas.height) return;

  canvas.width = width;
  canvas.height = height;
  renderTarget.Configure({ width, height });
  for (const block of [ frame.vs, frame.ps ])
  {
    block.Set("TargetResolution", [ width, height ]);
    block.Set("ViewportSize", [ width, height ]);
  }
}


/**
 * The scene's per-frame blocks, with everything but the camera filled.
 *
 * @param {number} width Viewport width in pixels.
 * @param {number} height Viewport height in pixels.
 * @returns {{vs: object, ps: object, viewProjection: Float32Array}} The blocks.
 */
function PerFrameData(width, height)
{
  const vs = RawData.create("EveSpaceScenePerFrameVSData");
  const ps = RawData.create("EveSpaceScenePerFramePSData");

  vs.Set("Sun.DirWorld", SunDirWorld());
  vs.Set("Sun.DiffuseColor", [ 1, 1, 1, 1 ]);
  vs.Set("TargetResolution", [ width, height ]);
  vs.Set("ViewportSize", [ width, height ]);

  ps.Set("Sun.DirWorld", SunDirWorld());
  ps.Set("Sun.DiffuseColor", [ 1, 1, 1, 1 ]);
  // ccpwgl's own scene defaults rather than invented numbers: ambient and fog
  // both 0.25 grey, sun diffuse white (`EveSpaceScene.js:187,225,286`).
  ps.Set("AmbientColor", [ 0.25, 0.25, 0.25 ]);
  ps.Set("FogColor", [ 0.25, 0.25, 0.25, 1 ]);
  ps.Set("ReflectionIntensity", 1);
  ps.Set("ViewportSize", [ width, height ]);
  ps.Set("TargetResolution", [ width, height ]);

  // GAMMABRIGHTNESS IS WHY THE HULL WAS WHITE, and it is worth spelling out
  // because a zero here is not a dim picture, it is a saturated one. `quadv5`
  // ends with the sRGB encode, and the encode's exponent IS this field:
  //
  //     value187 = log2(colour) * cb2[21].w
  //     value189 = exp2(value187)          // colour raised to that power
  //
  // At zero the multiply annihilates the logarithm, `exp2(0)` is one whatever
  // the colour was, and every channel leaves at 1.0. Lighting, textures and
  // material constants can all be perfect and the frame is still pure white -
  // which is exactly what it was, and why chasing the textures first found
  // nothing wrong with them.
  //
  // `SceneMipLodBias` sits beside it and reaches every `textureSampleBias` in
  // the shader; zero is the honest default, but it is set explicitly so the
  // next reader knows it was considered rather than missed.
  ps.Set("GammaBrightness", 1);
  ps.Set("SceneMipLodBias", 0);
  ps.Set("Upscaling", 1);

  return { vs, ps, viewProjection: mat4.create() };
}


/**
 * Updates the camera and writes its view and projection into the frame.
 *
 * CARBON IS ROW-VECTOR AND gl-matrix IS COLUMN-VECTOR, so every composition
 * swaps its operands: Carbon's `view * projection` is `multiply(out,
 * projection, view)` here. The camera's projection is Carbon's own
 * (`EveCamera::CalculateProjectionMatrix`), depth 0 to 1 as WebGPU's clip
 * volume expects.
 *
 * @param {{vs: object, ps: object, viewProjection: Float32Array}} frame The blocks.
 * @param {EveCamera} camera The camera.
 * @param {number} width Viewport width in pixels.
 * @param {number} height Viewport height in pixels.
 * @returns {void}
 */
function WriteCamera(frame, camera, width, height)
{
  const seconds = performance.now() / 1000;

  camera.Update(seconds, width / height, seconds);

  const { vs, ps, viewProjection } = frame;
  const view = camera.GetViewMatrix().transform;

  // REVERSE-Z, as EveSpaceScene's fills give it (cpp:3022): the driver inverts
  // the depth test and clears depth to 0, so the shaders get Carbon's
  // reversed-depth projection - Tr2Renderer::GetReversedDepthProjectionTransform
  // (Tr2Renderer.cpp:477-483), _33 -> -_33 - 1 and _43 -> -_43, at 10 and 14.
  const projection = mat4.copy(mat4.create(), camera.GetProjection().transform);
  projection[10] = -projection[10] - 1;
  projection[14] = -projection[14];

  mat4.multiply(viewProjection, projection, view);

  // TRANSPOSED ON THE WAY IN, which is not decoration. The shader reads each
  // matrix as four consecutive `vec4`s and DOTS the position with them, so it
  // wants the rows where gl-matrix stores columns. `SetAndTranspose` is the
  // method the rest of the runtime writes these with for exactly that reason.
  //
  // ViewInverseTransposeMat IS WHAT ITS NAME SAYS: the TRANSPOSED inverse view,
  // which SetAndTranspose then stores as the inverse view itself. That is
  // Carbon's "need the transposed, but shader also needs column_major, so it is
  // transpose(transpose(m)) == m" (EveSpaceScene.cpp:3026-3027, 3082-3083).
  // Passing the plain inverse scrambled the camera position and view
  // directions the shader derives from it, so Fresnel and reflections landed
  // on the wrong surfaces: gold dark, matte panels shiny.
  const viewInverse = mat4.invert(mat4.create(), view);
  const viewInverseTranspose = mat4.transpose(mat4.create(), viewInverse);

  vs.SetAndTranspose("ViewMat", view);
  vs.SetAndTranspose("ProjectionMat", projection);
  vs.SetAndTranspose("ViewProjectionMat", viewProjection);
  vs.SetAndTranspose("ViewInverseTransposeMat", viewInverseTranspose);
  ps.SetAndTranspose("ViewInverseTransposeMat", viewInverseTranspose);
  ps.SetAndTranspose("ViewMat", view);
}


/**
 * Writes one world transform into both halves of a per-object payload.
 *
 * The vertex and pixel blocks carry the SAME three matrices under the same
 * names, and Carbon fills both - a pixel stage that reconstructs world position
 * needs them as much as the vertex stage does.
 *
 * worldTransformLast is the PREVIOUS frame's world, which the velocity
 * shaders difference against (Carbon sets it from the outgoing transform at
 * the start of UpdateWorldTransform, EveSpaceObject2.cpp:3060-3061).
 *
 * @param {object} perObject A `{ vs, ps }` pair of `RawData`.
 * @param {Float32Array} world The world transform.
 * @param {Float32Array} [last] Last frame's world; a still object passes none.
 * @returns {void}
 */
function SetWorld(perObject, world, last = world)
{
  const inverse = mat4.invert(mat4.create(), world);

  for (const block of [ perObject.vs, perObject.ps ])
  {
    if (!block) continue;

    block.SetAndTranspose("worldTransform", world);
    block.SetAndTranspose("worldTransformLast", last);
    block.SetAndTranspose("invWorldTransform", inverse);
  }
}


/** Composes and runs one frame. Returns a short report for the page. */
export async function RunDemo(canvas)
{
  const liveInput = new URLSearchParams(globalThis.location?.search ?? "").get("still") !== "1";
  const adapter = await navigator.gpu?.requestAdapter();

  if (!adapter) throw new Error("no WebGPU adapter");

  // ASKS FOR BC, TAKES WHAT IT GETS. EVE's maps are BC7 and WebGPU exposes the
  // family only behind this feature; a device without it decodes to RGBA8
  // instead, so the demo runs either way and reports which happened.
  const compressed = adapter.features.has("texture-compression-bc");
  // BC VOLUMES are a second feature: the impact effects' 3D maps are BC3, and
  // WebGPU refuses a BC 3D texture without it (the AL then refuses it too, and
  // the effect samples its fallback).
  const compressed3d = compressed && adapter.features.has("texture-compression-bc-sliced-3d");
  // SIXTEEN STORAGE TEXTURES PER STAGE, or as many as the adapter has:
  // CORTAO's Pack kernel declares sixteen packed mips (PackedOutputBuffer0..15),
  // the reflection probe's main filter seven cube mips, and WebGPU's default
  // is four. With fewer than sixteen the Pack pipeline is refused, and
  // demo.ssao() reports the limit.
  const storageTextures = Math.min(16, adapter.limits.maxStorageTexturesPerShaderStage);
  // FILTERABLE 32-BIT FLOAT, when the adapter has it. D3D11 samples R32_FLOAT
  // through any sampler, and Carbon's post process does (the down-sampled depth
  // god rays read); core WebGPU refuses an r32float in a filterable slot.
  const filterableFloat32 = adapter.features.has("float32-filterable");
  // UNCLIPPED DEPTH, when the adapter has it: Carbon draws its shadow cascades
  // with depth clip off (EveSpaceScene.cpp:748).
  const depthClipControl = adapter.features.has("depth-clip-control");
  // 16384-WIDE TEXTURES, or as wide as the adapter allows: Carbon's cascaded
  // shadow atlas is 16384 x 4096 at its default cell (Tr2ShadowMap.h:14), and
  // WebGPU's default limit is 8192. Narrower, the atlas is refused and the
  // frame has no shadows; demo.shadows() reports the limit.
  const textureDimension = Math.min(16384, adapter.limits.maxTextureDimension2D);
  const requiredFeatures = [
    ...(compressed ? [ "texture-compression-bc" ] : []),
    ...(compressed3d ? [ "texture-compression-bc-sliced-3d" ] : []),
    ...(filterableFloat32 ? [ "float32-filterable" ] : []),
    ...(depthClipControl ? [ "depth-clip-control" ] : [])
  ];
  const device = await adapter.requestDevice({
    ...(requiredFeatures.length ? { requiredFeatures } : {}),
    requiredLimits: { maxStorageTexturesPerShaderStage: storageTextures, maxTextureDimension2D: textureDimension }
  });
  const capture = createViewportCapture({ device });
  device.lost.then(info => capture.fail(new Error(`Device lost: ${info.message}`)));
  const context = canvas.getContext("webgpu");

  // REMEMBERS WHICH SWAP-CHAIN IMAGE THE FRAME WENT INTO, because asking the
  // context again after a submit can hand back a different one, and the readback
  // then measures a blank image while the drawn one is on screen.
  let presented = null;
  const getCurrentTexture = context.getCurrentTexture.bind(context);

  context.getCurrentTexture = () =>
  {
    presented = getCurrentTexture();

    return presented;
  };
  const format = navigator.gpu.getPreferredCanvasFormat();

  // THE CONTEXT IS CONFIGURED ONCE, BY THE RENDER TARGET, below. Configuring it
  // here as well destroys the canvas texture the target has already acquired,
  // and the only symptom is a submit warning and a blank canvas.
  // DIAGNOSTIC, AND IT EARNED ITS PLACE. A frame that resolves a pipeline and
  // encodes a draw and still shows nothing has several equally plausible causes
  // - winding, depth compare, matrices, a black material - and guessing between
  // them cost three wrong attempts the last time. This reports what the device
  // was actually asked for.
  const pipelines = [];
  const createRenderPipeline = device.createRenderPipeline.bind(device);

  device.createRenderPipeline = descriptor =>
  {
    pipelines.push({
      primitive: descriptor.primitive ?? null,
      depthStencil: descriptor.depthStencil ?? null,
      targets: (descriptor.fragment?.targets ?? []).map(target => ({
        format: target?.format ?? null,
        blend: target?.blend ?? null,
        writeMask: target?.writeMask ?? null
      })),
      vertexBuffers: (descriptor.vertex?.buffers ?? []).map(buffer => ({
        arrayStride: buffer?.arrayStride ?? null,
        attributes: (buffer?.attributes ?? []).map(a => `${a.shaderLocation}:${a.format}@${a.offset}`)
      }))
    });

    return createRenderPipeline(descriptor);
  };

  // Every constant upload, so "the matrix never reached the shader" can be
  // distinguished from "the matrix was wrong" without another guess.
  // Both logs feed only the start-up report and stop once it is taken; kept
  // for the life of the page they grew without bound (~74 MB per 15 s).
  const uploads = [];
  let recordDiagnostics = true;
  const writeBuffer = device.queue.writeBuffer.bind(device.queue);

  device.queue.writeBuffer = (buffer, offset, data, ...rest) =>
  {
    if (!recordDiagnostics) return writeBuffer(buffer, offset, data, ...rest);
    // THROUGH THE VIEW, NOT THE BACKING BUFFER. Reading `data.buffer` from zero
    // ignores `byteOffset` and reports whatever else shares the allocation: the
    // first version of this probe showed vertex positions where it claimed to
    // show constants, which is a worse failure than no probe at all.
    const view = data.buffer
      ? new Float32Array(data.buffer, data.byteOffset ?? 0, Math.floor((data.byteLength ?? data.buffer.byteLength) / 4))
      : new Float32Array(data);

    uploads.push({
      label: buffer.label ?? null,
      offset,
      bytes: view.byteLength,
      floats: Array.from(view.slice(0, 128))
    });

    return writeBuffer(buffer, offset, data, ...rest);
  };

  const bindGroups = [];
  const createBindGroup = device.createBindGroup.bind(device);

  device.createBindGroup = descriptor =>
  {
    bindGroups.push((descriptor.entries ?? []).map(entry => ({
      binding: entry.binding,
      kind: entry.resource?.buffer ? "buffer" : (entry.resource?.constructor?.name ?? "resource"),
      offset: entry.resource?.offset ?? null,
      size: entry.resource?.size ?? null
    })));

    return createBindGroup(descriptor);
  };

  // What the encoder was actually told to draw. An index count of zero and a
  // full count that is entirely culled look identical on the canvas.
  const draws = [];
  const createCommandEncoder = device.createCommandEncoder.bind(device);

  device.createCommandEncoder = descriptor =>
  {
    const encoder = createCommandEncoder(descriptor);
    const beginRenderPass = encoder.beginRenderPass.bind(encoder);

    encoder.beginRenderPass = passDescriptor =>
    {
      const depth = passDescriptor.depthStencilAttachment;

      draws.push(`beginRenderPass:colors=${(passDescriptor.colorAttachments ?? []).map(a => `${a?.loadOp}/${a?.storeOp}`).join("|")}`
        + ` depth=${depth ? `${depth.depthLoadOp}/${depth.depthStoreOp}@${depth.depthClearValue}` : "none"}`);

      const pass = beginRenderPass(passDescriptor);
      const drawIndexed = pass.drawIndexed.bind(pass);
      const setBindGroup = pass.setBindGroup.bind(pass);
      const setViewport = pass.setViewport?.bind(pass);
      const setScissorRect = pass.setScissorRect?.bind(pass);

      if (setViewport) pass.setViewport = (...a) => { draws.push(`setViewport:${a.join(",")}`); return setViewport(...a); };
      if (setScissorRect) pass.setScissorRect = (...a) => { draws.push(`setScissorRect:${a.join(",")}`); return setScissorRect(...a); };

      pass.setBindGroup = (index, group, offsets) =>
      {
        draws.push(`setBindGroup:${index}:offsets=${(offsets ?? []).join("/")}`);

        return setBindGroup(index, group, offsets);
      };
      const setIndexBuffer = pass.setIndexBuffer.bind(pass);
      const setVertexBuffer = pass.setVertexBuffer.bind(pass);

      pass.drawIndexed = (...args) => { draws.push(`drawIndexed:${args.join(",")}`); return drawIndexed(...args); };
      pass.setIndexBuffer = (buffer, format, offset, size) =>
      {
        draws.push(`setIndexBuffer:${format}@${offset ?? 0}+${size ?? "rest"}`);

        return setIndexBuffer(buffer, format, offset, size);
      };
      pass.setVertexBuffer = (slot, buffer, offset, size) =>
      {
        draws.push(`setVertexBuffer:${slot}@${offset ?? 0}+${size ?? "rest"}`);

        return setVertexBuffer(slot, buffer, offset, size);
      };

      return pass;
    };

    return encoder;
  };

  // Counts the textures that actually reach the device, which is the only proof
  // that a loaded map became a bound one rather than a dummy.
  const madeTextures = [];
  const createTexture = device.createTexture.bind(device);

  // READABLE STORAGE BUFFERS, for the demo's readbacks (demo.flare(),
  // demo.exposure()). A buffer is a copy source only when its CPU usage says
  // READ, which the GPU-written ones never do. Diagnostic only.
  const createBuffer = device.createBuffer.bind(device);
  device.createBuffer = descriptor => createBuffer(
    (descriptor.usage & GPUBufferUsage.STORAGE) ? { ...descriptor, usage: descriptor.usage | GPUBufferUsage.COPY_SRC } : descriptor);

  device.createTexture = descriptor =>
  {
    const layers = descriptor.size?.[2] ?? descriptor.size?.depthOrArrayLayers ?? 1;

    madeTextures.push(`${descriptor.size?.[0] ?? descriptor.size?.width}x${descriptor.size?.[1] ?? descriptor.size?.height}x${layers}:${descriptor.format}:${descriptor.mipLevelCount ?? 1}mip`);

    return createTexture(descriptor);
  };

  const webgpu = new CjsWebgpuDevice({ device, shaderStage: GPUShaderStage });
  let sof = null;
  let HULL = null;
  let hullBytes = null;
  let mesh = null;
  let bounds = null;
  let geometry = null;
  let ship = null;
  let disposed = false;
  let framePump = null;
  const pendingShips = new Set();
  const textures = { loaded: 0, failed: [] };

  // EACH AREA GETS ITS OWN SHADER. The report and the console read areas as
  // { material, path, name, index, count } in both modes.
  const areas = [];

  // THE REAL SCENE: a SOF-built ship in an EveSpaceScene, which owns its
  // per-frame data, its global textures and its lens flares. Built before the
  // device exists; construction registers its logical BoneTransforms ring.
  // Device preparation realizes the ring storage after AL attachment.
  //
  // The universe scene's values - its background effect, environment maps,
  // nebula intensity, ambient colour and fog - go onto the scene as values.
  // Loading it as an object would run its Initialize now, and Initialize needs
  // the device, which this demo only creates later (al.CreateDevice); the
  // client has its device before it loads a scene. Initialize runs below, once
  // the device exists.
  const realScene = SCENE_MODE === "sof" ? new EveSpaceScene() : null;
  if (realScene)
  {
    const universe = CjsBlackFormat.read(await ResourceBytes(SCENE_UNIVERSE.replace(/^res:\/+/u, "")), { emit: "json" }).object;
    if (universe._type !== "EveSpaceScene") throw new Error(`demo: ${SCENE_UNIVERSE} is a ${universe._type}, not an EveSpaceScene`);
    realScene.SetValues(universe);
  }

  if (realScene)
  {
    // ?alpha=1 keeps the canvas clear: no background pass and no nebula.
    if (ALPHA)
    {
      realScene.backgroundRenderingEnabled = false;
      realScene.envMapResPath = "";
    }
    // THE CLIENT'S "dynamic lights" GRAPHICS SETTING: Carbon ships
    // g_eveSpaceSceneDynamicLighting false (EveSpaceScene.cpp:109-110), and
    // without it BeginRender deletes the light manager, so attachment lights
    // (spotlights, planes, boosters, sprite sets) never reach a shader.
    // ?dynamicLights=0 renders without them.
    Tr2Renderer.getSettings().SetValue("eveSpaceSceneDynamicLighting", new URLSearchParams(globalThis.location?.search ?? "").get("dynamicLights") !== "0");
    // THE CLIENT'S SETTINGS PROFILE, applied before any renderer exists: the
    // client turns Carbon's g_newBloom (default true, Tr2PostProcessRenderer.cpp:23-24)
    // off at startup, because the new bloom does not suit its textures. Each
    // renderer copies it into m_useNewBloom at construction (cpp:525).
    // ?newBloom=1 restores Carbon's default for comparison.
    Tr2Renderer.getSettings().SetValue("newBloom", new URLSearchParams(globalThis.location?.search ?? "").get("newBloom") === "1");
    ship = await BuildSofShip(DNA);
    ship.displayKillCounterValue = KILLS;
    const banners = ApplyDemoBanners(ship);
    if (banners.length) console.info(`demo banners: ${banners.join(", ")}`);

    // THE CLIENT'S SPEED FEED: Carbon's m_speed is a TriFloat the client binds
    // to the ball's velocity, and UpdateBoosters hands its value to the
    // booster set (EveShip2.cpp:55-64). Unbound, the ship reads as stationary
    // and its boosters and engine heat stay dark.
    ship.speed = new TriFloat();
    realScene.objects.push(ship);

    // THE CLIENT'S GPU PARTICLE SYSTEM: the resource index holds exactly one
    // Tr2GpuParticleSystem, and the client assigns it to the scene's Blue
    // property (EveSpaceScene_Blue.cpp:472), which hands it to every emitter
    // through the update context. The client code is Python and not in
    // Carbon, so this is its step. ?gpuParticles=0 leaves the scene without.
    if (new URLSearchParams(globalThis.location?.search ?? "").get("gpuParticles") !== "0")
    {
      try
      {
        realScene.gpuParticleSystem = await blue.resMan.LoadObject("res:/fisfx/gpuparticles/system.black");
        console.log(`gpu particles: ${realScene.gpuParticleSystem.constructor.name}, maxParticles ${realScene.gpuParticleSystem.maxParticles}`);
      }
      catch (error)
      {
        console.error(`gpu particles: ${error.message}`);
      }
    }

    HULL = ship.mesh?.geometryResPath?.replace(/^res:\/+/u, "") ?? "";
    bounds = { centre: vec3.clone(ship.boundingSphereCenter), radius: ship.boundingSphereRadius || 1 };
    for (const area of ship.mesh?.opaqueAreas ?? [])
    {
      areas.push({ material: area.effect, path: area.effect?.effectFilePath ?? "", name: area.name, index: area.index ?? 0, count: area.count ?? 1 });
    }
  }
  else
  {
      sof = await SofDocument(DNA);
    // The document names the geometry; the default hull only when it cannot be had.
    HULL = sof?.mesh?.geometryResPath?.replace(/^res:\//u, "") || DEFAULT_HULL;
    const documentAreas = sof?.mesh?.opaqueAreas ?? [];
    hullBytes = await ResourceBytes(HULL);
    mesh = Unpack(HullMesh(hullBytes), ReadsPackedTangents(documentAreas));
    bounds = Bounds(mesh);
    geometry = GeometryResource(mesh, `res:/${HULL}`);

    // EACH AREA GETS ITS OWN SHADER. `area_hull` names `quadv5` and `area_booster`
    // names `quadheatv5`; one material for both meant the booster ran the hull's
    // shader, which is why it showed texture and no heat.

    for (const declared of documentAreas)
    {
      const effect = DETAIL_TEST && declared.name === "area_hull" && declared.effect
        ? WithDetailMaps(declared.effect)
        : declared.effect ?? null;
      const path = effect?.effectFilePath ? EffectPath(effect.effectFilePath) : EFFECT;
      const material = await Material(`res:/${path}`, effect);

      // The scene's share of the texture slots, before the material is applied
      // and its resource set laid out. Added as ordinary named parameters,
      // because that is how a material finds a texture: by the name the shader
      // declares. Every area needs its own - a resource set is per material.
      for (const scene of SCENE_TEXTURES)
      {
        const parameter = new TriTextureParameter();

        parameter.name = scene.name;
        parameter.SetResourcePath(SceneTexturePath(scene));
        material.resources.push(parameter);
      }

      material.RebuildCachedData();

      const loaded = await LoadTextures(material);

      textures.loaded += loaded.loaded;
      textures.failed.push(...loaded.failed);

      areas.push({
        material,
        path,
        name: declared.name,
        index: declared.index ?? 0,
        count: declared.count ?? 1
      });
    }

  }

  if (!areas.length) throw new Error("the SOF document declares no opaque areas");

  const material = areas[0].material;
  const effectPath = areas[0].path;
  const frame = PerFrameData(canvas.width, canvas.height);
  const camera = OrbitCamera(bounds);

  const cameraSphere = new Float32Array(4);
  const controls = createCameraControls({ camera,
    getViewport: () => ({ width: canvas.clientWidth, height: canvas.clientHeight }),
    getBounds: () => readShipBounds(ship, bounds, cameraSphere)
  });
  controls.frame();
  WriteCamera(frame, camera, canvas.width, canvas.height);

  // The hull sits at the origin, so the camera does the framing and the world
  // matrix is identity. EveTransform's payload is the simplest placeable one
  // and carries the three matrices a ship's vertex stage reads.
  // THE SHIP'S OWN PER-OBJECT PAIR, not EveTransform's. The pixel stage
  // declares b4 and reads exactly ROW 12 of it, which is `shipData` in
  // `EveSpaceObjectPSData` - booster glow, activation, DIRT LEVEL and bounding
  // radius. With no PS payload supplied, b4 was handed the same arena region as
  // b0, so the shader read the MATERIAL's colours as ship data and the hull
  // blew out white. EveTransform's payload has no pixel half at all, which is
  // why it could never have filled that register.
  const perObject = {
    vs: RawData.create("EveSpaceObjectVSData"),
    ps: RawData.create("EveSpaceObjectPSData")
  };
  const renderable = realScene ? ship : HullRenderable(areas, geometry, perObject);

  // CONSOLE ACCESS, for editing values live. There is no EveShip2 here: the
  // "ship" is the SOF document, one Tr2Effect per area, the mesh and the ship's
  // per-object data. `demo.param("area_hull", "Mat1DiffuseColor")` finds a
  // material parameter; edit its `value` in place.
  // The max speed demo.speed() measures against; 1 keeps the authoring convention.
  const demoSpeed = { maxSpeed: 1 };
  globalThis.demo = {
    scene: realScene,
    sof,
    areas,
    materials: Object.fromEntries(areas.map(area => [ area.name, area.material ])),
    renderable,
    perObject,
    camera,
    cameraControls: controls,
    frame,
    SetWorld: world => SetWorld(perObject, world),
    param: (areaName, parameterName) => areas
      .find(area => area.name === areaName)?.material.parameters
      .find(parameter => parameter.name === parameterName) ?? null,
    params: areaName => areas
      .find(area => area.name === areaName)?.material.parameters
      .map(parameter => parameter.name) ?? [],
    // shipData is one register of four unrelated floats, and Carbon writes the
    // same value into both halves (EveSpaceObject2.cpp:666-671, :769-776):
    // x booster glow, y activation strength, z dirt level, w bounding radius.
    shipData: (values = {}) =>
    {
      const data = Array.from(perObject.ps.Get("shipData"));
      if (values.boosterGlow !== undefined) data[0] = values.boosterGlow;
      if (values.activation !== undefined) data[1] = values.activation;
      if (values.dirt !== undefined) data[2] = values.dirt;
      if (values.radius !== undefined) data[3] = values.radius;
      perObject.ps.Set("shipData", data);
      perObject.vs.Set("shipData", data);
      return { boosterGlow: data[0], activation: data[1], dirt: data[2], radius: data[3] };
    },
    dirt: value => realScene ? (ship.dirtLevel = value) : globalThis.demo.shipData({ dirt: value }),
    age: weeks => globalThis.demo.dirt(DirtLevelFromWeeks(weeks)),
    // Normalized speed: the booster set divides the ship's speed by its maxVel.
    //
    // THE CLIENT'S BALL, so effect children see the speed too. Carbon's
    // ShipSpeed() is |GetWorldVelocity()| and ShipMaxSpeed() the ship's
    // GetMaxSpeed() (Tr2ControllerExpression.cpp:142-190); the smart-light
    // shipSpeed reads the same velocity. The velocity is the derivative of the
    // ball position the client binds (m_ballPosition, EveSpaceObject2.cpp:
    // 3063-3067). This ball holds the ship at the origin and reports the speed
    // along the ship's local Z.
    //
    // THE DEMO'S SPEED CONVENTION (operator): no real ship speeds, modifiers or
    // skills. The slider (0-2) is the speed and maxSpeed is 1, as the editors
    // author against: ShipSpeed()/ShipMaxSpeed() reaches 1 at full speed and
    // runs to 2 with an active propulsion modifier (afterburner/MWD). The
    // booster set divides the same speed by its maxVel (EveBoosterSet2.cpp:
    // 109; default 250, a writable attribute), overridden to the same 1.
    // demo.maxSpeed(value): sets the max speed the speed is measured against
    // (the ship's maxSpeed and its booster set's maxVel); no argument reads it.
    maxSpeed: value =>
    {
      if (value !== undefined) demoSpeed.maxSpeed = Math.max(0.01, Number(value) || 1);
      return demoSpeed.maxSpeed;
    },
    speed: value =>
    {
      if (!ship) return;
      const worldSpeed = Number(value) || 0;
      ship.maxSpeed = demoSpeed.maxSpeed;
      if (ship.boosters) ship.boosters.maxVel = demoSpeed.maxSpeed;
      if (!ship.translationCurve)
      {
        const velocity = vec3.create();
        ship.translationCurve = { velocity, Update: (_time, out) => vec3.set(out, 0, 0, 0), GetValueDotAt: (_time, out) => vec3.copy(out, velocity) };
      }
      vec3.set(ship.translationCurve.velocity, 0, 0, worldSpeed);
    },
    // The ship's kill count, 0 to 999, shown by its kill-counter decals.
    kills: value => { if (ship) ship.displayKillCounterValue = DemoKillCount(value); return ship?.displayKillCounterValue ?? null; },
    activation: value => realScene ? (ship.activationStrength = value) : globalThis.demo.shipData({ activation: value }),
    // Remaining shield, armor and hull, 0 to 1, as the client sets them
    // (EveSpaceObject2::SetImpactDamageState, cpp:3500). Armour below 1 seeds
    // armour impacts on the damage locators, drawn by the DECAL damage pass.
    // With no arguments, only reports.
    damage: (shield, armor, hull) =>
    {
      if (!realScene) return null;
      if (shield !== undefined) ship.SetImpactDamageState(Number(shield), Number(armor ?? 1), Number(hull ?? 1), true);
      const overlay = ship.impactOverlay?.damageOverlay ?? null;
      return {
        armorActivity: overlay?.HasArmorActivity() ?? null,
        hullActivity: overlay?.HasHullActivity() ?? null,
        renderPriority: overlay?.renderPriority ?? null,
        dataTextureBlockID: overlay?.dataTextureBlockID ?? null,
        dataTextureOffset: overlay?.GetDataTextureOffset() ?? null,
        decalShader: overlay?.GetArmorDamageShader(TriBatchType.TRIBATCHTYPE_DECAL)?.effectFilePath ?? null,
        estimatedPixelDiameter: ship.estimatedPixelDiameter
      };
    },
    // A module animation on or off: shieldboost, shieldhardening,
    // armorhardening, armorrepair or hullrepair (SetImpactAnimation,
    // cpp:3580). The fade takes a quarter of the duration, in seconds.
    effect: (name, on, duration = 4) => { if (realScene) ship.SetImpactAnimation(name, !!on, Number(duration)); },
    // The hull's state presets (ShipStates) and a setter; the setter writes 1
    // or 0 into every variable behind the state, through the ship.
    get shipStates() { return realScene ? ShipStates(ship) : []; },
    setShipState: (kind, on) =>
    {
      const state = realScene ? ShipStates(ship).find(entry => entry.kind === kind) : null;
      for (const name of state?.names ?? []) ship.SetControllerVariable(name, on ? 1 : 0);
      return state?.names ?? [];
    },
    // Cloaks the ship with res:/fisfx/cloaking/<name>.black, an
    // EveMeshOverlayEffect, doing the client's part: its "self_" bindings
    // (clipSphereFactor, activationStrength) are pointed at the ship, the
    // overlay joins ship.overlayEffects, and its curve set plays (6 s). The
    // _skinned variant is picked when the hull's shaders are skinned.
    // demo.cloak(false) removes it and restores the ship.
    cloak: async (on = true, name = null) =>
    {
      if (!realScene || disposed) return null;
      const owner = ship;
      for (const overlay of owner.overlayEffects.filter(overlay => overlay.name?.startsWith("fisfx_cloaking_")))
      {
        owner.overlayEffects.splice(owner.overlayEffects.indexOf(overlay), 1);
      }
      owner.clipSphereFactor = 0;
      owner.activationStrength = 1;
      owner.OnModified("clipSphereFactor");
      if (!on) return null;
      const skinned = (owner.mesh?.opaqueAreas ?? []).some(area => /skinned/iu.test(area.effect?.effectFilePath ?? ""));
      const file = name ?? (skinned ? "cloaking_skinned" : "cloaking");
      const bytes = await ResourceBytes(`fisfx/cloaking/${file}.black`);
      if (disposed || owner !== ship) return null;
      const overlay = CjsBlackFormat.read(bytes, { emit: "runtime" }).root;
      for (const binding of overlay.curveSet?.bindings ?? [])
      {
        if (!binding.name.startsWith("self_")) continue;
        binding.destinationObject = owner;
        binding.Initialize();
      }
      owner.overlayEffects.push(overlay);
      overlay.PlayCurveSet(overlay.curveSet.name);
      return file;
    },
    // Changes the skin as the client does: the new-skin ship is built and
    // placed exactly on the old one, and res:/fisfx/skinchange/skin_change.black
    // (3 s) plays on both. Its old_* bindings dissolve the old ship
    // (clipSphereFactor, activationStrength) while new_* bring in the new one
    // (clipSphereFactor2, activationStrength); then the old ship goes. Each
    // ship gets its own copy of the overlay, so each curve set is updated once
    // a frame. With no DNA, switch the current hull between its selected skin
    // and the SDE-resolved default. Explicit DNA loads may change the hull.
    skin: realScene ? createDemoSkinChange({
      initialDna: DNA,
      serialize: SerializeSkinChange,
      resolveDefault: ResolveDefaultSkinDna,
      replace: nextDna => replaceDemoShip({
        old: ship, nextDna, scene: realScene, pending: pendingShips,
        isDisposed: () => disposed, buildShip: BuildSofShip,
        applyBanners: ApplyDemoBanners, resourceBytes: ResourceBytes,
        commit: next => { ship = next; globalThis.demo.ship = next; }
      })
    }) : async () => null,
    ship,
    scene: realScene
  };
  // Carbon writes the bounding radius into w every update (EveSpaceObject2.cpp:774);
  // the layout default of 1 was never overwritten here.
  if (!realScene) globalThis.demo.shipData({ radius: bounds.radius });
  console.log(`console: demo.dirt(v), demo.age(weeks), demo.speed(v), demo.activation(v), demo.shipData({...}); demo.materials has ${areas.map(area => area.name).join(", ")}; demo.params(area) lists parameters`);

  const depthFormat = "depth24plus";
  const renderTarget = new CjsWebgpuRenderTarget(webgpu, {
    canvas,
    context,
    format,
    depthFormat,
    // The frame is counted back off the surface, so it must be copyable.
    // Without this the demo draws and then cannot prove it.
    extraUsage: GPUTextureUsage.COPY_SRC,
    alphaMode: ALPHA ? "premultiplied" : "opaque"
  }).Configure({ width: canvas.width, height: canvas.height });

  const batchManager = new CjsBatchManager({
    // Carbon's scene makes these four of its lists (EveSpaceScene.cpp:224-228).
    // Without TRANSPARENT and ADDITIVE the driver's transparent pass had no
    // accumulators to draw: no sprite, glow, booster or other additive batch
    // ever reached the screen. The transparent list keeps insertion order
    // (Carbon's TriRenderBatchAccumulator<>), the gather's back-to-front order.
    // DISTORTION is the fifth list (EveSpaceScene.cpp:227): the driver draws it
    // into the distortion map (the cloak's fxcloakdistortionv5).
    batchTypes: [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL, TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE, TriBatchType.TRIBATCHTYPE_DISTORTION ],
    // THE ACCUMULATOR CARRIES THE RENDERING MODE, and nothing was setting it.
    // `TriRenderBatchAccumulator.Commit` stamps its mode onto every batch, and
    // the walk skips `ApplyStandardStates` for RM_ANY - so with the default no
    // rendering mode block was EVER applied. Every mesh drew with the
    // interpreted defaults: cull CCW where RM_OPAQUE asks for CULLMODE_CW, so
    // the back faces survived and every hull showed its interior.
    //
    // Carbon sets it per batch list on the SCENE (`Tr2InteriorScene.cpp:1120`,
    // `batches->SetRenderingMode(...)`) and ccpwgl passes a mode into
    // `GetAreaBatches` (`Tw2Mesh.js:512-522`). A scene stand-in has to do the
    // same, and the batch-type to mode mapping belongs in the driver.
    createAccumulator: batchType =>
    {
      const accumulator = new TriRenderBatchAccumulator();

      // The modes the driver applies to each list (RenderTransparentBatches,
      // EveSpaceScene.cpp:1170-1173).
      const mode = {
        [TriBatchType.TRIBATCHTYPE_DECAL]: RenderingMode.RM_DECAL,
        [TriBatchType.TRIBATCHTYPE_TRANSPARENT]: RenderingMode.RM_ALPHA,
        [TriBatchType.TRIBATCHTYPE_ADDITIVE]: RenderingMode.RM_ALPHA_ADDITIVE,
        // RenderDistortionBatches draws under RM_ALPHA_ADDITIVE (cpp:1248).
        [TriBatchType.TRIBATCHTYPE_DISTORTION]: RenderingMode.RM_ALPHA_ADDITIVE
      }[batchType] ?? RenderingMode.RM_OPAQUE;

      // `Clear` resets the mode back to RM_ANY every frame, so it has to be
      // re-applied every frame - Carbon sets it at collection time for the same
      // reason. Restoring it here keeps that in one place.
      const clear = accumulator.Clear.bind(accumulator);

      accumulator.Clear = (...rest) =>
      {
        const out = clear(...rest);

        accumulator.renderingMode = mode;

        return out;
      };

      accumulator.renderingMode = mode;

      return accumulator;
    }
  });
  // The frame's batch lists, for inspecting what was drawn and with what.
  globalThis.demo.batchManager = batchManager;

  // THE QUAD STEP OF CARBON'S GatherBatches (EveSpaceScene.cpp:1512-1514):
  // after the renderables' batches and before FinalizeBatches, the scene's
  // objects add their sprite and spotlight quads, the quad renderer uploads
  // them, and its batches join the opaque and additive lists. The batch
  // manager's collector is where that step runs here.
  batchManager.RegisterCollector("Tr2QuadRenderer", {
    Collect: (_renderables, batchMap) =>
    {
      if (!realScene) return;

      const context = realScene.updateContext;
      realScene.UpdateQuadRenderer(context.GetFrustum(), realScene.objects, context.renderContext);

      const quads = Tr2QuadRenderer.Instance();
      quads.GetBatches(TriBatchType.TRIBATCHTYPE_OPAQUE, batchMap.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE));
      quads.GetBatches(TriBatchType.TRIBATCHTYPE_ADDITIVE, batchMap.GetAccumulator(TriBatchType.TRIBATCHTYPE_ADDITIVE));
    }
  });

  batchManager.Initialize();

  const al = new CjsWebgpuRenderContextAL({ webgpu, renderTarget });

  al.CreateDevice();

  // Records every constant bind, by stage and register, so an unfilled uniform
  // block can be told from a block bound to the wrong place.
  const binds = [];
  const setConstants = al.SetConstants.bind(al);

  al.SetConstants = (buffer, stage, register, ...rest) =>
  {
    binds.push(`s${stage}b${register}`);

    return setConstants(buffer, stage, register, ...rest);
  };

  // WHICH SLOTS THE BACKEND HAD TO FAKE. Every unfilled texture register gets a
  // zero-filled 1x1 dummy, and "zero" is not the right nothing for every map -
  // a normal map wants a flat normal, a mask wants black, a reflection wants the
  // scene environment. This names the slots so that argument can be had against
  // facts.
  const srvs = [];
  const dummies = [];
  const createResourceSet = al.CreateResourceSet.bind(al);
  const getDummyTexture = al.GetDummyTexture.bind(al);

  al.GetDummyTexture = dimension => { dummies.push(dimension); return getDummyTexture(dimension); };
  al.CreateResourceSet = (description, program, implementationOnly = false) =>
  {
    // Preserve the facade's internal allocation branch, and inspect once per
    // public Create. Dropping the third argument recurses into the facade.
    if (!implementationOnly)
    {
      const map = description.m_registerMap;
      for (let stage = 0; stage < map.srvs.length; stage += 1)
      {
        for (let register = 0; register < map.srvs[stage].length; register += 1)
        {
          const index = map.srvs[stage][register];
          if (index >= map.srvCount) continue;
          const record = description.m_srv[index];
          if (record.type === 0) continue;
          const resource = record.type === 1 ? record.buffer : record.texture;
          srvs.push(`srv${stage}:${register}=${resource?.constructor?.name ?? "invalid"}`);
        }
      }
    }
    return createResourceSet(description, program, implementationOnly);
  };

  // What rendering mode each batch asks for. RM_ANY means the walk skips
  // ApplyStandardStates entirely, so no mode block is ever laid down.
  const renderModes = [];

  // THE MAIN-THREAD CONTEXT, which is the one Carbon's TriDevice renders
  // through. Device resources made outside a frame - the quad-list index
  // buffer, the booster and decal allocations - are made through it, and
  // Tr2Renderer.IsResourceCreationAllowed asks whether it has a device.
  const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

  renderContext.SetRenderContextAL(al);

  if (realScene)
  {
    // Initialize loads the nebula and registers initial objects. The bone
    // provider was already available to materials at scene construction.
    realScene.Initialize(renderContext);
    ship.RebuildCachedData();

    // What TriDevice.CreateDevice does once the device is up
    // (TriDevice.cpp:1038-1059): prepare every registered device resource. The
    // ship was built before there was a device, so its booster sets and the
    // procedural booster box are made here.
    gTriDev.device.PrepareDeviceResources();
  }
  else
  {
    const bones = Tr2RingBuffer.GetInstance("Float4x3", 48, renderContext);
    const boneOffsets = new Tr2RingBufferOffsets();

    bones.SetName("BoneTransformsBuffer");
    Tr2VariableStore.globalStore().RegisterVariable("BoneTransforms", bones);
    boneOffsets.UploadTransforms(bones, RestPoseBones(REST_POSE_BONES), REST_POSE_BONES);
    bones.PrepareBuffer(renderContext);
    perObject.vs.Set("boneOffsets", [ boneOffsets.GetCurrentFrameOffset(), boneOffsets.GetPreviousFrameOffset(), REST_POSE_BONES, 0 ]);

    for (const area of areas) area.material.RebuildCachedData();

    // ?probe=copy: the first step of Carbon's reflection probe, run on the GPU.
    if (PROBE_MODE === "copy" || PROBE_MODE === "mips") await ProbeCopyCube(renderContext, al, areas);
    else if (PROBE_MODE !== "off") await ReflectionProbe(renderContext, al, areas);
  }

  {
    const esm = renderContext.GetEffectStateManager();
    const applyStandardStates = esm.ApplyStandardStates.bind(esm);

    esm.ApplyStandardStates = mode => { renderModes.push(mode); return applyStandardStates(mode); };
  }

  const driver = new EveSpaceSceneRenderDriver().SetBatchManager(batchManager);
  // demo.driver: the render driver, for console checks (its postProcess is
  // the Tr2PostProcessRenderer, e.g. demo.driver.postProcess.useNewBloom).
  globalThis.demo.driver = driver;

  // The driver's m_ssao is set from outside in Carbon too; aoQuality (the
  // settings panel's "ambient occlusion") enables it.
  driver.SSAO = new Tr2SSAO();

  // Carbon defaults m_settings.enableDistortion off; the client turns it on,
  // and the settings panel's "distortion" toggles it.
  driver.enableDistortion = true;

  // demo.post(): which post-process effects loaded, and what each draw verb
  // did since the last call. A "nothing" count with no error is the black
  // canvas's cause.
  // demo.readback(): non-zero texel counts for every pool texture the post
  // chain borrowed, by name. The first one that reads zero is the stage that
  // lost the image.
  globalThis.demo.readback = async () =>
  {
    const device = al.GetWebgpu().GetDevice();
    const report = {};
    for (const [ name, texture ] of POOL_TEXTURES)
    {
      const gpuTexture = texture?.m_texture;
      report[name] = gpuTexture ? await CountNonZeroTexels(device, gpuTexture) : "no GPU texture";
    }
    return report;
  };

  // What dynamic exposure measured: the persistent 8-float buffer the measure
  // pass writes and tonemapping reads (Tr2PostProcessRenderer GetExposureBuffer).
  // Twice, a second apart, so a value that never moves is visible.
  // demo.flare(): whether lens-flare occlusion runs. Over half a second it
  // counts each occluder's RunQuery calls and the batches its sprites commit,
  // lists the sprites (mesh, areas, effect state), then reads the flare's two
  // FlareOcclusionBuffer slots: words 0-4 are visibilities (floats, 1.0 after
  // Clear; word 0 is their product), words 5-12 the per-occluder counter
  // pairs (total, visible*100). Queries with no commits means the sprites
  // never reach a batch; commits with zero counters means the occluder
  // shader draws nothing; counters with word 0 still 1.0 means CopyCounters
  // does not run.
  globalThis.demo.flare = async () =>
  {
    const device = al.GetWebgpu().GetDevice();
    const report = [];
    for (const lensflare of realScene?.lensflares ?? [])
    {
      const watched = [ ...lensflare.occluders, ...lensflare.backgroundOccluders ].map(occluder =>
      {
        const counts = { queries: 0, commits: 0 };
        const commit = occluder._batches.Commit.bind(occluder._batches);
        const query = occluder.RunQuery.bind(occluder);
        occluder._batches.Commit = batch => { counts.commits += 1; return commit(batch); };
        occluder.RunQuery = (...args) => { counts.queries += 1; return query(...args); };
        return { occluder, counts, restore: () => { delete occluder._batches.Commit; delete occluder.RunQuery; } };
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      for (const entry of watched) entry.restore();

      const gpuBuffer = Tr2OcclusionBuffer.getInstance().buffer.GetGpuBuffer(0)?.GetDeviceBuffer?.() ?? null;
      let words = null;
      if (gpuBuffer)
      {
        const staging = device.createBuffer({ size: gpuBuffer.size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(gpuBuffer, 0, staging, 0, gpuBuffer.size);
        device.queue.submit([ encoder.finish() ]);
        await staging.mapAsync(GPUMapMode.READ);
        words = new Uint32Array(staging.getMappedRange().slice(0));
        staging.unmap();
        staging.destroy();
      }
      const slot = offset =>
      {
        if (!words || offset === null) return null;
        const view = words.slice(offset, offset + 13);
        const floats = new Float32Array(view.buffer);
        return { visibility: Array.from(floats.slice(0, 5)), counters: Array.from(view.slice(5, 13)) };
      };

      report.push({
        position: Array.from(lensflare.position),
        display: lensflare.display,
        foreground: { offset: lensflare.occlusionOffset, ...slot(lensflare.occlusionOffset) },
        background: { offset: lensflare.backgroundOcclusionOffset, ...slot(lensflare.backgroundOcclusionOffset) },
        occluders: watched.map(({ occluder, counts }) => ({
          name: occluder.name,
          display: occluder.display,
          ...counts,
          sprites: occluder.sprites.map(sprite =>
          {
            // Visibility as the last query left it: GetRenderables appends
            // the sprite only when UpdateVisibility accepted it.
            const sphere = new Float32Array(4);
            const sphereValid = sprite.GetBoundingSphere(sphere);
            const frustum = driver.GetFrustum();
            const geometry = sprite.mesh?.GetGeometryResource?.() ?? null;
            return {
              name: sprite.name,
              display: sprite.display,
              modifier: sprite.modifier,
              mesh: Boolean(sprite.mesh),
              geometryResPath: sprite.mesh?.geometryResPath ?? null,
              geometry: geometry ? { good: geometry.IsGood?.() ?? null, meshes: geometry.GetMeshCount?.() ?? null } : null,
              opaqueAreas: sprite.mesh?.opaqueAreas?.length ?? 0,
              effect: EffectState(sprite.mesh?.opaqueAreas?.[0]?.effect ?? null),
              visibilityThreshold: sprite.visibilityThreshold,
              sphereValid,
              sphere: Array.from(sphere),
              inFrustum: sphereValid ? frustum.IsSphereVisible(sphere) : null,
              pixelSize: sphereValid ? frustum.GetPixelSizeAccross(sphere) : null,
              renderable: sprite.GetRenderables([]).length > 0,
              worldTranslation: Array.from(sprite.worldTransform.slice(12, 15))
            };
          })
        })),
        bufferReadable: Boolean(gpuBuffer)
      });
    }
    return report;
  };

  // demo.lights(): whether attachment lights reach the frame. The scene's
  // registered light owners and how many lights each holds, the light
  // manager's resolved count after its cull, and the first tile headers (a
  // non-zero head means the tile has a light list).
  // demo.banners(): each banner set on the ship, and each gate its GetBatches
  // checks - display, visibility, effect, vertex buffer, and a primary texture
  // with a resource - plus how many additive batches it commits right now.
  globalThis.demo.banners = ({ rebuild = false } = {}) => (ship?.attachments ?? [])
    .filter(attachment => attachment?.constructor?.name === "EveBannerSet")
    .map(set =>
    {
      const creationAllowed = Tr2Renderer.IsResourceCreationAllowed();
      if (rebuild) { set.Rebuild(); set.PrepareResources(); }
      const texture = set.primaryTextureParameter;
      const resource = texture?.GetResource?.() ?? null;
      let batches = 0;
      set.GetBatches({ Commit: () => { batches++; } }, TriBatchType.TRIBATCHTYPE_ADDITIVE, null);
      return {
        key: set.key,
        display: set.display,
        visible: set.GetVisibility(),
        banners: set.banners.length,
        effect: set.effect?.effectFilePath ?? null,
        creationAllowed,
        vertexBuffer: Boolean(set._vertexBuffer),
        declaration: set._vertexDeclaration ?? null,
        texturePath: texture?.resourcePath ?? null,
        textureResource: Boolean(resource),
        textureGood: resource?.IsGood?.() ?? null,
        batches
      };
    });

  // demo.trails(): what gates each booster renderable's trail (Carbon
  // EveBoosterSet2.cpp:221-232 and 326, 364-386) - the setting, the booster
  // set's trail and physics flags, the parent speed, the accumulated length
  // against the length settings, the intensity, and the LOD visibility.
  globalThis.demo.trails = () =>
  {
    const boosters = ship?.boosters ?? null;
    const settings = Tr2Renderer.getSettings();
    return {
      enabled: settings.GetValue("eveSpaceObjectTrailsEnabled"),
      minLength: settings.GetValue("eveSpaceObjectTrailsMinLength"),
      maxLength: settings.GetValue("eveSpaceObjectTrailsMaxLength"),
      hasTrails: Boolean(boosters?.trails),
      physicsUpdate: boosters?.physicsUpdate ?? null,
      maxVel: boosters?.maxVel ?? null,
      instances: (boosters?.instances ?? []).map(renderable => ({
        parentSpeed: renderable.parentSpeed,
        trailsTotalLength: renderable.trailsTotalLength,
        trailIntensity: renderable.trailIntensity,
        trailsVisible: renderable.trailsVisible
      }))
    };
  };

  globalThis.demo.lights = () =>
  {
    const manager = Tr2LightManager.getInstance();
    const owners = realScene?.componentRegistry?.GetComponents(EveComponentType.LightOwner) ?? [];
    return {
      eveSpaceSceneDynamicLighting: Tr2Renderer.getSettings().GetValue("eveSpaceSceneDynamicLighting"),
      manager: Boolean(manager),
      resolvedLights: manager ? manager.GetLightCount() : null,
      lightBufferValid: manager ? manager._lightBuffer.IsValid() : null,
      indexBufferValid: manager ? manager._indexBuffer.IsValid() : null,
      firstTileHeads: manager ? Array.from(manager._indexList.subarray(0, 6)) : null,
      owners: owners.map(owner => ({ type: owner?.constructor?.name, lights: owner?.lights?.length ?? null }))
    };
  };

  globalThis.demo.exposure = async () =>
  {
    const device = al.GetWebgpu().GetDevice();
    const sample = async () =>
    {
      const quality = driver.postProcess.GetPostProcessingQuality();
      const effect = driver.scene.GetPostProcess()?.GetDynamicExposureIfAvailable(quality) ?? null;
      // Snapshot the effective settings before submitting this readback. The
      // scene, quality or effect can change while its GPU copy is awaited.
      const settings = effect ? Object.fromEntries([
        "display", "debug", "adjustment", "influence", "minBrightness",
        "maxBrightness", "minLuminance", "maxLuminance", "minExposure",
        "maxExposure", "middleValue", "decreaseSpeed", "increaseSpeed"
      ].map(name => [name, effect[name]])) : null;
      const values = await ReadPoolBuffer(device, "Exposure Buffer");
      return { values, quality, settings };
    };
    const first = await sample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const second = await sample();
    return { first, second };
  };

  // demo.taa(): whether TAA runs and converges. Two samples 500 ms apart of
  // the frame counter (RenderTaa increments it per frame; Execute resets it to
  // 0 whenever TAA is off), the shader state and refusals, the jitter, and the
  // velocity map and both accumulators. A counter stuck at 0 means RenderTaa
  // never ran; an effect that is not good means it drew nothing; accumulators
  // that are both empty or identical between samples mean the history is not
  // being written; a velocity map of zeros under a moving camera means the
  // shaders do not write it.
  globalThis.demo.taa = async () =>
  {
    const device = al.GetWebgpu().GetDevice();
    const renderer = driver.postProcess;
    const sample = async () =>
    {
      const textures = {};
      // "Pre-upscaling Composite" is TAA's dest: TaaCopy writes the resolved
      // frame into it. Its centre texel moving between samples of a still
      // scene means the jittered frame is getting through.
      for (const name of [ "Pre-upscaling Composite", "velocityMap", "opaqueBackBuffer", "TAA Accumulation 0", "TAA Accumulation 1", "TAA Cooldown" ])
      {
        const texture = POOL_TEXTURES.get(name)?.m_texture;
        textures[name] = texture ? await CountNonZeroTexels(device, texture) : "not borrowed yet";
      }
      // The scene's clip-space offset itself. A perspective projection shows
      // it in column 2, not in the translation column, so reading [12]/[13]
      // of the jittered projection reported [0, 0] while the ship shook.
      const jitter = driver.scene.jitter;
      return {
        frameCounter: renderer._taaFrameCounter,
        blendWeight: renderer.taaEffect.FindParameterByName("BlendWeight")?.value ?? null,
        jitter: jitter ? [ jitter[0], jitter[1] ] : null,
        textures
      };
    };
    const first = await sample();
    await new Promise(resolve => setTimeout(resolve, 500));
    const second = await sample();
    const counts = { ...DRAW_COUNTS };
    for (const key of Object.keys(DRAW_COUNTS)) delete DRAW_COUNTS[key];
    return {
      antiAliasingQuality: driver.antiAliasingQuality,
      taaInPostProcess: Boolean(driver.scene.GetPostProcess()?.GetTaaIfAvailable(renderer.GetPostProcessingQuality())),
      taa: EffectState(renderer.taaEffect),
      taaCopy: EffectState(renderer._taaCopyEffect),
      options: { QUALITY: renderer.taaEffect.GetOption("QUALITY"), DEBUG: renderer.taaEffect.GetOption("DEBUG") },
      exposureBindings: EXPOSURE_BINDINGS,
      lastPipelineFailure: al.m_pipelineFailure ?? null,
      counts,
      first,
      second
    };
  };

  // demo.lut(): what tonemapping's four LUT slots actually hold. The LUT's
  // own texels, upload and sampler check out on the CPU; this answers the one
  // thing that cannot be read there: whether the loaded 3D texture is bound,
  // or a stand-in (which samples black and darkens the frame to 0.3x at the
  // 0.7 influence the shader lerps with).
  // demo.ssao(): what ambient occlusion needs from this device, whether
  // CORTAO's effects and lookup table loaded, and what each stage's texture
  // holds, in pipeline order: the depth pass's normal map, the packed depth
  // (mip 0), the main pass's output and the blur's intermediate. The first
  // that reads empty is the stage that did nothing. The lookup table is
  // R16_UNORM data in an r16float texture (CjsWebgpuUtils).
  // demo.shadows(): whether the cascaded shadow pass can run on this device,
  // and what it produced: the screen-space factor, where 1 is lit and 0 is
  // shadowed. A factor that is all 1 with casters in view means nothing drew
  // into the atlas.
  globalThis.demo.shadows = async () =>
  {
    const device = al.GetWebgpu().GetDevice();
    const factor = POOL_TEXTURES.get("shadowMapResult")?.m_texture;
    const atlas = POOL_TEXTURES.get("cascadedShadowDepth") ?? null;
    const shadowDraws = { ...SHADOW_DRAWS };
    SHADOW_DRAWS.calls = 0;
    SHADOW_DRAWS.batches = 0;
    return {
      shadowQuality: driver.shadowQuality,
      cascadedShadowMap: Boolean(driver.scene.cascadedShadowMap),
      maxTextureDimension2D: device.limits.maxTextureDimension2D,
      depthClipControl: device.features.has("depth-clip-control"),
      casters: driver.scene.componentRegistry?.ComponentCount("ShadowCaster") ?? 0,
      // Since the last report: RenderBatches calls with "Shadow", and batches walked.
      shadowDraws,
      atlas: atlas ? await ReadAtlasCoverage(device, atlas) : "never borrowed",
      factor: factor ? await CountNonZeroTexels(device, factor) : "never borrowed",
      lastPipelineFailure: al.m_pipelineFailure ?? null
    };
  };

  globalThis.demo.ssao = async () =>
  {
    const device = al.GetWebgpu().GetDevice();
    const ssao = driver.SSAO;
    const table = ssao._cortaoLookupTable;
    const textures = {};
    for (const name of [ "normalMap", "cortao_packed", "cortao_output", "cortao_blur" ])
    {
      const gpuTexture = POOL_TEXTURES.get(name)?.m_texture;
      textures[name] = gpuTexture ? await CountNonZeroTexels(device, gpuTexture) : "never borrowed";
    }
    return {
      textures,
      aoQuality: driver.aoQuality,
      enabled: ssao.enabled,
      quality: ssao.quality,
      maxStorageTexturesPerShaderStage: device.limits.maxStorageTexturesPerShaderStage,
      cortao: EffectState(ssao._cortaoEffect),
      blur: EffectState(ssao._cortaoBlurEffect),
      lookupTable: table ? { state: table.state, good: table.IsGood(), texture: Boolean(table.GetTexture()) } : null,
      lastPipelineFailure: al.m_pipelineFailure ?? null
    };
  };

  globalThis.demo.lut = () =>
  {
    const effect = driver.postProcess.tonemappingEffect;
    return {
      option: effect.GetOption("LUT_TOGGLE"),
      slots: [ 0, 1, 2, 3 ].map(index =>
      {
        const parameter = effect.GetResourceByName(`TexLUT_${index}`);
        const influence = effect.FindParameterByName(`LUTInfluence_${index}`)?.value ?? null;
        const resource = parameter?.GetResource?.() ?? null;
        const texture = resource?.GetTexture?.() ?? null;
        return {
          path: parameter?.resourcePath ?? null,
          influence,
          prepared: resource?.IsPrepared?.() ?? null,
          good: resource?.IsGood?.() ?? null,
          texture: texture ? { width: texture.GetWidth(), height: texture.GetHeight(), depth: texture.GetDepth?.(), deviceFormat: texture.GetDeviceFormat?.() ?? null } : null
        };
      })
    };
  };

  globalThis.demo.post = () =>
  {
    const counts = { ...DRAW_COUNTS };
    for (const key of Object.keys(DRAW_COUNTS)) delete DRAW_COUNTS[key];
    return {
      postOff: postState.off,
      template: postTemplate ? { path: postTemplate.path, populated: postTemplate.populated, skipped: postTemplate.skipped } : null,
      location: locationPost.record ? { path: locationPost.record.path, populated: locationPost.record.populated, intensity: locationPost.attributes.intensity } : null,
      stage: STAGE || "all",
      counts,
      tonemapping: EffectState(driver.postProcess.tonemappingEffect),
      cas: EffectState(driver.postProcess._fidelityFxCasShader),
      material: EffectState(areas[0].material)
    };
  };

  // demo.getReport(): the settings this page is running with, then every
  // report above, in one object to paste. Each report is caught on its own, so
  // one that throws leaves the rest. Takes a few seconds: exposure, taa and
  // flare each sample twice.
  globalThis.demo.getReport = async () =>
  {
    const device = al.GetWebgpu().GetDevice();
    const info = device.adapterInfo ?? null;
    const settings = {
      url: globalThis.location?.search ?? "",
      tier: TIER,
      dna: DNA,
      stage: STAGE || "all",
      flare: flare.current,
      shadowsOffered: true,
      postOff: postState.off,
      postTemplate: postTemplate?.path ?? null,
      clientDefaults: clientState.enabled,
      postProcessingQuality: driver.postProcess.GetPostProcessingQuality(),
      antiAliasingQuality: driver.antiAliasingQuality,
      aoQuality: driver.aoQuality,
      shadowQuality: driver.shadowQuality,
      adapter: info ? { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description } : null,
      features: [ ...device.features ].sort()
    };
    const reports = {};

    // taa before post: both hand back the draw counts and reset them.
    for (const name of [ "taa", "exposure", "post", "shadows", "ssao", "lut", "lights", "flare", "readback" ])
    {
      try
      {
        reports[name] = await globalThis.demo[name]();
      }
      catch (error)
      {
        reports[name] = { error: String(error?.stack ?? error) };
      }
    }

    return { settings, reports };
  };

  let postTemplate = null;

  // THE LOCATION VOLUME: an EveChildPostProcessVolume holding the location
  // template's attributes (FromPostProcess at MEDIUM priority, as a site's
  // volume is authored) and one ellipsoid centred on the ship. It hangs from a
  // scene-level EveEffectRoot2, which updates it every frame, so it survives
  // skin changes that replace the ship. Only a real scene merges owners.
  const locationPost = {
    record: null,
    attributes: new Tr2PostProcessAttributes(),
    ellipsoid: new EveEllipsoidVolume(),
    volume: new EveChildPostProcessVolume(),
    root: new EveEffectRoot2(),
    radii: { ...LOCATION_RADII },
    priority: Tr2PostProcessAttributes.MEDIUM_PRIORITY,
    mode: "volume"
  };
  locationPost.root.name = "demo location";
  locationPost.root.effectChildren.push(locationPost.volume);
  locationPost.volume.name = "demo location";
  locationPost.volume.volumes.push(locationPost.ellipsoid);
  locationPost.volume.postProcessAttributes = locationPost.attributes;
  const SetLocationRadii = () =>
  {
    locationPost.ellipsoid.innerShape.fill(Math.min(locationPost.radii.inner, locationPost.radii.outer));
    locationPost.ellipsoid.shape.fill(locationPost.radii.outer);
  };
  SetLocationRadii();
  const FillLocationAttributes = () => locationPost.attributes.FromPostProcess(
    !postState.off && locationPost.record ? locationPost.record.postProcess : null,
    locationPost.priority,
    1
  );

  // THE VOLUME IS IN THE SCENE ONLY WHILE A LOCATION IS CHOSEN, as a site's
  // volume exists only at the site. Added and removed through the notified
  // list, it joins and leaves the component registry - as a PostProcessOwner
  // the merge reads - through EveSpaceScene.OnListModified (cpp:3414-3491).
  const AttachLocation = attach =>
  {
    if (!realScene) return;
    const present = realScene.objects.includes(locationPost.root);
    if (attach && !present) CjsModel.addChild(realScene, "objects", locationPost.root);
    else if (!attach && present) CjsModel.removeChild(realScene, "objects", locationPost.root);
  };

  /**
   * The sources Carbon merges, highest priority first (EveSpaceScene.cpp:355-381):
   * every registered PostProcessOwner, then the scene default at
   * SCENE_DEFAULT_PRIORITY with weight 1.
   *
   * @returns {{name: string, priority: number, intensity: number}[]} The merge order.
   */
  const MergeOrder = () =>
  {
    if (!realScene) return [];
    const sources = realScene.componentRegistry.GetComponents("PostProcessOwner").map(owner => ({
      name: owner.name || "owner",
      priority: owner.GetPostProcessAttributes().priority,
      intensity: owner.GetPostProcessAttributes().intensity
    }));
    if (realScene.postprocess)
    {
      const replaced = locationPost.mode === "replace" && locationPost.record;
      const source = replaced ? locationPost.record : postTemplate;
      const name = source ? source.path.split("/").pop().replace(/\.black$/u, "") : "empty";
      sources.push({ name: `scene default (${replaced ? "location" : "sun"}: ${name})`, priority: Tr2PostProcessAttributes.SCENE_DEFAULT_PRIORITY, intensity: 1 });
    }
    return sources.sort((a, b) => b.priority - a.priority);
  };

  // POST OFF IS AN EMPTY POST PROCESS, as in Carbon: the driver always renders
  // into its own colour and depth and always post-processes into the
  // destination (EveSpaceSceneRenderDriver.cpp:600-608); with no effects that
  // is copy, sharpen and tonemap. The scene depth is therefore always
  // published as DepthMap, which the high-tier light, sprite and flare shaders
  // sample to hide behind the hull.
  const postState = { off: POST_OFF, autoExposureWhenPostDisabled: true, apply: () => {} };
  postState.apply = () =>
  {
    // "replaces scene default" puts the location template where the sun's
    // would go; "volume" keeps the sun's and blends the location over it.
    const sceneDefault = locationPost.mode === "replace" && locationPost.record ? locationPost.record : postTemplate;
    if (realScene) realScene.postprocess = !postState.off && sceneDefault ? sceneDefault.postProcess : new Tr2PostProcess2();
    FillLocationAttributes();
    AttachLocation(locationPost.mode === "volume" && locationPost.record !== null);
  };

  // One command boundary for console, settings and viewport input. The
  // operations retain their existing loaders and skin serialization.
  const commandNames = [ "maxSpeed", "speed", "kills", "dirt", "age", "activation", "damage", "effect", "setShipState", "cloak", "skin" ];
  const operations = Object.fromEntries(commandNames.map(name => [name, globalThis.demo[name]]));
  if (liveInput) operations.capture = () => capture.request();
  operations.post = enabled => { postState.off = !enabled; postState.apply(); ApplyClientDefaults(); };
  operations.autoExposureWhenPostDisabled = enabled => { postState.autoExposureWhenPostDisabled = enabled; ApplyClientDefaults(); };
  const actions = createDemoActions({
    getShip: () => ship,
    getShipStates: current => realScene && current ? ShipStates(current) : [],
    operations,
    readState: () => ({
      post: !postState.off,
      autoExposureWhenPostDisabled: postState.autoExposureWhenPostDisabled,
      speed: ship?.translationCurve?.velocity?.[2] ?? 0,
      maxSpeed: demoSpeed.maxSpeed,
      kills: ship?.displayKillCounterValue ?? 0,
      cloaked: !!ship?.overlayEffects.some(overlay => overlay.name?.startsWith("fisfx_cloaking_"))
    }),
    onShipChanged: (next, previous) =>
    {
      if (!next) return;
      controls.cancel();
      const hullChanged = next.mesh.geometryResPath !== previous?.mesh.geometryResPath;
      next.UpdateWorldBounds();
      const sphere = new Float32Array(4);
      next.GetBoundingSphere(sphere, 0);
      bounds.centre.set(sphere.subarray(0, 3));
      bounds.radius = sphere[3] || 1;
      controls.targetChanged(hullChanged);
      areas.length = 0;
      for (const area of next.mesh.opaqueAreas)
        areas.push({ material: area.effect, path: area.effect?.effectFilePath ?? "", name: area.name, index: area.index, count: area.count });
      globalThis.demo.ship = next;
      globalThis.demo.renderable = next;
      globalThis.demo.materials = Object.fromEntries(areas.map(area => [area.name, area.material]));
    }
  });
  for (const name of commandNames) globalThis.demo[name] = (...args) => actions.invoke(name, ...args);
  globalThis.demo.actions = actions;
  globalThis.demo.post = enabled => actions.invoke("post", enabled);
  globalThis.demo.capture = () => actions.invoke("capture");

  // Whether the demo plays the client's part (the settings panel's "client
  // defaults", ?clientDefaults=0 to start without).
  const clientState = { enabled: new URLSearchParams(globalThis.location?.search ?? "").get("clientDefaults") !== "0" };
  const authoredSlots = new WeakMap();

  /**
   * Swaps the scene's post process for a template, or none for "". Also the
   * settings panel's template picker; the next frame reads the new one.
   *
   * @param {string} name A template name, a resource path, or "".
   * @returns {Promise<object|null>} The loaded template record.
   */
  /**
   * The EVE client's additions to the scene's default post process, the only
   * place Carbon reads tonemapping and dynamic exposure from
   * (EveSpaceScene.cpp:391-398). Only 1 of the 168 shipped environment
   * templates carries tonemapping and many carry no dynamic exposure, yet the
   * game shows both, so the client supplies them. The client's own values are
   * not available: an absent slot gets a Carbon-default effect, and a slot
   * the template authors is never touched. EVE's composite has its curve
   * built in (no TONE_MAPPING_METHOD axis), so the injected tonemapping
   * effect contributes its curve parameters only. The exposure is the part
   * that dims the frame. Switching client defaults off restores what the
   * template authored. The separate exposure checkbox lets the operator choose
   * its behavior while post is disabled; the client policy is unknown, so the
   * checkbox preserves this demo's previous behavior by default.
   */
  function ApplyClientDefaults()
  {
    const postProcess = realScene?.postprocess;
    if (!postProcess) return;
    if (!authoredSlots.has(postProcess))
    {
      authoredSlots.set(postProcess, { tonemapping: postProcess.tonemapping ?? null, dynamicExposure: postProcess.dynamicExposure ?? null });
    }
    const authored = authoredSlots.get(postProcess);

    postProcess.SetTonemapping(authored.tonemapping ?? (clientState.enabled ? new Tr2PPTonemappingEffect() : null));
    postProcess.SetDynamicExposure(postState.off && !postState.autoExposureWhenPostDisabled
      ? null
      : authored.dynamicExposure ?? (clientState.enabled ? new Tr2PPDynamicExposureEffect() : null));
  }

  async function SelectPostTemplate(name)
  {
    postTemplate = name ? await LoadPostTemplate(name) : null;
    globalThis.demo.postProcess = postTemplate?.postProcess ?? null;

    // A REAL SCENE'S TEMPLATE IS ITS DEFAULT POST PROCESS (m_sceneDefaultPostProcess),
    // which Update merges into the combined one the driver reads; the driver's
    // PropagateSettings keeps TAA on it.
    postState.apply();
    ApplyClientDefaults();

    if (postTemplate)
    {
      console.log(`post template ${postTemplate.path}: populates ${postTemplate.populated.join(", ") || "(nothing)"}`
        + (postTemplate.skipped.length ? `; skipped, pass not ported: ${postTemplate.skipped.join(", ")}` : ""));
    }
    return postTemplate;
  }

  /**
   * Loads a location template into the volume's attributes, or none for "".
   *
   * @param {string} name A template name, a resource path, or "".
   * @returns {Promise<object|null>} The loaded template record.
   */
  async function SelectLocationTemplate(name)
  {
    locationPost.record = name ? await LoadPostTemplate(name) : null;
    postState.apply();
    ApplyClientDefaults();
    if (name && !realScene) console.warn(`location ${name}: only a real scene merges post-process volumes`);
    if (locationPost.record) console.log(`location template ${locationPost.record.path}: populates ${locationPost.record.populated.join(", ") || "(nothing)"}`);
    return locationPost.record;
  }

  // The loaded Tr2PostProcess2, for editing live: demo.postProcess.colorCorrection.
  globalThis.demo.postProcess = null;
  if (POST_SUN) await SelectPostTemplate(POST_SUN);
  if (POST_LOCATION) await SelectLocationTemplate(POST_LOCATION);

  postState.apply();


  // THE FOUR THINGS THE DRIVER ASKS A SCENE FOR. The update hooks are no-ops on
  // purpose: this demo proves the draw path, and a fog or lighting blend it does
  // not use would be scenery pretending to be a test.
  // THE PER-FRAME BLOCKS GO THROUGH A REAL SCENE'S APPLY. EveSpaceScene binds
  // its vertex block for compute as well as vertex (ApplyPerFrameData), and
  // stamps Time from the animation clock when it populates (cpp:3066, 3118).
  // The demo's blocks are copied into a real scene's records and applied
  // there, so the binding is the scene's own code rather than a copy of it.
  const perFrameScene = realScene ?? new EveSpaceScene();
  const clockStart = globalThis.performance?.now() ?? 0;

  // TAA LIVES ON THE SCENE'S DEFAULT POST PROCESS: the driver's
  // PropagateSettings puts it there from antiAliasingQuality, and the real
  // scene copies it into the combined post process each frame
  // (EveSpaceScene.cpp, SetTaa( postprocess->GetTaaIfAvailable() )). A
  // template's own TAA slot is not what Carbon reads, so it stays emptied.
  // Only the stand-in scene is given an empty one here: a real scene already
  // holds the selected template (postState.apply), and replacing it silently
  // dropped `?post=<template>` at start-up.
  if (!realScene) perFrameScene.postprocess = new Tr2PostProcess2();
  const taaOnlyPostProcess = new Tr2PostProcess2();

  // THE SUN'S LENS FLARE. Carbon draws no god rays without one: the rays read
  // FlareOcclusionBuffer at the flare's background slot (LensflareFxOccScale.y),
  // which the flare allocates and the occlusion buffer Clears to 1.0. EVE
  // carries the system sun as an EveLensflare in scene.lensflares.
  // `?flare=<name>` picks one of res:/fisfx/lensflare/*.black; `?flare=off` none.
  // A swapped-out flare returns its occlusion-buffer slots (EveLensflare.Destroy,
  // Carbon's destructor releasing its Offset handles).
  const flare = {
    current: FLARE,
    async select(name)
    {
      flare.current = name;
      for (const old of perFrameScene.lensflares) old.Destroy();
      perFrameScene.lensflares.length = 0;
      if (name === "off") return;
      try
      {
        // Carbon's path: the flare is an object file, so LoadObject - a new
        // object from the manager's cached builder (BlueResMan::LoadObject).
        const lensflare = await blue.resMan.LoadObject(`res:/fisfx/lensflare/${name}.black`);
        if (flare.current !== name) return;
        perFrameScene.lensflares.push(lensflare);
        console.log(`lens flare res:/fisfx/lensflare/${name}.black: ${lensflare.constructor.name}, ${lensflare.occluders.length} occluder(s)`);
      }
      catch (error)
      {
        console.error(`lens flare ${name}: ${error.message}`);
      }
    }
  };
  await flare.select(FLARE);

  const mainWindow = new Tr2MainWindow({ window: globalThis.window, document: globalThis.document, target: canvas });
  canvas.tabIndex = 0;
  const input = createDemoInput({ mainWindow, canvas, document: globalThis.document, controls, actions,
    isEnabled: () => liveInput,
    showHelp: () => { const panel=document.getElementById("camera-controls");if(panel){document.getElementById("settings").open=true;panel.open=true;panel.scrollIntoView();} },
    onError: error => console.warn(`demo input: ${error.message}`)
  });
  if (liveInput) input.enableCapture();
  globalThis.demo.input = input;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (framePump) framePump.dispose();
    capture.dispose(); disposeCameraPanel(); disposeSettings(); postPanel.dispose(); input.dispose(); controls.dispose(); actions.dispose();
    if (realScene)
    {
      const retired = new Set([ship, ...pendingShips]);
      for (const root of retired) CjsModel.removeChild(realScene, "objects", root);
      retireDemoShips(retired, []);
    }
    // This demo loaded its own system.black instance. Rendering has stopped;
    // the scene/update context is its final owner. Ordinary hull swaps keep it.
    const particles = realScene?.GetGpuParticleSystem();
    realScene?.SetGpuParticleSystem(null);
    particles?.Destroy();
    driver.Destroy();
    globalThis.removeEventListener("pagehide", dispose);
  };
  globalThis.addEventListener("pagehide", dispose);
  globalThis.demo.dispose = dispose;
  if (!liveInput) {
    const note = document.createElement("div");
    note.textContent = "Still frame: live camera and keyboard controls are disabled.";
    note.style.cssText = "position:fixed;left:12px;bottom:12px;background:#111;padding:8px";
    document.body.append(note);
  }

  const disposeSettings = BuildSettingsPanel({
    actions,
    driver,
    postState,
    initialTemplate: POST_SUN,
    select: SelectPostTemplate,
    // The effect switches act on the template that is the scene default now:
    // the location's in "replaces scene default" mode, else the sun's.
    current: () => (locationPost.mode === "replace" && locationPost.record ? locationPost.record : postTemplate),
    locationPost: {
      initial: POST_LOCATION,
      select: SelectLocationTemplate,
      radii: locationPost.radii,
      setRadii: SetLocationRadii,
      intensity: () => (realScene && locationPost.record ? locationPost.attributes.intensity : null),
      priority: () => locationPost.priority,
      setPriority: value => { locationPost.priority = value; FillLocationAttributes(); },
      mode: () => locationPost.mode,
      setMode: value => { locationPost.mode = value; postState.apply(); ApplyClientDefaults(); },
      mergeOrder: MergeOrder
    },
    sun: SUN,
    flare,
    age: weeks => globalThis.demo.age(weeks),
    speed: value => globalThis.demo.speed(value),
    maxSpeed: value => globalThis.demo.maxSpeed(value),
    kills: value => globalThis.demo.kills(value),
    damage: (shield, armor, hull) => globalThis.demo.damage(shield, armor, hull),
    effect: (name, on) => globalThis.demo.effect(name, on),
    cloak: on => globalThis.demo.cloak(on),
    shipStates: globalThis.demo.shipStates,
    setShipState: (kind, on) => globalThis.demo.setShipState(kind, on),
    skin: () => globalThis.demo.skin(),
    clientDefaults: {
      enabled: () => clientState.enabled,
      set: enabled => { clientState.enabled = enabled; ApplyClientDefaults(); }
    },
    // The light travels from behind the hull toward the camera: the scene
    // direction is (eye - centre), so the sun sits beyond the hull on screen.
    // Geometric, so no axis or handedness convention is assumed.
    aimSun: () =>
    {
      const world = mat4.invert(mat4.create(), camera.GetViewMatrix().transform);
      const direction = vec3.subtract(vec3.create(), vec3.fromValues(world[12], world[13], world[14]), bounds.centre);
      if (vec3.length(direction) > 0) SUN.direction.set(vec3.normalize(direction, direction));
    }
  });

  const disposeCameraPanel = BuildCameraPanel({ controls, input, actions, liveInput });

  // The ship panel loads through the skin swap, so the new ship dissolves in.
  if (realScene)
  {
    BuildShipPanel({ initialDna: DNA, apply: (dna, typeID) => globalThis.demo.skin(dna, typeID) })
      .catch(error => console.warn(`ship panel: ${error.message}`));
  }

  const sunScratch = vec3.create();
  const lastFrameScratch = mat4.create();

  const standIn = {
    ApplyPerFrameData: renderContext =>
    {
      const time = ((globalThis.performance?.now() ?? 0) - clockStart) / 1000;
      frame.vs.Set("Time", time);
      frame.ps.Set("Time", time);
      frame.vs.Set("Sun.DirWorld", SunDirWorld());
      frame.ps.Set("Sun.DirWorld", SunDirWorld());
      perFrameScene.GetPerFrameVSData().CopyFrom(frame.vs);
      perFrameScene.GetPerFramePSData().CopyFrom(frame.ps);

      // WHAT EveSpaceScene.PopulatePerFrameVSData WRITES FOR TAA, which this
      // stand-in otherwise skips: the JITTERED reversed-depth projection the
      // driver set (Jitter, cpp:1329-1331; reversal cpp:3022), and last
      // frame's view and projection with this frame's jitter (cpp:3029-3032).
      // Carbon's row-vector products swap operands in gl-matrix.
      const vs = perFrameScene.GetPerFrameVSData();
      const projection = renderContext.GetReversedDepthProjectionTransform();
      const view = renderContext.GetViewTransform();

      vs.SetAndTranspose("ProjectionMat", projection);
      vs.SetAndTranspose("ViewProjectionMat", mat4.multiply(lastFrameScratch, projection, view));
      mat4.multiply(lastFrameScratch, perFrameScene.jitterMatrix, perFrameScene.projectionLast);
      vs.SetAndTranspose("ProjLast", lastFrameScratch);
      vs.SetAndTranspose("ViewLast", perFrameScene.viewLast);
      vs.SetAndTranspose("ViewProjectionLast", mat4.multiply(lastFrameScratch, lastFrameScratch, perFrameScene.viewLast));
      perFrameScene.GetPerFramePSData().Set("Jittering", perFrameScene.jitter[0] !== 0 || perFrameScene.jitter[1] !== 0 ? 1 : 0);

      perFrameScene.ApplyPerFrameData(renderContext);
    },
    Jitter: renderContext => perFrameScene.Jitter(renderContext),
    EndRender: renderContext => perFrameScene.EndRender(renderContext),
    get jitteredProjection() { return perFrameScene.jitteredProjection; },
    get jitter() { return perFrameScene.jitter; },
    viewLast: perFrameScene.viewLast,
    projectionLast: perFrameScene.projectionLast,
    postprocess: perFrameScene.postprocess,
    // The lens flares are the one part of the real scene's update the demo runs:
    // Update writes LensflareFxOccScale from the flare's slots (cpp:168-171).
    Update: (realTime, simTime) =>
    {
      // The one sun: the scene's direction, and each flare kept at its authored
      // distance but moved along the way to the sun. EveLensflare's direction
      // is Normalize(-position), so the flare sits at -direction.
      vec3.copy(perFrameScene.sunDirection, SUN.direction);
      vec3.normalize(sunScratch, SUN.direction);
      for (const lensflare of perFrameScene.lensflares)
      {
        vec3.scale(lensflare.position, sunScratch, -(vec3.length(lensflare.position) || 1.4959787e11));
        lensflare.Update(realTime, simTime);
      }
    },
    RunLensflareOcclusionQueries: (depthMap, renderContext) => perFrameScene.RunLensflareOcclusionQueries(depthMap, renderContext),
    BlendLightingOverrides: () => {},
    UpdateFogSettings: () => {},
    GetPerFrameVSData: () => frame.vs,
    GetPerFramePSData: () => frame.ps,
    GetRenderables: out => { out.push(renderable); return out; },
    // With no `?post=<template>` the chain copies, sharpens and tonemaps only,
    // plus TAA when anti-aliasing is on.
    GetPostProcess: () =>
    {
      const taa = perFrameScene.postprocess.GetTaaIfAvailable();
      const combined = (!postState.off && postTemplate ? postTemplate.postProcess : null) ?? (taa ? taaOnlyPostProcess : null);

      if (combined) combined.SetTaa(taa);
      return combined;
    }
  };

  driver.scene = realScene ?? standIn;
  const postPanel = createPostProcessPanel({
    document, driver, postState,
    getDefaultPostProcess: () => realScene ? realScene.postprocess : driver.scene.GetPostProcess()
  });

  /**
   * THE SUN, FOR A REAL SCENE: its sunDirection, and each lens flare kept at
   * its authored distance but moved along the way to the sun (EveLensflare's
   * direction is Normalize(-position), so the flare sits at -direction). The
   * stand-in does the same inside its Update shim.
   */
  const PlaceSun = () =>
  {
    if (!realScene) return;
    vec3.copy(realScene.sunDirection, SUN.direction);
    vec3.normalize(sunScratch, SUN.direction);
    for (const lensflare of realScene.lensflares)
    {
      vec3.scale(lensflare.position, sunScratch, -(vec3.length(lensflare.position) || 1.4959787e11));
    }
  };

  // THE ANIMATION CLOCK, Carbon's way: blue.os ticks the device, which advances
  // the animation time and frame counter the scene's per-frame fills read
  // (Tr2Renderer.GetAnimationTime / GetCurrentFrameCounter). The demo pumps
  // blue.os once per animation frame, as Carbon's main loop pumps the OS.
  const clock = () => performance.now() / 1000;
  framePump = createDemoFramePump(gTriDev.device, () => {
    al.SetRenderTarget(0, renderTarget);
    al.SetDepthStencil(null); // Canvas owns its depth attachment.
    PlaceSun();
    driver.Execute([ renderTarget ], null, clock(), clock(), null, renderContext);
  });

  // A non-black clear, so a hull drawn in black is still a lit pixel. Keeping
  // the clear black made "drew nothing" and "drew black" the same reading.
  driver.clearColor = ALPHA ? [ 0, 0, 0, 0 ] : [ 0.07, 0.09, 0.14, 1 ];
  if (ALPHA)
  {
    const style = canvas.ownerDocument?.body?.style;
    if (style) style.background = "repeating-conic-gradient(#808080 0 25%, #c0c0c0 0 50%) 0 0 / 32px 32px";
  }
  // The camera's own holders, as Carbon's SetCameraToRenderer reads them
  // (TriView / TriProjection, cpp:384-391); the demo updates the camera itself.
  driver.view = camera.GetViewMatrix();
  driver.projection = camera.GetProjection();

  /**
   * Runs one frame and counts what reached the canvas.
   *
   * @returns {Promise<{litPixels: number, validation: string|null}>} The result.
   */
  async function Frame()
  {
    device.pushErrorScope("validation");
    try { framePump.render(); }
    catch (error) { await device.popErrorScope(); throw error; }

    // THE READBACK IS SUBMITTED BEFORE ANYTHING AWAITS. A real await ends the
    // task, the canvas presents, and the swap-chain texture is destroyed, so a
    // copy submitted after popErrorScope failed with "Destroyed texture used in
    // a submit" and the count read zero. CountDrawnPixels records and submits
    // its copy synchronously, before its own first await.
    const litPixels = CountDrawnPixels(device, presented, canvas);

    return {
      validation: (await device.popErrorScope())?.message ?? null,
      litPixels: await litPixels
    };
  }

  const asAuthored = await Frame();

  // THE WINDING TEST IS OPT-IN, `?cull=invert`, AND THAT IS NOT TIDINESS.
  // `quadv5` authors cullMode back with frontFace cw, so a hull wound the other
  // way is entirely back-facing and the canvas stays empty - worth being able to
  // check. But it ran automatically whenever the pixel count came back zero, and
  // the count was reading the wrong swap-chain image, so it fired on a frame that
  // HAD drawn and overwrote the hull with an empty one. The operator saw the
  // silhouette for a split second and the report said nothing was drawn. A
  // diagnostic that destroys the thing it measures is worse than no diagnostic.
  //
  // `SetInvertedCullMode` is Carbon's own override, the one
  // `BeginManagedRendering` uses to mirror, so the check costs no edited state.
  const wantsInverted = new URLSearchParams(globalThis.location?.search ?? "").get("cull") === "invert";
  let inverted = null;

  if (wantsInverted)
  {
    renderContext.GetEffectStateManager().SetInvertedCullMode(true);
    inverted = await Frame();
    renderContext.GetEffectStateManager().SetInvertedCullMode(false);
  }

  const validation = asAuthored.validation ?? inverted?.validation ?? null;
  const events = al.DrainTransitions();
  // In SOF mode the first area is the ship's own effect, whose shader may still
  // be loading after the first frame; the readout reports nulls until it is.
  const shader = material.GetShaderStateInterface();
  const pass = shader ? shader.GetEffect().techniques[0].passes[0] : {};
  const stages = (pass.stageInputs ?? [])
    .filter(stage => stage?.sourceProgram?.bytes?.length)
    .map(stage => `stage${stage.stageType}:${stage.sourceProgram.bytes.length}B`);

  // KEEPS DRAWING, because one frame does not stay on screen. A WebGPU canvas
  // shows the image that was last PRESENTED, and the next `getCurrentTexture`
  // hands out a fresh uninitialised one - so a demo that draws once and stops
  // can end up compositing a blank image over the frame it just drew. Drawing
  // every tick removes the question entirely, and it is what a demo should do.
  //
  // EVERY FRAME REWRITES THE PER-FRAME BLOCKS from the camera, so the constant
  // uploads and the arena's per-frame reset are exercised continuously rather
  // than once - a single frame cannot tell you whether the second one works.
  // `?spin=1` also turns the hull, rewriting its world matrix each frame.
  //
  // `?still=1` holds it at one frame, for when a report must be deterministic.
  const parameters = new URLSearchParams(globalThis.location?.search ?? "");

  if (parameters.get("still") !== "1")
  {
    const spin = mat4.create();
    const spinLast = mat4.create();
    const spinning = parameters.get("spin") === "1";
    const start = performance.now();

    // The loop stopped dead after about a dozen frames with nothing in the
    // console, so it reports its own state rather than being guessed at again.
    const loop = { ticks: 0, drawn: 0, error: null, firstError: null, deviceLost: null };

    globalThis.__demoLoop = loop;
    device.lost.then(info => { loop.deviceLost = `${info.reason}: ${info.message}`; });

    const fpsMeter = CreateFpsMeter();

    let previousTimestamp = performance.now();
    const tick = timestamp =>
    {
      if (disposed) return;
      const dt = (timestamp - previousTimestamp) / 1000;
      previousTimestamp = timestamp;
      fpsMeter.Sample(timestamp);
      try
      {
        FitCanvas(canvas, renderTarget, frame);
        controls.resize();
        input.update(dt);
        WriteCamera(frame, camera, canvas.width, canvas.height);
        if (spinning)
        {
          mat4.copy(spinLast, spin);
          mat4.fromYRotation(spin, (performance.now() - start) / 4000);
          SetWorld(perObject, spin, spinLast);
        }

        // Synchronous: the pixel readback in `Frame` is the only asynchronous
        // part and a live loop does not need it.
        framePump.render();
        capture.afterFrame(presented, canvas.width, canvas.height, format);
        al.DrainTransitions();

        loop.ticks += 1;
        loop.drawn = al.GetDrawnBatchCount();
      }
      catch (error)
      {
        // KEEPS TICKING AFTER A THROW. A frame that fails should not silently
        // end the animation - that is what made this look like the browser
        // losing interest rather than the engine failing.
        capture.fail(error);
        loop.error = `${error.message}\n${error.stack ?? ""}`;

        // Keep the first error; the frame pump closes the device frame before
        // reporting a scene-draw failure here.
        if (!loop.firstError)
        {
          loop.firstError = loop.error;
          console.error(`demo loop: first failed frame: ${loop.error}`);
        }
      }

      globalThis.requestAnimationFrame(tick);
    };

    globalThis.requestAnimationFrame(tick);
  }

  const report = {
    litPixels: inverted?.litPixels ?? asAuthored.litPixels,
    litPixelsAsAuthored: asAuthored.litPixels,
    litPixelsCullInverted: inverted?.litPixels ?? null,
    validation,
    effect: effectPath,
    areas: areas.map(a => `${a.name}[${a.index}+${a.count}] -> ${a.path.split("/").pop()}`),
    hull: HULL,
    effectAreas: areas.length,
    scene: SCENE_MODE,
    hullBytes: hullBytes?.length ?? null,
    wgsl: stages,
    techniques: shader ? shader.GetEffect().techniques.map(technique => technique.name) : null,
    renderStateHandle: pass.renderStates,
    shaderProgramHandle: pass.shaderProgram,
    declaration: mesh ? mesh.decl.map(element => `${element.usage}${element.usageIndex}:${element.type}x${element.elementCount}`) : null,
    meshAreas: mesh ? mesh.lods[0].areas.length : ship?.mesh?.opaqueAreas?.length ?? null,
    triangles: mesh ? mesh.lods[0].areas.reduce((total, area) => total + (area.elementCount ?? 0), 0) : null,
    radius: Number(bounds.radius.toFixed(3)),
    drawnBatches: al.GetDrawnBatchCount(),
    pipelineFailure: al.m_pipelineFailure ?? null,
    events: events.map(event => event.type + (event.encoderType ? `:${event.encoderType}` : "")),
    targetFormat: renderTarget.GetFormat(),
    sof: realScene ? "EveSOF (lazy, this runtime)" : sof ? "loaded" : "unavailable",
    textureCompression: compressed ? "bc" : "decoded to rgba8",
    texturesLoaded: textures.loaded,
    deviceTextures: madeTextures,
    textureFailures: textures.failed,
    materialResources: (material.resources ?? []).map(r => r.name),
    pipelines: pipelines.slice(),
    bindGroups: bindGroups.slice(),
    constantBinds: [ ...new Set(binds) ],
    renderingModes: [ ...new Set(renderModes) ],
    dummyTextureSlots: dummies.slice(),
    resourceSetSrvs: srvs.slice(),
    uploads: uploads.map(u => `${u.label ?? "?"}@${u.offset}+${u.bytes}`),
    sceneRows: (() => {
      const block = uploads.find(u => u.bytes === 1888);
      if (!block) return null;
      const row = i => block.floats.slice(i * 4, i * 4 + 4).map(v => Number(v.toFixed(3)));
      return { sunDir: row(12), sunDiffuse: row(13), ambient: row(14), fog: row(15), gamma: row(21) };
    })(),
    uploadCount: uploads.length,
    draws: draws.slice(),
    expectedViewProjectionTransposed: Array.from(mat4.transpose(mat4.create(), frame.viewProjection)).map(v => Number(v.toFixed(3)))
  };
  recordDiagnostics = false;
  for (const log of [ uploads, draws, pipelines, bindGroups, binds, renderModes, dummies, srvs ])
  {
    log.length = 0;
    log.push = () => 0;
  }
  return report;
}
