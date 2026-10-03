import { blue, GetResources, Traverse } from "../../../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../../../npm/dist/global/schema/index.js";
import { SetEffectPathDefaults } from "../../../../npm/dist/global/utils/effectPath.js";
import { RegisterTextureResources, RegisterSolidColorTexture, RegisterTextureArray, RegisterTexturePack, RegisterGeometryResources } from "../../../../npm/dist/resource/index.js";
import { RegisterShaderResources } from "../../../../npm/dist/resource/shader/index.js";
import { RegisterObjectResources } from "../../../../npm/dist/resource/object/index.js";
import { CjsWebgpuFormat } from "../../../../npm/dist/resource/formats/webgpu/index.js";
import { CjsWebgpuDevice } from "../../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL, CjsWebgpuRenderTarget } from "../../../../npm/dist/trinityal/webgpu/internal.js";
import { EveSpaceScene, EveSpaceSceneRenderDriver, EveChildCloud, EveChildCloud2, EveCamera, Tr2QuadRenderer, CjsBatchManager, TriRenderBatchAccumulator, Tr2Renderer } from "../../../../npm/dist/trinity/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../../npm/dist/trinity/core/context/Tr2RenderContext.js";
import { gTriDev } from "../../../../npm/dist/trinity/core/device/gTriDev.js";
import { RenderingMode, TriBatchType, TR2SHADERMODEL } from "../../../../npm/dist/global/consts/graphics/index.js";
import { Tr2VolumerticQuality, ShadowQuality } from "../../../../npm/dist/trinity/generated/trinityCore/enums.js";
import "../../../../npm/dist/audio/index.js";
import { createDemoFramePump } from "./demoFramePump.js";
import { createCameraControls } from "./cameraControls.js";

/** Authored graphs; switching cases reloads the page to release the prior volume/device. */
export const CLOUD_CASES = {
  legacy: { label: "Legacy · aquapuff", path: "res:/dx9/model/worldobject/cloud/aquapuff.black", radius: 100000 },
  lightmap: { label: "Cloud2 · swirl / lightmap", path: "res:/fisfx/vdb/unique/swirl/swirl_04a.black", radius: 873220.375 },
  interior: { label: "Cloud2 · inside infinite", path: "res:/fisfx/vdb/infinite/vdb_infinite_01a.black", radius: 1000000 }
};

