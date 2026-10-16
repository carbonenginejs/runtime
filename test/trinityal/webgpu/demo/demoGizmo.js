// Private demo composition; no scene geometry or engine picking policy is added.
import { be } from "../../../../npm/dist/global/blue/blue.js";
import { CjsLibrary } from "../../../../npm/dist/core/CjsLibrary.js";
import { CjsSchema } from "../../../../npm/dist/global/schema/index.js";
import { mat4 } from "../../../../npm/dist/global/math/mat4.js";
import { BoundingSphereQuery, EveCamera, EveChildCloud, EveChildCloud2, EveEffectRoot2, EvePlanet, EveSpaceObject2, EveTransform, Tr2ManipulationTool, TriViewport } from "../../../../npm/dist/trinity/index.js";

const SELECTION_SPHERE = new Float32Array(4);

/**
 * The selection's world bounds for F (frame), as CCP's editors frame the
 * selected object: transformed hull box when ready, otherwise its world
 * bounding sphere with children, or null when it has none.
 */
export function selectionBounds(object)
{
  // A planet is a sphere of its uniform scale about its translation.
  const planet = CjsSchema.cast(object, EvePlanet);
  if (planet) return planet.scaling[0] > 0 ? { centre: Array.from(planet.translation), radius: planet.scaling[0] } : null;
  const effect = CjsSchema.cast(object, EveEffectRoot2);
  const ship = effect ?? CjsSchema.cast(object, EveSpaceObject2);
  if (ship && ship.IsBoundingBoxReady())
  {
    // Use Carbon's output-parameter contract: subclasses such as EveSwarm do
    // not implement EveSpaceObject2's optional JS object-return convenience.
    const min = new Float32Array(3), max = new Float32Array(3), world = effect ? effect.GetLocalToWorldTransform() : ship.worldTransform;
    ship.GetLocalBoundingBox(min, max);
    const corners = [];
    for (let bits = 0; bits < 8; bits++)
    {
      const x = (bits & 1 ? max : min)[0], y = (bits & 2 ? max : min)[1], z = (bits & 4 ? max : min)[2];
      corners.push([world[0] * x + world[4] * y + world[8] * z + world[12],
        world[1] * x + world[5] * y + world[9] * z + world[13],
        world[2] * x + world[6] * y + world[10] * z + world[14]]);
    }
    const centre = corners[0].map((value, axis) => (value + corners[7][axis]) / 2);
    const radius = Math.max(...corners.map(point => Math.hypot(...point.map((value, axis) => value - centre[axis]))));
    if (radius > 0) return { centre, radius, corners };
  }
  if (effect)
  {
    // Cloud assets often leave the root's authored bounds empty. Their child
    // spheres are already world-space, including the edited root placement.
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const stack = [effect], seen = new Set();
    while (stack.length)
    {
      const node = stack.pop();
      if (!node || seen.has(node)) continue;
      seen.add(node);
      if ((CjsSchema.cast(node, EveChildCloud) || CjsSchema.cast(node, EveChildCloud2)) &&
        node.GetBoundingSphere(SELECTION_SPHERE) && SELECTION_SPHERE.every(Number.isFinite) && SELECTION_SPHERE[3] > 0)
      {
        for (let axis = 0; axis < 3; axis++)
        {
          min[axis] = Math.min(min[axis], SELECTION_SPHERE[axis] - SELECTION_SPHERE[3]);
          max[axis] = Math.max(max[axis], SELECTION_SPHERE[axis] + SELECTION_SPHERE[3]);
        }
      }
      be.EnumerateChildren(node, child => stack.push(child));
    }
    if (Number.isFinite(min[0])) return { centre: min.map((value, axis) => (value + max[axis]) / 2),
      radius: Math.hypot(...min.map((value, axis) => (max[axis] - value) / 2)) };
    return null;
  }
  const target = ship ?? CjsSchema.cast(object, EveTransform);
  if (!target || !target.GetBoundingSphere(SELECTION_SPHERE, BoundingSphereQuery.EVE_BOUNDS_WITH_CHILDREN)) return null;
  if (!(SELECTION_SPHERE[3] > 0)) return null;
  return { centre: [ SELECTION_SPHERE[0], SELECTION_SPHERE[1], SELECTION_SPHERE[2] ], radius: SELECTION_SPHERE[3] };
}

