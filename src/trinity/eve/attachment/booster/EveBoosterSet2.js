// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2_Blue.cpp
import { mat4 } from "#math/mat4";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { EveBoosterSet2Renderable } from "./EveBoosterSet2Renderable.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import {
  AddBoosterLights,
  CreateBoosterFlares,
  GenerateBoosterLightPhase
} from "./boosterUtilities.js";


/**
 * One authored booster placement: its local transform, functionality inputs,
 * atlas slots, light scale and whether it emits a trail.
 */
@type.define({ className: "EveBoosterSet2Item", family: "eve/attachment/boosters" })
export class EveBoosterSet2Item extends CjsModel
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.mat4
  transform = mat4.create();

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec4
  functionality = vec4.fromValues(0, 1, 1, 1);

  @io.rebuild("packedGeometry")
  @io.persist
  @type.boolean
  hasTrail = true;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.uint32
  atlasIndex0 = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.uint32
  atlasIndex1 = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  lightScale = 1;
}


/**
 * Owns a hull's authored booster placements and derives from them the glow
 * flares, trails, set bounding sphere and flickering point lights that its
 * renderable instances draw.
 */
@type.define({ className: "EveBoosterSet2", family: "eve/attachment/boosters" })
export class EveBoosterSet2 extends EveEntity
{

  /** m_flareLodEnabled (bool) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.boolean
  flareLodEnabled = true;

  /** m_staticTrailLength (float) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("staticTrailOffsets")
  @io.notify
  @io.persist
  @type.float32
  staticTrailLength = 0;

  /** m_trailsStaticOffsets[0] (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  trailsStaticOffsets0 = vec3.create();

  /** m_trailsStaticOffsets[1] (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  trailsStaticOffsets1 = vec3.create();

  /** m_trailsStaticOffsets[2] (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  trailsStaticOffsets2 = vec3.create();

  /** m_trailsStaticOffsets[3] (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  trailsStaticOffsets3 = vec3.create();

  /** m_trailsStaticOffsets[4] (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  trailsStaticOffsets4 = vec3.create();

  /** m_lightOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightOffset = 0;

  /** m_lightFlickerAmplitude (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightFlickerAmplitude = 0;

  /** m_lightFlickerFrequency (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightFlickerFrequency = 0;

  /** m_lightRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightRadius = 0;

  /** m_lightColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  lightColor = vec4.create();

  /** m_lightWarpRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightWarpRadius = 0;

  /** m_lightWarpColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  lightWarpColor = vec4.create();

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_alwaysOnIntensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  alwaysOnIntensity = 1;

  /** m_warpGlowColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("flares")
  @io.notify
  @io.persist
  @type.color
  warpGlowColor = vec4.create();

  /** m_glowColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("flares")
  @io.notify
  @io.persist
  @type.color
  glowColor = vec4.create();

  /** m_haloColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("flares")
  @io.notify
  @io.persist
  @type.color
  haloColor = vec4.create();

  /** m_warpHaloColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("flares")
  @io.notify
  @io.persist
  @type.color
  warpHaloColor = vec4.create();

  /** m_effectFar (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("Tr2Effect")
  effectFar = null;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  /** m_boosterRenderables (PEveBoosterSet2RenderableVector) [READ] */
  @io.read
  @type.list("EveBoosterSet2Renderable")
  instances = [];

  /** m_maxVel (float) [READWRITE] */
  @io.readwrite
  @type.float32
  maxVel = 250;

  /** m_glowScale (float) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("flares")
  @io.notify
  @io.persist
  @type.float32
  glowScale = 1;

  /** m_symHaloScale (float) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("flares")
  @io.notify
  @io.persist
  @type.float32
  symHaloScale = 1;

  /** m_haloScaleX (float) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("flares")
  @io.notify
  @io.persist
  @type.float32
  haloScaleX = 1;

  /** m_haloScaleY (float) [READWRITE, PERSIST, NOTIFY] */
  @io.flag("flares")
  @io.notify
  @io.persist
  @type.float32
  haloScaleY = 1;

