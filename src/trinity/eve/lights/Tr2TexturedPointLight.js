import { IInitialize, INotify } from "#blue";
﻿// Source: trinity/trinity/Lights/Tr2TexturedPointLight.h
// Source: trinity/trinity/Lights/Tr2TexturedPointLight.cpp
// Source: trinity/trinity/Lights/Tr2TexturedPointLight_Blue.cpp
// Flattened LightData surface (2026-07-23 decision): texturePath joins the
// flat fields inherited from Tr2PointLight, verified against
// lights/Tr2TexturedPointLight.json (tools-core schema build).
import { carbon, impl, edit, type } from "#schema";
import { ResourceRequirement } from "#resource";
import { blue } from "#blue";
import { color } from "#math/color";
import { Tr2Light } from "./Tr2Light.js";
import { Tr2PointLight } from "./Tr2PointLight.js";


/**
 * Point light that projects a texture, adding the texture path and its resolved
 * resource to the point-light attribute set and updating dynamically.
 */
@type.define({ className: "Tr2TexturedPointLight", family: "eve/lights" })
export class Tr2TexturedPointLight extends Tr2PointLight
{
  static LightDataFields = [
    ...Tr2PointLight.LightDataFields,
    "texturePath"
  ];

  @edit.read
  @type.objectRef("TriTextureRes")
  texture = null;

  /** m_lightData.texturePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  texturePath = "";

  @type.boolean
  isDynamic = true;

  @type.int32
  @type.enum("trinity.Tr2Light.LIGHT_TYPE")
  type = Tr2Light.POINT_LIGHT;

  _saturation = 1;

  /** Carbon SetSaturation (cpp:37-40); consumed by Update below. */
  @carbon.method
  @impl.implemented
  SetSaturation(saturation)
  {
    this._saturation = Number(saturation);
  }

  /**
   * Carbon Initialize (cpp:16-23): fetch the texture when a path is
   * authored, then the point-light base. The reach is the process-wide
   * manager read at call time, which is what BeResMan is (blue.resMan).
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (this.texturePath)
    {
      this.SetTexturePath(this.texturePath);
    }
    return super.Initialize();
  }

  /**
   * Carbon OnModified (cpp:42–49): texture changes refetch, then forward base.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("JS identifies Carbon's changed member address by its exposed property name.")
  OnModified(propertyName)
  {
    if (propertyName === "texturePath") this.SetTexturePath(this.texturePath);
    return super.OnModified(propertyName);
  }

  /**
   * Carbon SetTexturePath (cpp:31-35): null the resource, then refetch.
   *
   * @param {string} path Texture resource path.
   */
  @carbon.method
  @impl.implemented
  SetTexturePath(path)
  {
    this.texture = null;
    if (!path) return;
    this.texture = blue.resMan.GetResource(path, {
      requirement: ResourceRequirement.TEXTURE
    });
  }

  /**
   * Carbon Update (cpp:51-56): the light colour becomes the texture's
   * average colour run through Carbon's Saturate - the grey-to-colour lerp
   * (Color_inline.h:161), not a clamp. TriTextureRes caches the average when
   * its image loads; without a texture the colour is left as it is.
   */
  @carbon.method
  Update()
  {
    if (!this.texture) return;
    color.saturate(this.color, this.texture.GetAverageColor(), this._saturation);
  }
}

carbon.interfaceTable({ interfaces: [Tr2TexturedPointLight, Tr2Light, IInitialize, INotify], chainTo: null })(Tr2TexturedPointLight, { kind: "class" });