/**
 * A planet's own translation, rotation and uniform scale, edited directly: it
 * has no ball here, so those members are its whole placement. A non-uniform
 * gizmo scale becomes the uniform scale of the same volume; the radius (the
 * planet's size for its controllers) follows the scale.
 */
function createPlanetTransformTarget(planet)
{
  const scale = new Float32Array(3);
  return {
    readLocal: out => mat4.fromRotationTranslationScale(out, planet.rotation, planet.translation, planet.scaling),
    readParentWorld: out => mat4.identity(out),
    writeLocal(matrix)
    {
      mat4.getScaling(scale, matrix);
      const uniform = Math.cbrt(scale[0] * scale[1] * scale[2]);
      if (!(uniform > 0)) return false;
      mat4.getTranslation(planet.translation, matrix);
      mat4.getRotation(planet.rotation, matrix);
      planet.scaling.fill(uniform);
      planet.radius = uniform;
      planet.SetControllerVariable("radius", uniform);
      return true;
    },
    destroy() {}
  };
}

/** Retains a full affine editor offset after the object's native curve/transform update. */
export function createDemoTransformTarget(object)
{
  const effect = CjsSchema.cast(object, EveEffectRoot2);
  if (effect) return {
    readLocal: out => mat4.fromRotationTranslationScale(out, effect.rotation, effect.translation, effect.scaling),
    readParentWorld: out => effect.GetWorldTransform(out),
    writeLocal(matrix)
    {
      // Authored SRT lives beneath the curve-driven parent, including signed scale.
      mat4.decomposeSigned(matrix, effect.rotation, effect.translation, effect.scaling);
      return true;
    },
    destroy() {}
  };
  const planet = CjsSchema.cast(object, EvePlanet);
  if (planet) return createPlanetTransformTarget(planet);
  const ship = CjsSchema.cast(object, EveSpaceObject2);
  const transform = CjsSchema.cast(object, EveTransform);
  if (!ship && !transform) throw new TypeError("This demo target has no supported transform accessor.");
  const method = ship ? "UpdateWorldTransform" : "UpdateViewDependentData";
  const own = Object.getOwnPropertyDescriptor(object, method), original = object[method];
  const base = mat4.clone(object.worldTransform), offset = mat4.create(), inverse = mat4.create();
  const boundsOwn = Object.getOwnPropertyDescriptor(object, "UpdateWorldBounds"), updateBounds = object.UpdateWorldBounds;
  const editedBounds = function()
  {
    updateBounds.call(this);
    // Native hull bounds assume uniform modelScale. Bound the extra affine
    // offset by sqrt(||A||1 * ||A||infinity), including shear and reflection.
    const one = Math.max(...[0, 4, 8].map(i => Math.abs(offset[i]) + Math.abs(offset[i + 1]) + Math.abs(offset[i + 2])));
    const infinity = Math.max(...[0, 1, 2].map(i => Math.abs(offset[i]) + Math.abs(offset[i + 4]) + Math.abs(offset[i + 8])));
    this._boundingSphereWorldRadius *= Math.sqrt(one * infinity);
  };
  if (ship) object.UpdateWorldBounds = editedBounds;
  function apply()
  {
    // Editor offset applies after the native placement: gl offset * base.
    mat4.multiply(object.worldTransform, offset, base);
    if (ship)
    {
      mat4.invert(object.inverseWorldTransform, object.worldTransform);
      object.worldPosition.set(object.worldTransform.subarray(12, 15));
      object.UpdateWorldBounds();
    }
  }
  const update = function(...args)
  {
    const result = original.apply(this, args);
    if (!ship || result)
    {
      mat4.copy(base, this.worldTransform);
      apply();
    }
    return result;
  };
  object[method] = update;
  return {
    readLocal: out => mat4.copy(out, object.worldTransform),
    readParentWorld: out => mat4.identity(out),
    writeLocal(matrix)
    {
      if (!mat4.invert(inverse, base)) return false;
      mat4.multiply(offset, matrix, inverse);
      apply();
      return true;
    },
    destroy()
    {
      if (object[method] !== update) return;
      if (own) Object.defineProperty(object, method, own);
      else delete object[method];
      mat4.identity(offset);
      apply();
      if (ship && object.UpdateWorldBounds === editedBounds)
      {
        if (boundsOwn) Object.defineProperty(object, "UpdateWorldBounds", boundsOwn);
        else delete object.UpdateWorldBounds;
      }
    }
  };
}