/** Composes the ordinary scene driver around an intact authored cloud graph. */
export async function runCloudDemo(canvas, report)
{
  const selected = new URLSearchParams(location.search).get("case") || "legacy";
  const asset = CLOUD_CASES[selected];
  if (!asset) throw new Error("Unknown cloud case: " + selected);
  const state = { case: selected, asset: asset.path, tier: "High / sm_depth", stage: "Loading", frames: 0, draws: 0, dispatches: 0, errors: [], clouds: [] };
  let stopped = false, disposed = false, pump = null, frameId = 0, controls = null;
  const fail = error => {
    const message = error instanceof Error ? error.message : String(error);
    state.errors.push(message); state.errors = state.errors.slice(-12);
    state.stage = "Failed"; stopped = true; report(state); console.error(error);
  };
  state.build = await fetch("/build").then(response => response.json()).then(build => build.resources);
  report(state);
  blue.resMan.Register({ source: { Read: async path => {
    const logical = String(path).replace(/^res:\//u, "").replace("graphics/effect.webgpu/", "graphics/effect.dx11/");
    const response = await fetch("/resource/" + logical);
    if (!response.ok) throw new Error(`${response.status}: ${path}`);
    return new Uint8Array(await response.arrayBuffer());
  } } });
  RegisterTextureResources(blue.resMan);
  RegisterSolidColorTexture(blue.resMan);
  RegisterTextureArray(blue.resMan);
  RegisterTexturePack(blue.resMan);
  RegisterShaderResources(blue.resMan, { translator: CjsWebgpuFormat });
  RegisterGeometryResources(blue.resMan);
  RegisterObjectResources(blue.resMan);
  SetEffectPathDefaults({ platformName: "webgpu", shaderModel: "depth" });
  Tr2Renderer.SetShaderModel(TR2SHADERMODEL.TR2SM_3_0_DEPTH);

  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) throw new Error("WebGPU adapter unavailable");
  const features = ["texture-compression-bc", "texture-compression-bc-sliced-3d", "float32-filterable", "depth-clip-control"].filter(feature => adapter.features.has(feature));
  const device = await adapter.requestDevice({ requiredFeatures: features,
    requiredLimits: { maxTextureDimension2D: Math.min(16384, adapter.limits.maxTextureDimension2D) } });
  let dispose = () => { disposed = true; device.destroy(); };
  window.addEventListener("pagehide", () => dispose(), { once: true });
  device.addEventListener("uncapturederror", event => fail(event.error));
  device.lost.then(info => { if (!disposed) fail(new Error("Device lost: " + info.message)); });
  try
  {
  const webgpu = new CjsWebgpuDevice({ device, shaderStage: GPUShaderStage });
  const target = new CjsWebgpuRenderTarget(webgpu, { canvas, context: canvas.getContext("webgpu"),
    format: navigator.gpu.getPreferredCanvasFormat(), depthFormat: "depth24plus", alphaMode: "opaque" });
  const resize = () => {
    const width = Math.max(1, Math.floor(canvas.clientWidth * Math.min(devicePixelRatio, 1.5)));
    const height = Math.max(1, Math.floor(canvas.clientHeight * Math.min(devicePixelRatio, 1.5)));
    if (canvas.width !== width || canvas.height !== height)
    {
      canvas.width = width; canvas.height = height; target.Configure({ width, height });
      if (controls && selected !== "interior") controls.resize();
    }
  };
  canvas.width = 0; resize();
  const al = new CjsWebgpuRenderContextAL({ webgpu, renderTarget: target });
  al.CreateDevice();
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  context.SetRenderContextAL(al);
  for (const name of ["DrawPrimitive", "DrawIndexedInstanced"])
  {
    const original = al[name].bind(al);
    al[name] = (...args) => { state.draws++; return original(...args); };
  }
  const dispatch = al.RunComputeShader.bind(al);
  al.RunComputeShader = (...args) => { state.dispatches++; return dispatch(...args); };

  const scene = new EveSpaceScene();
  scene.Initialize(context);
  const root = await blue.resMan.LoadObject(asset.path);
  scene.objects.Append(root);
  const clouds = [];
  Traverse(root, value => { if (CjsSchema.cast(value, EveChildCloud) || CjsSchema.cast(value, EveChildCloud2)) clouds.push(value); });
  if (!clouds.length) throw new Error("Authored graph contains no cloud");
  root.StartControllers();
  root.PlayCurveSet("play_start");
  gTriDev.device.PrepareDeviceResources();

  const camera = new EveCamera();
  camera.zoomCurve = null; camera.useExtraTranslation = true;
  camera.frontClip = 10; camera.backClip = Math.max(1e7, asset.radius * 20);
  camera.translationFromParent = asset.radius * 2.2;
  camera.fieldOfView = Math.PI / 4; camera.SetOrbit(Math.PI / 4, -0.3);
  const bounds = { centre: [0, 0, 0], radius: asset.radius };
  controls = createCameraControls({ camera, getViewport: () => ({ width: canvas.width, height: canvas.height }), getBounds: () => bounds });
  const batchTypes = [TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL, TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE, TriBatchType.TRIBATCHTYPE_DISTORTION];
  const manager = new CjsBatchManager({ batchTypes, createAccumulator: type => {
    const accumulator = new TriRenderBatchAccumulator();
    const modes = { [TriBatchType.TRIBATCHTYPE_DECAL]: RenderingMode.RM_DECAL, [TriBatchType.TRIBATCHTYPE_TRANSPARENT]: RenderingMode.RM_ALPHA,
      [TriBatchType.TRIBATCHTYPE_ADDITIVE]: RenderingMode.RM_ALPHA_ADDITIVE, [TriBatchType.TRIBATCHTYPE_DISTORTION]: RenderingMode.RM_ALPHA_ADDITIVE };
    const clear = accumulator.Clear.bind(accumulator);
    accumulator.Clear = () => { clear(); accumulator.renderingMode = modes[type] ?? RenderingMode.RM_OPAQUE; };
    accumulator.Clear(); return accumulator;
  } });
  manager.RegisterCollector("Tr2QuadRenderer", { Collect: (_renderables, map) => {
    scene.UpdateQuadRenderer(scene.updateContext.GetFrustum(), scene.objects, context);
    const quads = Tr2QuadRenderer.Instance();
    quads.GetBatches(TriBatchType.TRIBATCHTYPE_OPAQUE, map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE));
    quads.GetBatches(TriBatchType.TRIBATCHTYPE_ADDITIVE, map.GetAccumulator(TriBatchType.TRIBATCHTYPE_ADDITIVE));
  } });
  manager.Initialize();
  const driver = new EveSpaceSceneRenderDriver();
  driver.scene = scene; driver.camera = camera;
  driver.view = camera.GetViewMatrix(); driver.projection = camera.GetProjection();
  driver.volumetricQuality = Tr2VolumerticQuality.High;
  driver.SetBatchManager(manager);
  driver.clearColor = [0.025, 0.035, 0.055, 1];
  await blue.resMan.Wait();
  for (const resource of GetResources(driver))
    if (!resource.IsGood()) throw new Error("Resource is not ready: " + resource.GetPath());
  pump = createDemoFramePump(gTriDev.device, () => {
    al.SetRenderTarget(0, target); al.SetDepthStencil(null);
    driver.Execute([target], null, blue.os.GetActualTime(), blue.os.GetCurrentFrameTime(), null, context);
  });
  let framed = false, lastReport = 0;
  const sphere = new Float32Array(4);
  function frame(now)
  {
    if (disposed) return;
    frameId = requestAnimationFrame(frame);
    if (stopped) return;
    try
    {
      resize(); pump.render(); state.frames++;
      if (!framed && selected !== "interior")
      {
        clouds[0].GetBoundingSphere(sphere);
        if (sphere[3] > 0) { bounds.centre = Array.from(sphere.subarray(0, 3)); bounds.radius = sphere[3]; controls.frame(); framed = true; }
      }
      if (now - lastReport > 500)
      {
        lastReport = now;
        for (const resource of GetResources(driver))
          if (resource.IsFailed()) throw resource.error || new Error("Resource failed: " + resource.GetPath());
        state.clouds = clouds.map(cloud => {
          const cloud2 = CjsSchema.cast(cloud, EveChildCloud2);
          return { type: CjsSchema.getClassName(cloud.constructor), shaderReady: Boolean(cloud.effect.GetShaderStateInterface()),
            ...(cloud2 ? { densityDimensions: [cloud.lightmapWidth, cloud.lightmapHeight, cloud.lightmapDepth],
              lightmapDirty: cloud.lightmapDirty, lightmapSlice: cloud.lightmapDirtyOffset,
              lightmapValid: cloud.lightmap.GetTexture().IsValid(), renderedLastFrame: cloud.renderedLastFrame } : {}) };
        });
        state.stage = state.clouds.every(cloud => cloud.shaderReady) ? "Running · inspect the canvas" : "Waiting for shader";
        report(state);
      }
    }
    catch (error) { fail(error); }
  }
  let drag = null;
  canvas.addEventListener("pointerdown", event => { canvas.setPointerCapture(event.pointerId); drag = [event.clientX, event.clientY]; });
  canvas.addEventListener("pointermove", event => {
    if (!drag) return;
    controls.orbit(event.clientX - drag[0], event.clientY - drag[1]); drag = [event.clientX, event.clientY];
  });
  canvas.addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("wheel", event => { event.preventDefault(); controls.dolly(event.deltaY); }, { passive: false });
  frameId = requestAnimationFrame(frame);
  const api = { state, root, scene, driver, clouds, controls, fail,
    pause(value) { if (!value && state.errors.length) return; stopped = value; state.stage = value ? "Paused" : "Running"; report(state); },
    setBlur(value) { scene.volumetricsRenderer.blur = value; },
    setQuality(value) { driver.volumetricQuality = Tr2VolumerticQuality[value]; },
    setShadows(value) { driver.shadowQuality = value ? ShadowQuality.SHADOW_LOW : ShadowQuality.SHADOW_DISABLED; },
    dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(frameId); pump.dispose(); controls.dispose(); driver.Destroy(); Tr2Renderer.shutdown(); context.Destroy(); device.destroy(); }
  };
  globalThis.cloudDemo = api;
  dispose = () => api.dispose();
  return api;
  }
  catch (error)
  {
    dispose();
    throw error;
  }
}