  /** m_trailsSmoothing (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  trailsSmoothing = 10;

  /** m_glows (EveSpriteSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSpriteSet")
  glows = null;

  /** m_maxSize (float) [READ] */
  @io.read
  @type.float32
  maxSize = 0;

  /** m_boosterBoundingSphere.xyz (Vector4) [READ] */
  @io.read
  @type.vec3
  boosterBoundingSphereCenter = vec3.create();

  /** m_boosterBoundingSphere.w (float) [READ] */
  @io.read
  @type.float32
  boosterBoundingSphereRadius = 0;

  /** m_warpIntensity (float) [READWRITE] */
  @io.readwrite
  @type.float32
  warpIntensity = 0;

  /** m_physicsUpdate (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  physicsUpdate = true;

  /** m_destinyUpdate (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  destinyUpdate = true;

  /** m_alwaysOn (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  alwaysOn = false;

  /** m_trails (EveTrailsSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveTrailsSet")
  trails = null;

  @io.flag("items")
  @io.rebuild("packedGeometry")
  @io.notify
  @io.persist
  @type.list("EveBoosterSet2Item")
  items = [];

  #singleBoosters = [];

  #revision = 0;

  /** m_glowsVisible (cpp:682) - starts visible, recomputed by UpdateVisibility. */
  #glowsVisible = true;

  /**
   * Derives the runtime boosters, flares and trails from the authored items and
   * binds every renderable instance back to this set.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    EveBoosterSet2.#RebuildItems(this);
    for (const renderable of this.instances)
    {
      renderable?.SetBoosterSet?.(this);
    }
    this.#revision++;
    return true;
  }

  /**
   * Applies whichever of the items, staticTrailOffsets and flares rebuild flags
   * a property change raised, rebuilding only what that flag covers, and bumps
   * the revision.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    const flags = this.__state.flags;
    if (flags.has("items"))
    {
      EveBoosterSet2.#RebuildItems(this);
    }
    if (flags.has("staticTrailOffsets"))
    {
      EveBoosterSet2.#UpdateStaticTrailOffsets(this);
    }
    if (flags.delete("flares") && this.glows)
    {
      this.glows.Clear?.();
      for (const booster of this.#singleBoosters)
      {
        CreateBoosterFlares(this.glows, booster.transform, EveBoosterSet2.#GetFlareParams(this));
      }
      this.glows.Rebuild?.();
    }
    this.#revision++;
    return true;
  }

  /**
   * Resizes the renderable instance list - one instance per ship drawing this
   * booster set - keeping at least one, and rebinds every instance; returns the
   * resulting count.
   */
  @carbon.method
  @impl.implemented
  SetCount(count)
  {
    const requested = Math.trunc(Number(count));
    const target = Number.isFinite(requested) ? Math.max(1, requested) : 1;
    if (this.instances.length > target)
    {
      this.instances.length = target;
    }
    while (this.instances.length < target)
    {
      const renderable = new EveBoosterSet2Renderable();
      renderable.SetBoosterSet(this);
      this.instances.push(renderable);
    }
    for (const renderable of this.instances)
    {
      renderable?.SetBoosterSet?.(this);
    }
    this.#revision++;
    return this.instances.length;
  }

  /**
   * Updates one renderable instance from the parent's transform, speed,
   * acceleration and rotation, creating the first instance when the set has
   * none; returns false when boosterInstance is out of range.
   */
  @carbon.method
  @impl.adapted
  Update(
    deltaTime,
    time,
    parentMatrix = mat4.create(),
    parentSpeed = 0,
    parentAcceleration = EveBoosterSet2.#zero,
    parentRotation = EveBoosterSet2.#identityRotation,
    boosterInstance = 0
  )
  {
    if (!this.instances.length)
    {
      this.SetCount(1);
    }
    const index = Number(boosterInstance) >>> 0;
    if (index >= this.instances.length)
    {
      return false;
    }
    this.instances[index]?.Update?.(
      deltaTime,
      time,
      parentMatrix,
      parentSpeed,
      parentAcceleration,
      parentRotation
    );
    return true;
  }

