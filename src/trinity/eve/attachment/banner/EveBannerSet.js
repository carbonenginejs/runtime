// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { sph3 } from "#math/sph3";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveBannerItem } from "./EveBannerItem.js";
import { EveBannerLight } from "./EveBannerLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Saturate } from "../EveSpaceObjectAttachmentUtils.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { FLOAT_MAX } from "../../../core/view/TriFrustum.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import {
  AsPerPointLightData,
  CopyLightData,
  CreateLightDataScratch,
  CreateLightRecord,
  MatrixCopyFrom3x4
} from "../../lights/lightConversion.js";


/**
 * A hull's authored banner quads, owning their static and per-bone bounds, the
 * largest single banner radius its LOD is measured on, and the banner lights.
 */
@type.define({ className: "EveBannerSet", family: "eve/attachment/banners" })
export class EveBannerSet extends IEveSpaceObjectAttachment
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.list("EveBannerItem")
  banners = [];

  @io.persist
  @type.string
  name = "";

  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.persist
  @type.boolean
  isPickable = false;

  @io.readwrite
  @type.boolean
  display = true;

  @io.persist
  @type.int32
  key = 0;

  @io.persist
  @type.list("EveBannerLight")
  lights = [];

  // SOF-authored primary banner texture parameter; persisted so the values
  // interchange reproduces Carbon's hidden banner binding.
  @io.persist
  @type.objectRef("TriTextureParameter")
  primaryTextureParameter = null;

  #rebuildRevision = 0;

  /** m_aabb (h) - the union of every banner that rides the parent transform. */
  #staticBounds = box3.create();

  /** m_skinnedBoxes (cpp:403) - [{ boneIndex, bounds }], ascending. */
  #boneBounds = [];

  /** m_maxBannerRadius (cpp:421) - the largest single banner half-diagonal,
   * which is the radius the LOD test measures rather than the whole set. */
  #maxBannerRadius = 0;

  /** m_isVisible - the result of the last UpdateVisibility. */
  #isVisible = false;

  /** Carbon m_activationStrength (ctor 0, EveBannerSet.cpp:94). Lights are
   * BLACK until UpdateLights runs. */
  #activationStrength = 0;

  /**
   * Recomputes the bounds a banner set answers with - the static box, the
   * per-bone boxes and the largest single banner half-diagonal - and marks the
   * packed geometry stale; a set without an effect builds no bounds at all, so
   * it reads as invisible rather than unbounded.
   */
  @carbon.method
  @impl.adapted
  Rebuild()
  {
    // Physical geometry, buffers and batches are backend work; the bounds are
    // not. Carbon rebuilds both together (cpp:397-431).
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");

    box3.empty(this.#staticBounds);
    this.#boneBounds.length = 0;
    this.#maxBannerRadius = 0;

    // Carbon bails before building ANY bounds when the set has no effect
    // (cpp:406-409) - an effectless banner set is invisible, not unbounded.
    if (!this.effect)
    {
      return;
    }

    // Carbon inlines the shared grouping here, and never gates it on a skinned
    // flag: any banner with a bone of its own gets its own box (cpp:424).
    CreateItemSetBoundingBoxes(this.#staticBounds, this.#boneBounds, true, this.banners);

    for (const banner of this.banners)
    {
      banner.GetBounds(EveBannerSet.#bannerScratch);
      this.#maxBannerRadius = Math.max(
        this.#maxBannerRadius,
        box3.radius(EveBannerSet.#bannerScratch)
      );
    }
  }

  /** Carbon EveBannerSet::GetAabb (cpp:392-395): the item-set bounds. The bone
   * count is forwarded ungated - a banner set has no skinned flag. */
  @carbon.method
  @impl.implemented
  GetAabb(out, bones = null, boneCount = 0)
  {
    return GetItemSetAabb(out, this.#staticBounds, this.#boneBounds, bones, boneCount);
  }

  /** The largest single banner half-diagonal, as measured by the last Rebuild. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the m_maxBannerRadius member directly; JavaScript exposes it through an accessor.")
  GetMaxBannerRadius()
  {
    return this.#maxBannerRadius;
  }

  /** The result of the last UpdateVisibility (Carbon m_isVisible). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the m_isVisible member directly; JavaScript exposes it through an accessor.")
  GetVisibility()
  {
    return this.#isVisible;
  }

  /**
   * Carbon EveBannerSet::UpdateVisibility (cpp:117-161). The frustum test is the
   * usual transformed item-set box, but the LOD gate is unlike any other set:
   *
   * - It measures the CLOSEST POINT ON THE SET SPHERE to the camera, carrying
   *   the largest SINGLE banner radius. A row of banners therefore lods out on
   *   how big one banner looks, not on how big the row is.
   * - A camera INSIDE the set sphere skips the gate entirely and leaves the
   *   screen size at FLT_MAX, which is also what the effect is then told.
   * - The bar is HALF the visibility threshold, not the threshold.
   *
   * The effect is told the screen size on EVERY path, culled or not, because it
   * drives texture streaming rather than drawing.
   */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveBannerSet.#aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      this.#isVisible = false;
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);

    const frustum = updateContext?.GetFrustum?.() ?? null;
    this.#isVisible = !!frustum?.IsBoxVisible(aabb);

    let isLoddedOut = true;
    let screenSize = FLOAT_MAX;

    if (frustum)
    {
      // Carbon BoundingSphereFromBox: the box centre with half its full
      // diagonal. The centre is written into the sphere in place, so the radius
      // is assigned after - never inside a sph3.set that would clear it.
      const sphere = EveBannerSet.#sphereScratch;
      sphere[3] = box3.toPositionRadius(aabb, sph3.$position(sphere));

      if (sph3.containsPoint(sphere, frustum.viewPos))
      {
        isLoddedOut = false;
      }
      else
      {
        // The point on the set sphere nearest the camera, given the largest
        // single banner as the thing being measured.
        const closest = vec3.subtract(EveBannerSet.#closestScratch, frustum.viewPos, sph3.$position(sphere));
        vec3.normalize(closest, closest);
        vec3.scaleAndAdd(closest, sph3.$position(sphere), closest, sph3.radius(sphere));

        const element = sph3.fromPositionRadius(EveBannerSet.#elementScratch, closest, this.#maxBannerRadius);
        screenSize = frustum.GetPixelSizeAccrossEst(element);
        if (screenSize > (updateContext.GetVisibilityThreshold?.() ?? 0) * 0.5)
        {
          isLoddedOut = false;
        }
      }
    }

    this.effect?.UsedWithScreenSize?.(screenSize, this.#maxBannerRadius, EveBannerSet.#uvDensities);

    if (isLoddedOut)
    {
      this.#isVisible = false;
    }
    return this.#isVisible;
  }

  /** Carbon EveBannerSet::GetDebugOptions (cpp:219-224). */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2DebugRendererOptions is an engine-owned set; a Set (add) or an insert duck is accepted.")
  GetDebugOptions(options = new Set())
  {
    for (const option of EveBannerSet.DebugOptions)
    {
      if (options?.add) options.add(option);
      else options?.insert?.(option);
    }
    return options;
  }

  /**
   * Carbon EveBannerSet::RenderDebugInfo (cpp:226-311): three independent
   * options, each emitting draw intents onto the injected debug renderer.
   *
   * "Banner Sets" draws every banner TWICE - wireframe then solid - as a
   * near-flat box (z +/- 0.005), NOT the half-open bounds box the LOD uses. A
   * banner whose bone index is out of range is drawn RED instead of blue, which
   * is how a missing bone shows up on screen.
   *
   * "Banner Sets Bounds" draws the item-set box in the parent space, and
   * "Banner Sets Lights" draws each light twice, inner then outer radius, with
   * the saturated authored color - or the texture average color when a primary
   * texture parameter is attached, exactly as GetLights decides it.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("ITr2DebugRenderer2 and Tr2DebugObjectReference are engine-owned; the reference collapses to (owner, index) arguments and the Effect enum to its ordinal.")
  RenderDebugInfo(renderer, parentTransform, bones = null, boneCount = 0)
  {
    if (!renderer) return false;

    if (renderer.HasOption?.(this, "Banner Sets"))
    {
      const transform = EveBannerSet.#debugTransform;
      for (let index = 0; index < this.banners.length; index++)
      {
        const banner = this.banners[index];
        mat4.fromRotationTranslationScale(transform, banner.rotation, banner.position, banner.scaling);

        let color = EveBannerSet.#debugBannerColor;
        if (banner.bone >= 0)
        {
          if (bones && banner.bone < boneCount)
          {
            MatrixCopyFrom3x4(EveBannerSet.#debugBone, bones, banner.bone);
            // Carbon (row-vector): t * boneTF - the banner applies first.
            mat4.multiply(transform, EveBannerSet.#debugBone, transform);
          }
          else
          {
            color = EveBannerSet.#debugMissingBoneColor;
          }
        }
        mat4.multiply(transform, parentTransform, transform);

        renderer.DrawBox?.(this, index, transform, EveBannerSet.#debugBoxMin, EveBannerSet.#debugBoxMax, EveBannerSet.DebugEffect.Wireframe, color);
        renderer.DrawBox?.(this, index, transform, EveBannerSet.#debugBoxMin, EveBannerSet.#debugBoxMax, EveBannerSet.DebugEffect.Solid, 0);
      }
    }

    if (renderer.HasOption?.(this, "Banner Sets Bounds"))
    {
      const aabb = this.GetAabb(EveBannerSet.#debugBounds, bones, boneCount);
      renderer.DrawBox?.(this, -1, parentTransform, box3.$min(aabb), box3.$max(aabb), EveBannerSet.DebugEffect.Wireframe, 0xff00ff00);
    }

    if (renderer.HasOption?.(this, "Banner Sets Lights"))
    {
      const color = EveBannerSet.#debugLightColor;
      for (const light of this.lights)
      {
        const transform = mat4.fromTranslation(EveBannerSet.#debugTransform, light.lightData.position);
        // Carbon (row-vector): TranslationMatrix(position) * boneMatrix.
        mat4.multiply(transform, light.boneMatrix, transform);

        if (this.primaryTextureParameter)
        {
          this.GetAverageColor(color);
        }
        else
        {
          Saturate(color, light.lightData.color, light.saturation);
        }

        color[3] = 0.5;
        renderer.DrawSphere?.(this, light.index, transform, light.lightData.innerRadius, 10, EveBannerSet.DebugEffect.Solid, color);
        color[3] = 0.3;
        renderer.DrawSphere?.(this, light.index, transform, light.lightData.radius, 10, EveBannerSet.DebugEffect.Solid, color);
      }
    }

    return true;
  }

  /**
   * The SOF reference id of the banner at an index, which is how a caller maps a
   * picked banner back to its authored slot.
   */
  @carbon.method
  @impl.implemented
  GetReference(index)
  {
    return this.banners[index].reference;
  }

  /** Measures the generated banner surface exactly as Carbon does: flat
   * banners use authored X/Y scale, while curved banners sum the same
   * approximately five-degree transformed arc chords used by geometry
   * generation. */
  @carbon.method
  @impl.implemented
  static GetBannerAspectRatio(banner)
  {
    const flatX = banner.angleX <= 0;
    const flatY = banner.angleY <= 0;
    if (flatX && flatY)
    {
      return banner.scaling[0] / banner.scaling[1];
    }

    const transform = mat4.fromRotationTranslationScale(
      EveBannerSet.#aspectTransform,
      banner.rotation,
      banner.position,
      banner.scaling
    );
    if (flatX)
    {
      const angleY = EveBannerSet.#clampBannerAngle(banner.angleY);
      const halfAngleY = angleY / 180 * Math.PI / 2;
      const scaleY = 0.5 / Math.sin(halfAngleY);
      const vLength = EveBannerSet.#measureVerticalArc(transform, angleY, halfAngleY, scaleY, scaleY);
      return banner.scaling[0] / vLength;
    }
    if (flatY)
    {
      const angleX = EveBannerSet.#clampBannerAngle(banner.angleX);
      const halfAngleX = angleX / 180 * Math.PI / 2;
      const scaleX = 0.5 / Math.sin(halfAngleX);
      const uLength = EveBannerSet.#measureHorizontalArc(transform, angleX, halfAngleX, scaleX, scaleX);
      return uLength / banner.scaling[1];
    }

    const angleX = EveBannerSet.#clampBannerAngle(banner.angleX);
    const angleY = EveBannerSet.#clampBannerAngle(banner.angleY);
    const halfAngleX = angleX / 180 * Math.PI / 2;
    const halfAngleY = angleY / 180 * Math.PI / 2;
    const scaleX = 0.5 / Math.sin(halfAngleX);
    const scaleY = 0.5 / Math.sin(halfAngleY);
    const scaleZ = Math.min(scaleX, scaleY);
    const uLength = EveBannerSet.#measureHorizontalArc(transform, angleX, halfAngleX, scaleX, scaleZ);
    const vLength = EveBannerSet.#measureVerticalArc(transform, angleY, halfAngleY, scaleY, scaleZ);
    return uLength / vLength;
  }

  /**
   * Runs the first Rebuild so the set has bounds before its first visibility
   * test.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.Rebuild();
    return true;
  }

  /**
   * Copies a loose banner description into a stored EveBannerItem, appends it
   * and returns the copy; the source object is not retained.
   */
  @carbon.method
  @impl.implemented
  AddBanner(banner)
  {
    const copy = EveBannerSet.#copyBanner(banner);
    this.banners.push(copy);
    return copy;
  }

  /**
   * Sets the effect that draws the banners; without one Rebuild produces no
   * bounds and the set never draws.
   */
  @carbon.method
  @impl.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /** Sets the banner key that the set's picking id is derived from. */
  @carbon.method
  @impl.implemented
  SetKey(key)
  {
    this.key = Number(key) | 0;
  }

  /** The picking id this set writes, which is 101 plus the authored key. */
  @carbon.method
  @impl.implemented
  GetPickingID()
  {
    return (101 + this.key) >>> 0;
  }

  /**
   * Sets a shader option on the banner effect, doing nothing when no effect that
   * accepts options is attached.
   */
  @carbon.method
  @impl.adapted
  SetShaderOption(name, value)
  {
    if (this.effect && typeof this.effect.SetOption === "function")
    {
      this.effect.SetOption(name, value);
    }
  }

  /**
   * Sets the texture parameter whose average colour replaces the authored colour
   * of every banner light.
   */
  @carbon.method
  @impl.adapted
  SetPrimaryTextureParameter(parameter)
  {
    this.primaryTextureParameter = parameter ?? null;
  }

  /**
   * Converts a SOF-authored light description into an EveBannerLight and appends
   * it to the set.
   */
  @carbon.method
  @impl.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveBannerLight.FromSOF(light));
  }

  /** Carbon EveBannerSet::RegisterComponents (cpp:457-464): LightOwner
   * UNCONDITIONAL (no lights-empty check, unlike the other packed sets -
   * GetLights self-gates on display/lights instead, cpp:468). */
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

  /** Carbon EveBannerSet::UpdateLights (cpp:164-183): the shared packed-set
   * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
   * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
   * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
   * the activation strength (boosterGain unused by banners). */
  @carbon.method
  @impl.implemented
  UpdateLights(parentTransform, bones, boneCount, activationStrength, _boosterGain = 0)
  {
    for (const light of this.lights)
    {
      const boneIndex = light.lightData.boneIndex;
      if (bones && boneIndex > 0 && boneIndex < boneCount)
      {
        MatrixCopyFrom3x4(light.boneMatrix, bones, boneIndex);
        light.boneMatrix[3] = 0;
        light.boneMatrix[7] = 0;
        light.boneMatrix[11] = 0;
        light.boneMatrix[15] = 1;
        // Carbon (row-vector): boneMatrix * parentTransform - bone first.
        mat4.multiply(light.boneMatrix, parentTransform, light.boneMatrix);
      }
      else
      {
        mat4.copy(light.boneMatrix, parentTransform);
      }
    }
    this.#activationStrength = Number(activationStrength) || 0;
  }

  /** Carbon EveBannerSet::GetAverageColor (cpp:441-455): the PRIMARY texture
   * parameter's average color, (0,0,0,0) when the map or resource is
   * missing (contrast EvePlaneSet's white default and four-map product). */
  @carbon.method
  @impl.adapted
  @impl.reason("The texture average color is a resource capability - read as a GetAverageColor duck on the parameter's resource, zero when absent.")
  GetAverageColor(out = new Float32Array(4))
  {
    const average = this.primaryTextureParameter?.GetResource?.()?.GetAverageColor?.();
    if (average)
    {
      out[0] = average[0];
      out[1] = average[1];
      out[2] = average[2];
      out[3] = average[3];
    }
    else
    {
      out.fill(0);
    }
    return out;
  }

  /** Carbon EveBannerSet::GetLights (cpp:466-491): the ONLY packed set with
   * a display gate in GetLights (its registration is unconditional,
   * cpp:457-464); an averageColor with zero alpha submits NOTHING (texture
   * not loaded yet, cpp:474-477); the loop iterates BY VALUE (`auto light`,
   * cpp:482) - the authored color is REPLACED entirely by
   * Saturate(averageColor, saturation) on a scratch copy (cpp:484 -
   * contrast EvePlaneSet's multiply); no blink/fade; point conversion on
   * the bone matrix. */
  @carbon.method
  @impl.adapted
  @impl.reason("The texture average color and profile packing follow the adapted ducks above.")
  GetLights(lightManager)
  {
    if (!this.display || this.lights.length === 0)
    {
      return;
    }
    const averageColor = EveBannerSet.#averageColorScratch;
    this.GetAverageColor(averageColor);
    if (averageColor[3] === 0)
    {
      return;
    }

    const features = EveBannerSet.#features;
    features.parentBrightness = this.#activationStrength;
    features.parentScale = 1;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality() ?? 0;
    const record = EveBannerSet.#lightRecord;
    const dataCopy = EveBannerSet.#lightDataScratch;

    for (const light of this.lights)
    {
      CopyLightData(dataCopy, light.lightData);
      Saturate(dataCopy.color, averageColor, light.saturation);
      AsPerPointLightData(record, dataCopy, light.boneMatrix, features, quality);
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager?.AddLight(record);
    }
  }

  /** Carbon ITr2DebugRenderer2::Effect (Include/ITr2DebugRenderer2.h:134-139). */
  static DebugEffect = Object.freeze({ Wireframe: 0, Solid: 1, Lit: 2 });

  /** The option names this set publishes (cpp:221-223). */
  static DebugOptions = Object.freeze(["Banner Sets", "Banner Sets Bounds", "Banner Sets Lights"]);

  static #debugTransform = mat4.create();

  static #debugBone = mat4.create();

  static #debugBounds = box3.create();

  static #debugLightColor = new Float32Array(4);

  static #debugBoxMin = Object.freeze([-0.5, -0.5, -0.005]);

  static #debugBoxMax = Object.freeze([0.5, 0.5, 0.005]);

  static #debugBannerColor = Object.freeze([0.1, 0.1, 0.7, 0.5]);

  static #debugMissingBoneColor = Object.freeze([0.7, 0.1, 0.1, 0.5]);

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static #aabbScratch = box3.create();

  static #sphereScratch = sph3.create();

  static #elementScratch = sph3.create();

  static #closestScratch = vec3.create();

  static #bannerScratch = box3.create();

  /** Carbon passes a single 1.0 density (cpp:154) - a banner is one flat quad. */
  static #uvDensities = Object.freeze([1]);

  static #features = { parentBrightness: 0, parentScale: 1 };

  static #lightRecord = CreateLightRecord();

  static #lightDataScratch = CreateLightDataScratch();

  static #averageColorScratch = new Float32Array(4);

  static #aspectTransform = mat4.create();

  static #aspectPosition = vec3.create();

  static #aspectPreviousPosition = vec3.create();

  /**
   * Clamps an authored curvature angle to the 0..180 degree range the arc
   * measurement assumes.
   */
  static #clampBannerAngle(angle)
  {
    return Math.max(0, Math.min(Number(angle), 180));
  }

  /**
   * Sums the transformed chord lengths of the horizontal curvature arc, sampled
   * at roughly one segment per five degrees, giving the banner's real U length
   * as the generated geometry would have it.
   */
  static #measureHorizontalArc(transform, angle, halfAngle, scaleX, scaleZ)
  {
    const segments = 1 + Math.floor(angle / 5);
    const position = EveBannerSet.#aspectPosition;
    const previous = EveBannerSet.#aspectPreviousPosition;
    let length = 0;

    for (let index = 0; index <= segments; index++)
    {
      const value = index / segments;
      const sampleAngle = -halfAngle + value * 2 * halfAngle;
      vec3.set(
        position,
        Math.sin(sampleAngle) * scaleX,
        0,
        (Math.cos(sampleAngle) - 1) * scaleZ
      );
      vec3.transformMat4(position, position, transform);
      if (index) length += vec3.distance(previous, position);
      vec3.copy(previous, position);
    }
    return length;
  }

  /**
   * Sums the transformed chord lengths of the vertical curvature arc, sampled at
   * roughly one segment per five degrees, giving the banner's real V length as
   * the generated geometry would have it.
   */
  static #measureVerticalArc(transform, angle, halfAngle, scaleY, scaleZ)
  {
    const segments = 1 + Math.floor(angle / 5);
    const position = EveBannerSet.#aspectPosition;
    const previous = EveBannerSet.#aspectPreviousPosition;
    let length = 0;

    for (let index = 0; index <= segments; index++)
    {
      const value = index / segments;
      const sampleAngle = -halfAngle + value * 2 * halfAngle + Math.PI / 2;
      vec3.set(
        position,
        0,
        Math.cos(sampleAngle) * scaleY,
        (Math.sin(sampleAngle) - 1) * scaleZ
      );
      vec3.transformMat4(position, position, transform);
      if (index) length += vec3.distance(previous, position);
      vec3.copy(previous, position);
    }
    return length;
  }

  /**
   * Builds an EveBannerItem from a loose banner description, leaving the item's
   * own default in place for every field the source omits.
   */
  static #copyBanner(source)
  {
    const banner = new EveBannerItem();
    if (!source) return banner;
    banner.bone = Number(source.bone ?? -1) | 0;
    vec3.copy(banner.position, source.position ?? banner.position);
    quat.copy(banner.rotation, source.rotation ?? banner.rotation);
    vec3.copy(banner.scaling, source.scaling ?? banner.scaling);
    banner.angleX = Number(source.angleX ?? 0);
    banner.angleY = Number(source.angleY ?? 0);
    banner.reference = Number(source.reference ?? 0) | 0;
    return banner;
  }

}
