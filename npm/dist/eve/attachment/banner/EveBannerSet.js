import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveBannerItem as _EveBannerItem } from './EveBannerItem.js';
import { EveBannerLight as _EveBannerLight } from './EveBannerLight.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { Saturate } from '../EveSpaceObjectAttachmentUtils.js';
import { Tr2Light as _Tr2Light } from '../../lights/Tr2Light.js';
import { FLOAT_MAX } from '../../../trinityCore/TriFrustum.js';
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from '../itemSetBounds.js';
import { MatrixCopyFrom3x4, CopyLightData, AsPerPointLightData, CreateLightRecord, CreateLightDataScratch } from '../../lights/lightConversion.js';

let _initProto, _initStatic, _initClass, _init_banners, _init_extra_banners, _init_name, _init_extra_name, _init_effect, _init_extra_effect, _init_isPickable, _init_extra_isPickable, _init_display, _init_extra_display, _init_key, _init_extra_key, _init_lights, _init_extra_lights, _init_primaryTextureParameter, _init_extra_primaryTextureParameter;
let _EveBannerSet;
new class extends _identity {
  static [class EveBannerSet extends _EveEntity {
    static {
      ({
        e: [_init_banners, _init_extra_banners, _init_name, _init_extra_name, _init_effect, _init_extra_effect, _init_isPickable, _init_extra_isPickable, _init_display, _init_extra_display, _init_key, _init_extra_key, _init_lights, _init_extra_lights, _init_primaryTextureParameter, _init_extra_primaryTextureParameter, _initProto, _initStatic],
        c: [_EveBannerSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveBannerSet",
        family: "eve/attachment/banners"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.list("EveBannerItem")], 16, "banners"], [[io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[io, io.persist, type, type.boolean], 16, "isPickable"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.persist, type, type.int32], 16, "key"], [[io, io.persist, void 0, type.list("EveBannerLight")], 16, "lights"], [[io, io.persist, void 0, type.objectRef("TriTextureParameter")], 16, "primaryTextureParameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAabb"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the m_maxBannerRadius member directly; JavaScript exposes it through an accessor.")], 18, "GetMaxBannerRadius"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the m_isVisible member directly; JavaScript exposes it through an accessor.")], 18, "GetVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2DebugRendererOptions is an engine-owned set; a Set (add) or an insert duck is accepted.")], 18, "GetDebugOptions"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("ITr2DebugRenderer2 and Tr2DebugObjectReference are engine-owned; the reference collapses to (owner, index) arguments and the Effect enum to its ordinal.")], 18, "RenderDebugInfo"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetReference"], [[carbon, carbon.method, impl, impl.implemented], 26, "GetBannerAspectRatio"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddBanner"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPickingID"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPrimaryTextureParameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLightFromSOF"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLights"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The texture average color is a resource capability - read as a GetAverageColor duck on the parameter's resource, zero when absent.")], 18, "GetAverageColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The texture average color and profile packing follow the adapted ducks above.")], 18, "GetLights"]], 0, void 0, _EveEntity));
      _initStatic(this);
    }
    banners = (_initProto(this), _init_banners(this, []));
    name = (_init_extra_banners(this), _init_name(this, ""));
    effect = (_init_extra_name(this), _init_effect(this, null));
    isPickable = (_init_extra_effect(this), _init_isPickable(this, false));
    display = (_init_extra_isPickable(this), _init_display(this, true));
    key = (_init_extra_display(this), _init_key(this, 0));
    lights = (_init_extra_key(this), _init_lights(this, []));

    // SOF-authored primary banner texture parameter; persisted so the values
    // interchange reproduces Carbon's hidden banner binding.
    primaryTextureParameter = (_init_extra_lights(this), _init_primaryTextureParameter(this, null));
    #rebuildRevision = (_init_extra_primaryTextureParameter(this), 0);

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
    Rebuild() {
      // Physical geometry, buffers and batches are backend work; the bounds are
      // not. Carbon rebuilds both together (cpp:397-431).
      this.#rebuildRevision++;
      this.__state.rebuild.add("packedGeometry");
      box3.empty(this.#staticBounds);
      this.#boneBounds.length = 0;
      this.#maxBannerRadius = 0;

      // Carbon bails before building ANY bounds when the set has no effect
      // (cpp:406-409) - an effectless banner set is invisible, not unbounded.
      if (!this.effect) {
        return;
      }

      // Carbon inlines the shared grouping here, and never gates it on a skinned
      // flag: any banner with a bone of its own gets its own box (cpp:424).
      CreateItemSetBoundingBoxes(this.#staticBounds, this.#boneBounds, true, this.banners);
      for (const banner of this.banners) {
        banner.GetBounds(_EveBannerSet.#bannerScratch);
        this.#maxBannerRadius = Math.max(this.#maxBannerRadius, box3.radius(_EveBannerSet.#bannerScratch));
      }
    }

    /** Carbon EveBannerSet::GetAabb (cpp:392-395): the item-set bounds. The bone
     * count is forwarded ungated - a banner set has no skinned flag. */
    GetAabb(out, bones = null, boneCount = 0) {
      return GetItemSetAabb(out, this.#staticBounds, this.#boneBounds, bones, boneCount);
    }

    /** The largest single banner half-diagonal, as measured by the last Rebuild. */
    GetMaxBannerRadius() {
      return this.#maxBannerRadius;
    }

    /** The result of the last UpdateVisibility (Carbon m_isVisible). */
    GetVisibility() {
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
    UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0) {
      const aabb = this.GetAabb(_EveBannerSet.#aabbScratch, bones, boneCount);
      if (box3.isEmpty(aabb)) {
        this.#isVisible = false;
        return false;
      }
      box3.transformMat4(aabb, aabb, parentTransform);
      const frustum = updateContext?.GetFrustum?.() ?? null;
      this.#isVisible = !!frustum?.IsBoxVisible(aabb);
      let isLoddedOut = true;
      let screenSize = FLOAT_MAX;
      if (frustum) {
        // Carbon BoundingSphereFromBox: the box centre with half its full
        // diagonal. The centre is written into the sphere in place, so the radius
        // is assigned after - never inside a sph3.set that would clear it.
        const sphere = _EveBannerSet.#sphereScratch;
        sphere[3] = box3.toPositionRadius(aabb, sph3.$position(sphere));
        if (sph3.containsPoint(sphere, frustum.viewPos)) {
          isLoddedOut = false;
        } else {
          // The point on the set sphere nearest the camera, given the largest
          // single banner as the thing being measured.
          const closest = vec3.subtract(_EveBannerSet.#closestScratch, frustum.viewPos, sph3.$position(sphere));
          vec3.normalize(closest, closest);
          vec3.scaleAndAdd(closest, sph3.$position(sphere), closest, sph3.radius(sphere));
          const element = sph3.fromPositionRadius(_EveBannerSet.#elementScratch, closest, this.#maxBannerRadius);
          screenSize = frustum.GetPixelSizeAccrossEst(element);
          if (screenSize > (updateContext.GetVisibilityThreshold?.() ?? 0) * 0.5) {
            isLoddedOut = false;
          }
        }
      }
      this.effect?.UsedWithScreenSize?.(screenSize, this.#maxBannerRadius, _EveBannerSet.#uvDensities);
      if (isLoddedOut) {
        this.#isVisible = false;
      }
      return this.#isVisible;
    }

    /** Carbon EveBannerSet::GetDebugOptions (cpp:219-224). */
    GetDebugOptions(options = new Set()) {
      for (const option of _EveBannerSet.DebugOptions) {
        if (options?.add) options.add(option);else options?.insert?.(option);
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
    RenderDebugInfo(renderer, parentTransform, bones = null, boneCount = 0) {
      if (!renderer) return false;
      if (renderer.HasOption?.(this, "Banner Sets")) {
        const transform = _EveBannerSet.#debugTransform;
        for (let index = 0; index < this.banners.length; index++) {
          const banner = this.banners[index];
          mat4.fromRotationTranslationScale(transform, banner.rotation, banner.position, banner.scaling);
          let color = _EveBannerSet.#debugBannerColor;
          if (banner.bone >= 0) {
            if (bones && banner.bone < boneCount) {
              MatrixCopyFrom3x4(_EveBannerSet.#debugBone, bones, banner.bone);
              // Carbon (row-vector): t * boneTF - the banner applies first.
              mat4.multiply(transform, _EveBannerSet.#debugBone, transform);
            } else {
              color = _EveBannerSet.#debugMissingBoneColor;
            }
          }
          mat4.multiply(transform, parentTransform, transform);
          renderer.DrawBox?.(this, index, transform, _EveBannerSet.#debugBoxMin, _EveBannerSet.#debugBoxMax, _EveBannerSet.DebugEffect.Wireframe, color);
          renderer.DrawBox?.(this, index, transform, _EveBannerSet.#debugBoxMin, _EveBannerSet.#debugBoxMax, _EveBannerSet.DebugEffect.Solid, 0);
        }
      }
      if (renderer.HasOption?.(this, "Banner Sets Bounds")) {
        const aabb = this.GetAabb(_EveBannerSet.#debugBounds, bones, boneCount);
        renderer.DrawBox?.(this, -1, parentTransform, box3.$min(aabb), box3.$max(aabb), _EveBannerSet.DebugEffect.Wireframe, 0xff00ff00);
      }
      if (renderer.HasOption?.(this, "Banner Sets Lights")) {
        const color = _EveBannerSet.#debugLightColor;
        for (const light of this.lights) {
          const transform = mat4.fromTranslation(_EveBannerSet.#debugTransform, light.lightData.position);
          // Carbon (row-vector): TranslationMatrix(position) * boneMatrix.
          mat4.multiply(transform, light.boneMatrix, transform);
          if (this.primaryTextureParameter) {
            this.GetAverageColor(color);
          } else {
            Saturate(color, light.lightData.color, light.saturation);
          }
          color[3] = 0.5;
          renderer.DrawSphere?.(this, light.index, transform, light.lightData.innerRadius, 10, _EveBannerSet.DebugEffect.Solid, color);
          color[3] = 0.3;
          renderer.DrawSphere?.(this, light.index, transform, light.lightData.radius, 10, _EveBannerSet.DebugEffect.Solid, color);
        }
      }
      return true;
    }
    GetReference(index) {
      return this.banners[index].reference;
    }

    /** Measures the generated banner surface exactly as Carbon does: flat
     * banners use authored X/Y scale, while curved banners sum the same
     * approximately five-degree transformed arc chords used by geometry
     * generation. */
    static GetBannerAspectRatio(banner) {
      const flatX = banner.angleX <= 0;
      const flatY = banner.angleY <= 0;
      if (flatX && flatY) {
        return banner.scaling[0] / banner.scaling[1];
      }
      const transform = mat4.fromRotationTranslationScale(_EveBannerSet.#aspectTransform, banner.rotation, banner.position, banner.scaling);
      if (flatX) {
        const angleY = _EveBannerSet.#clampBannerAngle(banner.angleY);
        const halfAngleY = angleY / 180 * Math.PI / 2;
        const scaleY = 0.5 / Math.sin(halfAngleY);
        const vLength = _EveBannerSet.#measureVerticalArc(transform, angleY, halfAngleY, scaleY, scaleY);
        return banner.scaling[0] / vLength;
      }
      if (flatY) {
        const angleX = _EveBannerSet.#clampBannerAngle(banner.angleX);
        const halfAngleX = angleX / 180 * Math.PI / 2;
        const scaleX = 0.5 / Math.sin(halfAngleX);
        const uLength = _EveBannerSet.#measureHorizontalArc(transform, angleX, halfAngleX, scaleX, scaleX);
        return uLength / banner.scaling[1];
      }
      const angleX = _EveBannerSet.#clampBannerAngle(banner.angleX);
      const angleY = _EveBannerSet.#clampBannerAngle(banner.angleY);
      const halfAngleX = angleX / 180 * Math.PI / 2;
      const halfAngleY = angleY / 180 * Math.PI / 2;
      const scaleX = 0.5 / Math.sin(halfAngleX);
      const scaleY = 0.5 / Math.sin(halfAngleY);
      const scaleZ = Math.min(scaleX, scaleY);
      const uLength = _EveBannerSet.#measureHorizontalArc(transform, angleX, halfAngleX, scaleX, scaleZ);
      const vLength = _EveBannerSet.#measureVerticalArc(transform, angleY, halfAngleY, scaleY, scaleZ);
      return uLength / vLength;
    }
    Initialize() {
      this.Rebuild();
      return true;
    }
    AddBanner(banner) {
      const copy = _EveBannerSet.#copyBanner(banner);
      this.banners.push(copy);
      return copy;
    }
    SetEffect(effect) {
      this.effect = effect ?? null;
    }
    SetKey(key) {
      this.key = Number(key) | 0;
    }
    GetPickingID() {
      return 101 + this.key >>> 0;
    }
    SetShaderOption(name, value) {
      if (this.effect && typeof this.effect.SetOption === "function") {
        this.effect.SetOption(name, value);
      }
    }
    SetPrimaryTextureParameter(parameter) {
      this.primaryTextureParameter = parameter ?? null;
    }
    AddLightFromSOF(light) {
      this.lights.push(_EveBannerLight.FromSOF(light));
    }

    /** Carbon EveBannerSet::RegisterComponents (cpp:457-464): LightOwner
     * UNCONDITIONAL (no lights-empty check, unlike the other packed sets -
     * GetLights self-gates on display/lights instead, cpp:468). */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }

    /** Carbon EveBannerSet::UpdateLights (cpp:164-183): the shared packed-set
     * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
     * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
     * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
     * the activation strength (boosterGain unused by banners). */
    UpdateLights(parentTransform, bones, boneCount, activationStrength, _boosterGain = 0) {
      for (const light of this.lights) {
        const boneIndex = light.lightData.boneIndex;
        if (bones && boneIndex > 0 && boneIndex < boneCount) {
          MatrixCopyFrom3x4(light.boneMatrix, bones, boneIndex);
          light.boneMatrix[3] = 0;
          light.boneMatrix[7] = 0;
          light.boneMatrix[11] = 0;
          light.boneMatrix[15] = 1;
          // Carbon (row-vector): boneMatrix * parentTransform - bone first.
          mat4.multiply(light.boneMatrix, parentTransform, light.boneMatrix);
        } else {
          mat4.copy(light.boneMatrix, parentTransform);
        }
      }
      this.#activationStrength = Number(activationStrength) || 0;
    }

    /** Carbon EveBannerSet::GetAverageColor (cpp:441-455): the PRIMARY texture
     * parameter's average color, (0,0,0,0) when the map or resource is
     * missing (contrast EvePlaneSet's white default and four-map product). */
    GetAverageColor(out = new Float32Array(4)) {
      const average = this.primaryTextureParameter?.GetResource?.()?.GetAverageColor?.();
      if (average) {
        out[0] = average[0];
        out[1] = average[1];
        out[2] = average[2];
        out[3] = average[3];
      } else {
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
    GetLights(lightManager) {
      if (!this.display || this.lights.length === 0) {
        return;
      }
      const averageColor = _EveBannerSet.#averageColorScratch;
      this.GetAverageColor(averageColor);
      if (averageColor[3] === 0) {
        return;
      }
      const features = _EveBannerSet.#features;
      features.parentBrightness = this.#activationStrength;
      features.parentScale = 1;
      const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
      const record = _EveBannerSet.#lightRecord;
      const dataCopy = _EveBannerSet.#lightDataScratch;
      for (const light of this.lights) {
        CopyLightData(dataCopy, light.lightData);
        Saturate(dataCopy.color, averageColor, light.saturation);
        AsPerPointLightData(record, dataCopy, light.boneMatrix, features, quality);
        record.lightType = _Tr2Light.POINT_LIGHT;
        record.lightData = light.lightData;
        record.lightProfile = light.lightProfile;
        record.owner = this;
        lightManager?.AddLight?.(record);
      }
    }

    /** Carbon ITr2DebugRenderer2::Effect (Include/ITr2DebugRenderer2.h:134-139). */

    /** The option names this set publishes (cpp:221-223). */

    /** Per-frame scratch - UpdateVisibility must not allocate. */

    /** Carbon passes a single 1.0 density (cpp:154) - a banner is one flat quad. */
  }];
  DebugEffect = Object.freeze({
    Wireframe: 0,
    Solid: 1,
    Lit: 2
  });
  DebugOptions = Object.freeze(["Banner Sets", "Banner Sets Bounds", "Banner Sets Lights"]);
  #debugTransform = mat4.create();
  #debugBone = mat4.create();
  #debugBounds = box3.create();
  #debugLightColor = new Float32Array(4);
  #debugBoxMin = Object.freeze([-0.5, -0.5, -5e-3]);
  #debugBoxMax = Object.freeze([0.5, 0.5, 0.005]);
  #debugBannerColor = Object.freeze([0.1, 0.1, 0.7, 0.5]);
  #debugMissingBoneColor = Object.freeze([0.7, 0.1, 0.1, 0.5]);
  #aabbScratch = box3.create();
  #sphereScratch = sph3.create();
  #elementScratch = sph3.create();
  #closestScratch = vec3.create();
  #bannerScratch = box3.create();
  #uvDensities = Object.freeze([1]);
  #features = {
    parentBrightness: 0,
    parentScale: 1
  };
  #lightRecord = CreateLightRecord();
  #lightDataScratch = CreateLightDataScratch();
  #averageColorScratch = new Float32Array(4);
  #aspectTransform = mat4.create();
  #aspectPosition = vec3.create();
  #aspectPreviousPosition = vec3.create();
  #clampBannerAngle(angle) {
    return Math.max(0, Math.min(Number(angle), 180));
  }
  #measureHorizontalArc(transform, angle, halfAngle, scaleX, scaleZ) {
    const segments = 1 + Math.floor(angle / 5);
    const position = _EveBannerSet.#aspectPosition;
    const previous = _EveBannerSet.#aspectPreviousPosition;
    let length = 0;
    for (let index = 0; index <= segments; index++) {
      const value = index / segments;
      const sampleAngle = -halfAngle + value * 2 * halfAngle;
      vec3.set(position, Math.sin(sampleAngle) * scaleX, 0, (Math.cos(sampleAngle) - 1) * scaleZ);
      vec3.transformMat4(position, position, transform);
      if (index) length += vec3.distance(previous, position);
      vec3.copy(previous, position);
    }
    return length;
  }
  #measureVerticalArc(transform, angle, halfAngle, scaleY, scaleZ) {
    const segments = 1 + Math.floor(angle / 5);
    const position = _EveBannerSet.#aspectPosition;
    const previous = _EveBannerSet.#aspectPreviousPosition;
    let length = 0;
    for (let index = 0; index <= segments; index++) {
      const value = index / segments;
      const sampleAngle = -halfAngle + value * 2 * halfAngle + Math.PI / 2;
      vec3.set(position, 0, Math.cos(sampleAngle) * scaleY, (Math.sin(sampleAngle) - 1) * scaleZ);
      vec3.transformMat4(position, position, transform);
      if (index) length += vec3.distance(previous, position);
      vec3.copy(previous, position);
    }
    return length;
  }
  #copyBanner(source) {
    const banner = new _EveBannerItem();
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
  constructor() {
    super(_EveBannerSet), _initClass();
  }
}();

export { _EveBannerSet as EveBannerSet };
//# sourceMappingURL=EveBannerSet.js.map