  /**
   * Advances every instance's trail spline and then the trail set itself;
   * returns false when no trail set is attached.
   */
  @carbon.method
  @impl.adapted
  UpdateTrails(deltaTime, time)
  {
    if (!this.trails)
    {
      return false;
    }
    let updated = false;
    for (const renderable of this.instances)
    {
      updated = renderable?.UpdateTrails?.(deltaTime, time) || updated;
    }
    this.trails.Update?.(time);
    return updated;
  }

  /**
   * Drops the authored items along with everything derived from them - runtime
   * boosters, glows, trails, bounding sphere and max size.
   */
  @carbon.method
  @impl.adapted
  Clear()
  {
    this.items.length = 0;
    EveBoosterSet2.#ClearRuntimeItems(this);
    this.#revision++;
  }

  /**
   * Appends an authored booster placement and immediately derives its runtime
   * booster, flares and trail; returns the new item's index and throws a
   * TypeError when localMatrix is not sixteen values.
   */
  @carbon.method
  @impl.adapted
  Add(
    localMatrix,
    functionality,
    hasTrail,
    atlasIndex0,
    atlasIndex1,
    lightScale = 1
  )
  {
    if (!localMatrix || localMatrix.length !== 16)
    {
      throw new TypeError("EveBoosterSet2 transforms must contain 16 values");
    }
    const item = new EveBoosterSet2Item();
    mat4.copy(item.transform, localMatrix);
    vec4.copy(item.functionality, functionality ?? EveBoosterSet2.#defaultFunctionality);
    item.hasTrail = !!hasTrail;
    item.atlasIndex0 = Number(atlasIndex0) >>> 0;
    item.atlasIndex1 = Number(atlasIndex1) >>> 0;
    item.lightScale = Number(lightScale) || 0;
    this.items.push(item);
    EveBoosterSet2.#AddRuntimeItem(this, item);
    this.#revision++;
    return this.items.length - 1;
  }

  /**
   * Empties the derived booster records, glows and trails and resets the set
   * bounding sphere and max size, leaving the authored items alone.
   */
  static #ClearRuntimeItems(owner)
  {
    owner.#singleBoosters.length = 0;
    owner.glows?.Clear?.();
    owner.trails?.Clear?.();
    vec3.set(owner.boosterBoundingSphereCenter, 0, 0, 0);
    owner.boosterBoundingSphereRadius = 0;
    owner.maxSize = 0;
  }

  /**
   * Discards the derived state and re-derives it from every authored item, then
   * clears both the items and flares rebuild flags.
   */
  static #RebuildItems(owner)
  {
    EveBoosterSet2.#ClearRuntimeItems(owner);
    for (const item of owner.items)
    {
      EveBoosterSet2.#AddRuntimeItem(owner, item);
    }
    owner.__state.flags.delete("items");
    owner.__state.flags.delete("flares");
  }

  /**
   * Derives one runtime booster from an authored item - scale from the larger of
   * the transform's X and Y basis lengths, a light position pushed back along -Z
   * by lightOffset, and a random light flicker phase - then creates its flares
   * and its trail (offset back half a unit along the booster axis), and grows
   * the set bounding sphere and max size.
   */
  static #AddRuntimeItem(owner, item)
  {
    const transform = mat4.clone(item.transform);
    const scale = Math.max(
      Math.hypot(transform[0], transform[1], transform[2]),
      Math.hypot(transform[4], transform[5], transform[6])
    );
    const lightPosition = vec3.transformMat4(
      vec3.create(),
      [0, 0, -owner.lightOffset],
      transform
    );
    const booster = {
      transform,
      functionality: vec4.clone(item.functionality),
      lightPosition,
      lightRadius: scale * item.lightScale,
      lightPhase: GenerateBoosterLightPhase(),
      atlasIndex0: item.atlasIndex0,
      atlasIndex1: item.atlasIndex1,
      hasTrail: item.hasTrail
    };
    owner.#singleBoosters.push(booster);

    if (owner.glows)
    {
      CreateBoosterFlares(owner.glows, booster.transform, EveBoosterSet2.#GetFlareParams(owner));
    }
    if (owner.trails && item.hasTrail)
    {
      const trailTransform = mat4.clone(transform);
      trailTransform[12] -= trailTransform[8] * 0.5;
      trailTransform[13] -= trailTransform[9] * 0.5;
      trailTransform[14] -= trailTransform[10] * 0.5;
      owner.trails.Add?.(trailTransform, scale);
    }

    EveBoosterSet2.#UpdateBoundingSphere(owner, transform.subarray(12, 15));
    owner.maxSize = Math.max(owner.maxSize, scale);
  }

  /**
   * Sets the whole flare description in one call: glow and halo scales with
   * their normal and warp colours, plus the always-on flag.
   */
  @carbon.method
  @impl.implemented
  SetData(
    glowScale,
    glowColor,
    warpGlowColor,
    symHaloScale,
    haloScaleX,
    haloScaleY,
    haloColor,
    warpHaloColor,
    alwaysOn
  )
  {
    this.glowScale = Number(glowScale);
    vec4.copy(this.glowColor, glowColor);
    vec4.copy(this.warpGlowColor, warpGlowColor);
    this.symHaloScale = Number(symHaloScale);
    this.haloScaleX = Number(haloScaleX);
    this.haloScaleY = Number(haloScaleY);
    vec4.copy(this.haloColor, haloColor);
    vec4.copy(this.warpHaloColor, warpHaloColor);
    this.alwaysOn = !!alwaysOn;
  }

  /**
   * Sets the whole booster point-light description in one call: light offset,
   * flicker amplitude and frequency, and the normal and warp radius and colour.
   */
  @carbon.method
  @impl.implemented
  SetLightData(offset, flickerAmplitude, flickerFrequency, radius, color, warpRadius, warpColor)
  {
    this.lightOffset = Number(offset);
    this.lightFlickerAmplitude = Number(flickerAmplitude);
    this.lightFlickerFrequency = Number(flickerFrequency);
    this.lightRadius = Number(radius);
    vec4.copy(this.lightColor, color);
    this.lightWarpRadius = Number(warpRadius);
    vec4.copy(this.lightWarpColor, warpColor);
  }

  /**
   * Sets the near and far booster effects; the renderable's boosterHighLod flag
   * picks between them at draw time.
   */
  @carbon.method
  @impl.implemented
  SetEffect(effect, effectFar)
  {
    this.effect = effect ?? null;
    this.effectFar = effectFar ?? null;
  }

  /**
   * Attaches the sprite set that the per-booster flares are added to; without
   * one no flares are created.
   */
  @carbon.method
  @impl.implemented
  SetGlow(glow)
  {
    this.glows = glow ?? null;
  }

  /**
   * Attaches the trails set that per-booster trails are added to; without one no
   * trails are created.
   */
  @carbon.method
  @impl.implemented
  SetTrail(trail)
  {
    this.trails = trail ?? null;
  }

  /**
   * The intensity of one renderable instance, or the mean across every instance
   * when no index is given; zero when the set has no instances.
   */
  @carbon.method
  @impl.adapted
  GetBoosterIntensity(index = null)
  {
    if (index !== null && index !== undefined)
    {
      return this.instances[Number(index) >>> 0]?.GetIntensity?.() ?? 0;
    }
    if (!this.instances.length)
    {
      return 0;
    }
    let intensity = 0;
    for (const renderable of this.instances)
    {
      intensity += renderable?.GetIntensity?.() ?? 0;
    }
    return intensity / this.instances.length;
  }

  /** The union of every renderable's world bounding sphere. Carbon has no
   * set-level equivalent (each renderable answers for itself); `out` is
   * required so a caller can keep its own scratch. An empty set leaves `out`
   * empty (sph3 radius -1) rather than reporting a zero-radius sphere at the
   * origin. */
  @carbon.method
  @impl.adapted
  @impl.reason("Set-level aggregate with no Carbon counterpart; sph3.union replaces a hand-rolled merge.")
  GetBoundingSphere(out)
  {
    sph3.empty(out);
    for (const renderable of this.instances)
    {
      if (renderable?.GetBoundingSphere)
      {
        renderable.GetBoundingSphere(EveBoosterSet2.#sphereScratch);
        sph3.union(out, out, EveBoosterSet2.#sphereScratch);
      }
    }
    return out;
  }

  /**
   * The derived runtime boosters as deep copies - transform, functionality,
   * light position, radius and phase, atlas indices and trail flag - safe for an
   * adapter to keep.
   */
  @carbon.method
  @impl.adapted
  GetBoosterData()
  {
    return this.#singleBoosters.map(booster => ({
      transform: mat4.clone(booster.transform),
      functionality: vec4.clone(booster.functionality),
      lightPosition: vec3.clone(booster.lightPosition),
      lightRadius: booster.lightRadius,
      lightPhase: booster.lightPhase,
      atlasIndex0: booster.atlasIndex0,
      atlasIndex1: booster.atlasIndex1,
      hasTrail: booster.hasTrail
    }));
  }

  /**
   * A counter bumped whenever the authored items or the instance list change, so
   * an adapter can tell its packed data is stale.
   */
  @carbon.method
  @impl.implemented
  GetRevision()
  {
    return this.#revision;
  }

  /** Carbon EveBoosterSet2::UpdateVisibility (cpp:1096-1116): a display gate,
   * then per-renderable LOD, then ONE glow test - the loop breaks on the first
   * renderable whose glow sprite set is on screen, so `glowsVisible` is a
   * whole-set flag, not per booster.
   *
   * The glow test is EveSpriteSet::UpdateVisibility - a transformed item-set
   * AABB against the frustum. A foreign glow duck without that method is taken
   * as visible rather than culled; the flare is still gated per renderable by
   * `boostersVisible` (cpp:1264). */
  @carbon.method
  @impl.adapted
  @impl.reason("A glow duck lacking UpdateVisibility is treated as visible rather than culled.")
  UpdateVisibility(updateContext)
  {
    this.#glowsVisible = false;
    if (!this.display)
    {
      return false;
    }

    for (const renderable of this.instances)
    {
      renderable?.UpdateVisibility?.(updateContext);
    }

    if (this.glows)
    {
      for (const renderable of this.instances)
      {
        const transform = renderable?.GetParentTransform?.();
        if (!transform)
        {
          continue;
        }
        // cpp:1109 passes nullptr bones deliberately, and it is not a deferral:
        // booster glows are tied to the booster LOCATORS, so each glow is placed
        // by its renderable's parent transform (the locator placement) rather
        // than by a bone index. There is nothing for a bone palette to resolve.
        const visible = this.glows.UpdateVisibility
          ? this.glows.UpdateVisibility(updateContext, transform, null, 0)
          : true;
        if (visible)
        {
          this.#glowsVisible = true;
          break;
        }
      }
    }

    return this.#glowsVisible;
  }

  /** Whether any booster glow sprite passed the last UpdateVisibility. Carbon
   * reads m_glowsVisible directly in AddToQuadRenderer (cpp:1257); the quad
   * renderer is engine-side here, so the flag is exposed instead. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's mutable member read becomes an accessor; the quad renderer that consumes it is engine-owned.")
  GetGlowsVisible()
  {
    return this.#glowsVisible;
  }

  /** Carbon EveBoosterSet2::GetRenderables (cpp:1130-1145): gated on display
   * AND on the set owning an effect, then delegated to each renderable's own
   * visibility. */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    if (!this.display || !this.effect)
    {
      return out;
    }
    for (const renderable of this.instances)
    {
      renderable?.GetRenderables?.(out);
    }
    return out;
  }

