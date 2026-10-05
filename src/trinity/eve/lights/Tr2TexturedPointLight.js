// Source: trinity/trinity/Lights/Tr2TexturedPointLight.h
// Source: trinity/trinity/Lights/Tr2TexturedPointLight.cpp
// Source: trinity/trinity/Lights/Tr2TexturedPointLight_Blue.cpp
import { IsMatch, IInitialize, INotify } from "#blue";
// Flattened LightData surface (2026-07-23 decision): texturePath joins the
// flat fields inherited from Tr2PointLight, verified against
// lights/Tr2TexturedPointLight.json (tools-core schema build).
import { meta } from "#schema";
import { ResourceRequirement } from "#resource";
import { blue } from "#blue";
import { color } from "#math/color";
import { Tr2Light } from "./Tr2Light.js";
import { Tr2PointLight } from "./Tr2PointLight.js";


/**
 * Point light that projects a texture, adding the texture path and its resolved
 * resource to the point-light attribute set and updating dynamically.
 */
@meta.define({ className: "Tr2TexturedPointLight", family: "eve/lights" })
@meta.blue.interface(Tr2Light, IInitialize, INotify)
export class Tr2TexturedPointLight extends Tr2PointLight
{
  static LightDataFields = [
    ...Tr2PointLight.LightDataFields,
    "texturePath"
  ];

  @meta.blue.read
  @meta.type.objectRef("TriTextureRes")
  texture = null;

  /** m_lightData.texturePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path("TriTextureRes")
  texturePath = "";

  @meta.type.boolean
  isDynamic = true;

  @meta.type.int32
  @meta.type.enum("trinity.Tr2Light.LIGHT_TYPE")
  type = Tr2Light.POINT_LIGHT;

  _saturation = 1;

  /** Carbon SetSaturation (cpp:37-40); consumed by Update below. */
  @meta.blue.method
  @meta.implemented
  SetSaturation(saturation)
  {
    this._saturation = Number(saturation);
  }

  /**
   * Carbon Initialize (cpp:16-23): fetch the texture when a path is
   * authored, then the point-light base. The reach is the process-wide
   * manager read at call time, which is what BeResMan is (blue.resMan).
   */
  @meta.blue.method
  @meta.implemented
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
   *
   * Adapted: JS identifies Carbon's changed member address by its exposed property name.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "texturePath")) this.SetTexturePath(this.texturePath);
    return super.OnModified(propertyName);
  }

  /**
   * Carbon SetTexturePath (cpp:31-35): null the resource, then refetch.
   *
   * @param {string} path Texture resource path.
   */
  @meta.blue.method
  @meta.implemented
  SetTexturePath(path)
  {
    this.texture = null;
    if (!path) return;
    this.texture = blue.resMan.GetResource(path, {
      requirement: ResourceRequirement.TEXTURE
    });
  }

  /**
   * Applies the texture's average colour with the configured saturation.
   * Carbon Update (Tr2TexturedPointLight.cpp:51-57); no texture leaves the colour unchanged.
   *
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  Update()
  {
    if (!this.texture) return;
    color.saturate(this.color, this.texture.GetAverageColor(), this._saturation);
  }
}

