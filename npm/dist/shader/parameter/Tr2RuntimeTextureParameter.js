import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsParameter } from './CjsParameter.js';

let _initProto, _initClass, _init_texture, _init_extra_texture, _init_name, _init_extra_name, _init_uavMipLevel, _init_extra_uavMipLevel;

/**
 * A named texture slot fed by a runtime-supplied texture provider rather than an
 * authored res path.
 */
let _Tr2RuntimeTexturePar;
class Tr2RuntimeTextureParameter extends CjsParameter {
  static {
    ({
      e: [_init_texture, _init_extra_texture, _init_name, _init_extra_name, _init_uavMipLevel, _init_extra_uavMipLevel, _initProto],
      c: [_Tr2RuntimeTexturePar, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RuntimeTextureParameter",
      family: "shader"
    })], [[[io, io.notify, io, io.persist, void 0, type.objectRef("ITr2TextureProvider")], 16, "texture"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.uint32], 16, "uavMipLevel"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Create"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTextureProvider"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTextureProvider"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetUavMipLevel"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnAddedToMaterial"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnRemovedFromMaterial"]], 0, void 0, CjsParameter));
  }
  texture = (_initProto(this), _init_texture(this, null));
  name = (_init_extra_texture(this), _init_name(this, ""));
  uavMipLevel = (_init_extra_name(this), _init_uavMipLevel(this, 0));
  #materials = (_init_extra_uavMipLevel(this), []);

  /**
   * Blue construction form: forwards the name, provider and UAV mip level to
   * Create.
   */
  __init__(name = "", texture = null, uavMipLevel = 0) {
    this.Create(name, texture, uavMipLevel);
  }

  /**
   * Assigns name, texture provider and UAV mip level together, notifying only
   * when at least one of them actually changed; returns whether it did.
   */
  Create(name, texture, uavMipLevel = 0) {
    const nextName = String(name);
    const nextMipLevel = uavMipLevel >>> 0;
    const changed = this.name !== nextName || this.texture !== texture || this.uavMipLevel !== nextMipLevel;
    if (!changed) {
      return false;
    }
    this.name = nextName;
    this.texture = texture;
    this.uavMipLevel = nextMipLevel;
    this.UpdateValues({
      property: "texture",
      source: this
    });
    return true;
  }

  /** The shader resource name this texture binds to. */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: the texture provider's identity (Carbon hashes its pointer). */
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL) {
    return CjsParameter.hashFnv1Identity(this.texture, startingHash);
  }

  /**
   * Invalidates the resource sets of every material this parameter is attached
   * to.
   */
  OnModified(_options = {}) {
    this.#invalidateResourceSets();
    return true;
  }

  /**
   * Deliberately does nothing: Carbon caches the effect resource type here for
   * later resource-set binding, which runtime-trinity leaves to engine adapters.
   */
  RebuildEffectHandles(_effectRes) {

    // Carbon caches the effect resource type here for later resource-set
    // binding. Runtime-trinity leaves that realization to engine adapters.
  }

  /**
   * Swaps the texture provider and notifies owners; returns false when it is
   * already the same object.
   */
  SetTextureProvider(texture) {
    if (this.texture === texture) {
      return false;
    }
    this.texture = texture;
    this.UpdateValues({
      property: "texture",
      source: this
    });
    return true;
  }

  /**
   * The attached provider, or null; this package holds the reference but never
   * resolves or uploads it.
   */
  GetTextureProvider() {
    return this.texture;
  }

  /**
   * Sets the mip level to use when this texture is bound as an unordered-access
   * view, coerced to uint32.
   */
  SetUavMipLevel(mipLevel) {
    this.uavMipLevel = mipLevel >>> 0;
  }

  /**
   * Registers a material to be invalidated when this parameter changes;
   * duplicates are ignored.
   */
  OnAddedToMaterial(material) {
    if (!this.#materials.includes(material)) {
      this.#materials.push(material);
    }
  }

  /**
   * Drops a material from the tracked list, so later texture swaps no longer
   * invalidate its resource sets.
   */
  OnRemovedFromMaterial(material) {
    const index = this.#materials.indexOf(material);
    if (index >= 0) {
      this.#materials.splice(index, 1);
    }
  }

  /** Invalidates the resource sets of every attached material. */
  #invalidateResourceSets() {
    for (const material of this.#materials) {
      material?.InvalidateResourceSets?.();
    }
  }
  static {
    _initClass();
  }
}

export { _Tr2RuntimeTexturePar as Tr2RuntimeTextureParameter };
//# sourceMappingURL=Tr2RuntimeTextureParameter.js.map