/** Cloud spheres are already world-space; the matrix validates their current placement. */
export function pickDemoCloud(x, y, view, candidates)
{
  const math = new Tr2ManipulationTool();
  const ray = math.ScreenCoordinatesToRay(x, y, view.viewport, view.view.GetTransform(),
    view.projection.GetMatrixWithoutViewAdjustment());
  const sphere = new Float32Array(4), world = mat4.create(), roots = [0, 0];
  let nearest = Infinity, selected = null;
  for (const { cloud, root } of candidates)
  {
    if (cloud.display === false || root.display === false || !cloud.GetBoundingSphere(sphere)) continue;
    cloud.GetLocalToWorldTransform(world);
    if (!world.every(Number.isFinite) || !sphere.every(Number.isFinite) || sphere[3] <= 0) continue;
    const count = math.RayToSphereIntersection(sphere, sphere[3], ray.start, ray.ray, roots);
    for (let i = 0; i < count; i++)
      if (roots[i] >= 0 && roots[i] < nearest) { nearest = roots[i]; selected = root; }
  }
  return selected;
}

/** Retain the copied root's complete editor pose after subsequent native updates. */
export function createDemoCopiedTransform(object, world, time, context)
{
  const effect = CjsSchema.cast(object, EveEffectRoot2);
  if (effect)
  {
    effect.UpdateWorldTransform(time);
    const inverse = mat4.invert(mat4.create(), effect.GetWorldTransform());
    if (!inverse) throw new Error("Copied effect has a non-invertible parent transform");
    const target = createDemoTransformTarget(effect);
    target.writeLocal(mat4.multiply(inverse, inverse, world));
    return target;
  }
  if (CjsSchema.cast(object, EvePlanet))
  {
    const planet = createPlanetTransformTarget(object);
    if (!planet.writeLocal(world)) throw new Error("Copied planet has a degenerate scale");
    return planet;
  }
  if (CjsSchema.cast(object, EveSpaceObject2)) object.UpdateWorldTransform(time);
  else if (CjsSchema.cast(object, EveTransform)) object.UpdateViewDependentData(context);
  const target = createDemoTransformTarget(object);
  if (!target.writeLocal(world)) { target.destroy(); throw new Error("Copied object has a non-invertible transform"); }
  return target;
}

