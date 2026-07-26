import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsParameter } from './CjsParameter.js';

let _initProto, _initClass, _init_animation, _init_extra_animation, _init_channel, _init_extra_channel, _init_name, _init_extra_name;

/** Tr2TextureAnimationParameter (shader) - generated from schema shapeHash 609a4065.... */
let _Tr2TextureAnimationP;
class Tr2TextureAnimationParameter extends CjsParameter {
  static {
    ({
      e: [_init_animation, _init_extra_animation, _init_channel, _init_extra_channel, _init_name, _init_extra_name, _initProto],
      c: [_Tr2TextureAnimationP, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TextureAnimationParameter",
      family: "shader"
    })], [[[io, io.notify, io, io.persist, void 0, type.objectRef("Tr2TextureAnimation")], 16, "animation"], [[io, io.persist, type, type.string], 16, "channel"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyToResourceSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "ApplyUav"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnAddedToMaterial"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnRemovedFromMaterial"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetTexture"]], 0, void 0, CjsParameter));
  }
  /** m_animation (Tr2TextureAnimationPtr) [READWRITE, PERSIST, NOTIFY] */
  animation = (_initProto(this), _init_animation(this, null));

  /** m_channel (BlueSharedString) [READWRITE, PERSIST] */
  channel = (_init_extra_animation(this), _init_channel(this, ""));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_channel(this), _init_name(this, ""));
  resourceType = (_init_extra_name(this), 0);
  #materials = [];

  /** The shader resource name the animated texture binds to. */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: the animation object's identity (Carbon hashes its pointer). */
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL) {
    return CjsParameter.hashFnv1Identity(this.animation, startingHash);
  }

  /**
   * Marks every attached material's resource sets and constant buffers dirty
   * after the animation reference changed.
   */
  OnModified(_options = {}) {
    for (const material of this.#materials) {
      CjsParameter.markMaterialResourcesDirty(material);
    }
    return true;
  }

  /**
   * Caches the reflected resource type for this name when the shader exposes
   * one, and leaves the previous type in place otherwise; no GPU binding is
   * created.
   */
  RebuildEffectHandles(effectRes) {
    const resource = this.name ? CjsParameter.getEffectResource(effectRes, this.name) : null;
    if (resource) {
      this.resourceType = resource.type ?? this.resourceType;
    }
  }

  /**
   * Always false - populating a resource set is device work this package does
   * not do.
   */
  CopyToResourceSet() {
    return false;
  }

  /** Always false - UAV binding is left to the engine adapter. */
  ApplyUav() {
    return false;
  }

  /**
   * Registers a material to be dirtied when the animation changes; duplicates
   * are ignored.
   */
  OnAddedToMaterial(material) {
    if (!this.#materials.includes(material)) {
      this.#materials.push(material);
    }
  }

  /**
   * Drops a material from the tracked list, so later frame advances no longer
   * mark it dirty.
   */
  OnRemovedFromMaterial(material) {
    const index = this.#materials.indexOf(material);
    if (index >= 0) {
      this.#materials.splice(index, 1);
    }
  }

  /**
   * The animation's texture for this parameter's channel, or null when no
   * animation is attached.
   */
  GetTexture() {
    return this.animation?.GetTexture?.(this.channel) ?? this.animation?.getTexture?.(this.channel) ?? null;
  }
  static {
    _initClass();
  }
}

export { _Tr2TextureAnimationP as Tr2TextureAnimationParameter };
//# sourceMappingURL=Tr2TextureAnimationParameter.js.map
