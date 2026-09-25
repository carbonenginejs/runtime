// Not Carbon: the texture-array bridge is ours, registered in
// /docs/architecture/non-carbon-extensions.md with `dynamic:/texturearray`.
//
// WebGL2 has sixteen texture units, so a browser container merges a family of
// maps (Detail1Map..Detail3Map) into one texture at the register of the first,
// and the pass records the members (`Tr2EffectResource.arrayLayers`). The
// effect keeps its named parameters - SOF and skins set them by name - and this
// stands in the merged register's slot: it reads the members' current paths
// and binds the one texture made from them.
import { Tr2ColorSpace } from "#consts/render-context";
import { ResourceRequirement, TextureArrayPrefix, TexturePackPrefix } from "#resource";
import { blue } from "#blue";
import { ResourceFlags } from "./ITr2EffectValue.js";
import { RealizeTexture } from "../../core/Tr2ImageIOHelpers.js";

/** Binds one merged register from its member texture parameters, named in layer order. */
export class CjsTextureArrayBridge
{
  _effect;

  _members;

  _prefix;

  _path = null;

  _resource = null;

  /**
   * @param {object} effect The effect whose named parameters are the members.
   * @param {string[]} members Member parameter names, layer (or channel) 0 first.
   * @param {boolean} packed Whether the members are channels of one 2D texture.
   */
  constructor(effect, members, packed)
  {
    this._effect = effect;
    this._members = members;
    this._prefix = packed ? TexturePackPrefix : TextureArrayPrefix;
  }

  /**
   * The merged texture's path from the members' current paths, or null while
   * any member has none: a merge of fewer maps than the shader samples is a
   * different texture, not a smaller one.
   *
   * @returns {string|null} A `dynamic:/texturearray/` or `dynamic:/texturepack/` path.
   */
  GetResourcePath()
  {
    const paths = [];

    for (const name of this._members)
    {
      const path = this._effect.GetResourceByName(name)?.resourcePath;
      if (!path) return null;
      paths.push(path);
    }

    return this._prefix + paths.join(";");
  }

  /**
   * The merged texture resource. Re-resolved when a member's path changed: a
   * different string is a different cached texture, and nothing is mutated.
   *
   * @returns {object|null} The resource, or null while a member has no path.
   */
  GetResource()
  {
    const path = this.GetResourcePath();

    if (path !== this._path)
    {
      this._path = path;
      this._resource = path ? blue.resMan.GetResource(path, { requirement: ResourceRequirement.TEXTURE }) : null;
      if (this._resource && !this._resource.HasCompleted())
      {
        this._resource.OnCompleted(() => this._effect.ResourceChanged(), this);
      }
    }

    return this._resource;
  }

  /**
   * Binds the merged texture as `TriTextureParameter.CopyToResourceSet` binds
   * its own: the realized texture, else the unprepared resource, which a
   * backend treats as Carbon's fallback (its per-dimension dummy), with no
   * stand-in resource. The effect's resource sets rebuild when it completes.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The merged register.
   * @param {number} [flags] A `ResourceFlags` word; bit 0 is sRGB.
   * @param {object|null} [renderContext] The context the texture is made through.
   * @returns {boolean} Whether the slot took the binding.
   */
  CopyToResourceSet(resourceDesc, stage, registerIndex, flags = 0, renderContext = null)
  {
    const colorSpace = (flags & ResourceFlags.RESOURCE_FLAG_SRGB)
      ? Tr2ColorSpace.COLOR_SPACE_SRGB
      : Tr2ColorSpace.COLOR_SPACE_LINEAR;
    const resource = this.GetResource();
    const texture = resource ? RealizeTexture(resource, renderContext) : null;

    return resourceDesc.SetSrv(stage, registerIndex, texture ?? resource, colorSpace);
  }
}