/** One input route for native tools, camera motion and optional demo commands. */
export function createDemoGizmo({ canvas, context, camera, getScene, getBounds,
  getClouds = () => [], getView: customView = null, enabled = true, cameraShortcuts = true,
  window: hostWindow = globalThis.window, document: hostDocument = hostWindow.document })
{
  const library = new CjsLibrary(), input = library.CreateInputManager(), viewport = new TriViewport();
  // F frames the selection when there is one, else the demo's own bounds.
  const frameBounds = () => (selected && selectionBounds(selected)) || getBounds();
  const controls = library.CreateCameraControls({ camera, getBounds: frameBounds, getViewport: () => viewport, preferences: { frameMargin: 1.02 } }).Install(input);
  if (!cameraShortcuts) controls.SetKeyBindings(Object.fromEntries(Object.keys(controls.GetKeyBindings()).map(key => [key, null])));
  const targets = new Map();
  let selected = null, disposed = false;
  // An app's own pick for a click (setPickObject), in place of the scene's.
  let pickOverride = null;
  const getView = () => customView ? { ...customView(), context, viewport }
    : { context, view: camera.GetViewMatrix(), projection: camera.GetProjection(), viewport };
  const gizmo = library.CreateTransformGizmo({ mode: "off", getView,
    async pickObject(x, y, view)
    {
      const scene = getScene();
      const object = pickOverride ? await pickOverride(x, y, view)
        : scene ? await scene.PickObject(x, y, view.projection, view.view, view.viewport) : null;
      return object ?? pickDemoCloud(x, y, view, getClouds());
    },
    onSelect: object => select(object)
  }).Install(input);
  function select(object)
  {
    input.Cancel("selection-changed");
    if (object && !targets.has(object)) targets.set(object, createDemoTransformTarget(object));
    selected = object;
    gizmo.SetTarget(object ? targets.get(object) : null);
  }
  /**
   * The gizmo's projection: the camera's, with the far plane moved out to the
   * selection when it lies past the far clip (a planet thousands of km away),
   * as Carbon gives planets their own clip planes (EveCamera::ModifyClipPlanes).
   * The scene's far clip stays where it is: raising it past 10^6 times the
   * near clip leaves depth without precision.
   */
  function gizmoProjection(projection)
  {
    const bounds = selected ? selectionBounds(selected) : null;
    if (!bounds) return projection;
    const eye = camera.GetPosition(), reach = (Math.hypot(...bounds.centre.map((value, axis) => value - eye[axis])) + bounds.radius) * 1.05;
    return reach > camera.backClip ? EveCamera.ModifyClipPlanes(projection, camera.frontClip, reach) : projection;
  }
  /** Rebinds an edited SOF root against the replacement's native transform, retaining its full affine pose. */
  function replaceShip(previous, next, time)
  {
    const world = mat4.clone(previous.worldTransform);
    // A copied world matrix alone disappears at the next native curve update.
    // Establish the new native base, then express the retained pose as the
    // same editor offset used for interactive manipulation.
    next.UpdateWorldTransform(time);
    const target = createDemoTransformTarget(next);
    if (!target.writeLocal(world))
    {
      target.destroy();
      throw new Error("Replacement ship has a non-invertible native transform");
    }
    targets.set(next, target);
    const retired = targets.get(previous);
    if (retired) { retired.destroy(); targets.delete(previous); }
    select(next);
  }
  function resize()
  {
    viewport.width = canvas.width; viewport.height = canvas.height;
  }
  resize();
  canvas.tabIndex = 0;
  // The 2D overlay is on top, so it receives the pointer, as ccpwgl bound input
  // to device.canvas2d; coordinates stay the 3D canvas's backing pixels.
  const overlay = library.CreateOverlay2D({ canvas, document: hostDocument });
  if (enabled) input.Attach({ target: overlay.canvas, window: hostWindow, document: hostDocument,
    getSize: () => ({ width: canvas.width, height: canvas.height }) });
  // Keep the existing demo settings/actions API, backed entirely by TnyCameraControls.
  const cameraControls = { preferences: controls.preferences };
  for (const name of ["GetPose", "SetPose", "Cancel", "SetFieldOfView", "Frame", "Fly", "Resize", "TargetChanged",
    "Orbit", "Pan", "Dolly", "AdjustFieldOfView", "Reset", "Subscribe"])
    cameraControls[name[0].toLowerCase() + name.slice(1)] = controls[name].bind(controls);
  return {
    input, controls, cameraControls, gizmo, overlay, select, replaceShip,
    /** Replaces the click pick, (x, y, view) => object; null restores the scene's PickObject. Clouds stay the fallback. */
    setPickObject(pick) { pickOverride = pick; },
    adoptTransform(object, world, time)
    {
      targets.set(object, createDemoCopiedTransform(object, world, time, getScene().updateContext));
    },
    forget(object)
    {
      if (selected === object) select(null);
      targets.get(object)?.destroy();
      targets.delete(object);
    },
    get selected() { return selected; },
    getSelectedBounds: () => selected ? selectionBounds(selected) : null,
    update(dt) { resize(); return input.Update(dt); },
    render()
    {
      resize();
      const view = getView(), esm = context.GetEffectStateManager();
      context.PushViewTransform(); context.PushProjection(); esm.PushViewport();
      try
      {
        context.SetViewTransform(view.view.GetTransform());
        context.SetProjection(gizmoProjection(view.projection.GetMatrixWithoutViewAdjustment()));
        esm.SetViewport(viewport);
        gizmo.Render(context);
      }
      finally { esm.PopViewport(); context.PopProjection(); context.PopViewTransform(); }
    },
    dispose()
    {
      if (disposed) return;
      disposed = true;
      gizmo.Destroy(); controls.Destroy(); input.Destroy(); overlay.Destroy();
      for (const target of targets.values()) target.destroy();
      targets.clear(); selected = null;
    }
  };
}