  /** Carbon EveBoosterSet2::RegisterComponents (cpp:1272-1279): unconditional
   * LightOwner leaf self-registration. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /** Carbon EveBoosterSet2::GetLights (cpp:1287-1319): NO display gate
   * (registration is unconditional too) - the effective gates are both light
   * radii <= 0 (cpp:1289) and per-renderable overallIntensity <= 0
   * (cpp:1296). Per renderable: warp blend of radius factor and color
   * (clamped warpIntensity, cpp:1301-1304 - the COLOR blend itself is
   * unclamped 4-component lerp); per single booster: the shared 128-entry
   * random noise table drives a flicker of 1 +/- amplitude around the
   * interpolated noise (cpp:1308-1312), and AddPointLight submits the
   * booster light position under the renderable's parent transform
   * (TransformCoord - single matrix, no composition) with radius *
   * radiusFactor and color * flicker (the 3-arg overload: innerRadius 0,
   * FLAG_DEFAULT - manager-side). */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); the g_lightNoise table is module state filled with Math.random (Carbon fills it with rand()/RAND_MAX - random either way).")
  GetLights(lightManager)
  {
    if (this.lightRadius <= 0 && this.lightWarpRadius <= 0)
    {
      return;
    }
    if (typeof lightManager?.AddPointLight !== "function")
    {
      return;
    }

    const time = lightManager.GetAnimationTime?.() ?? 0;
    // Carbon EveBoosterSet2.cpp:1186: radii deliberately UNSCALED here (the
    // child booster set pre-multiplies by its parent scale; this class does
    // not - do not unify).
    const params = {
      lightRadius: this.lightRadius,
      lightColor: this.lightColor,
      lightWarpRadius: this.lightWarpRadius,
      lightWarpColor: this.lightWarpColor,
      lightFlickerAmplitude: this.lightFlickerAmplitude,
      lightFlickerFrequency: this.lightFlickerFrequency
    };

    for (const renderable of this.instances)
    {
      if (!renderable || renderable.overallIntensity <= 0)
      {
        continue;
      }
      const transform = renderable.GetParentTransform?.();
      if (!transform)
      {
        continue;
      }
      AddBoosterLights(
        lightManager, this.#singleBoosters, transform,
        renderable.overallIntensity, this.warpIntensity, params, time);
    }
  }

  /**
   * The flare parameters CreateBoosterFlares consumes, in Carbon's
   * EveBoosterFlareParams shape (EveBoosterSet2.cpp:739-742).
   */
  static #GetFlareParams(owner)
  {
    return {
      warpGlowColor: owner.warpGlowColor,
      glowScale: owner.glowScale,
      glowColor: owner.glowColor,
      haloScaleX: owner.haloScaleX,
      haloScaleY: owner.haloScaleY,
      symHaloScale: owner.symHaloScale,
      haloColor: owner.haloColor,
      warpHaloColor: owner.warpHaloColor
    };
  }

  /**
   * Grows the set bounding sphere just far enough to include one booster
   * position, leaving it unchanged when the position already falls inside.
   */
  static #UpdateBoundingSphere(owner, position)
  {
    const delta = vec3.subtract(vec3.create(), position, owner.boosterBoundingSphereCenter);
    const distance = vec3.length(delta);
    const radius = owner.boosterBoundingSphereRadius;
    if (distance * distance <= radius * radius + 1e-4 || !distance)
    {
      return;
    }
    vec3.scaleAndAdd(
      owner.boosterBoundingSphereCenter,
      owner.boosterBoundingSphereCenter,
      delta,
      0.5 * (1 - radius / distance)
    );
    owner.boosterBoundingSphereRadius = 0.5 * (radius + distance);
  }

  /**
   * Redistributes the five static trail control offsets evenly backwards along
   * -Z across staticTrailLength and clears the staticTrailOffsets flag.
   */
  static #UpdateStaticTrailOffsets(owner)
  {
    owner.__state.flags.delete("staticTrailOffsets");
    const step = owner.staticTrailLength / 4;
    const offsets = [
      owner.trailsStaticOffsets0,
      owner.trailsStaticOffsets1,
      owner.trailsStaticOffsets2,
      owner.trailsStaticOffsets3,
      owner.trailsStaticOffsets4
    ];
    for (let index = 0; index < offsets.length; index++)
    {
      vec3.set(offsets[index], 0, 0, -step * index);
    }
  }

  static #sphereScratch = sph3.create();

  static #zero = Object.freeze([0, 0, 0]);

  static #identityRotation = Object.freeze([0, 0, 0, 1]);

  static #defaultFunctionality = Object.freeze([0, 1, 1, 1]);

  static Shape = Object.freeze({
    STAR: 0,
    BOX: 1,
    SHAPE_COUNT: 2
  });

}
