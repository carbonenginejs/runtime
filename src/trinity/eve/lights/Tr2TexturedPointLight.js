// Source: trinity/trinity/Lights/Tr2TexturedPointLight.h
// Source: trinity/trinity/Lights/Tr2TexturedPointLight.cpp
// Source: trinity/trinity/Lights/Tr2TexturedPointLight_Blue.cpp
import { IsMatch, IInitialize, INotify } from "#blue";
// Flattened LightData surface (2026-07-23 decision): texturePath joins the
// flat fields inherited from Tr2PointLight, verified against
// lights/Tr2TexturedPointLight.json (tools-core schema build).
import { meta, type, blue } from "#schema";
import { ResourceRequirement } from "#resource";
import { be } from "#blue";
import { color } from "#math/color";
import { Tr2Light } from "./Tr2Light.js";
import { Tr2PointLight } from "./Tr2PointLight.js";


/**
 * Point light that projects a texture, adding the texture path and its resolved
 * resource to the point-light attribute set and updating dynamically.
 */
@blue.define("Tr2TexturedPointLight")
@blue.interface(Tr2Light, IInitialize, INotify)
export class Tr2TexturedPointLight extends Tr2PointLight
{
  static LightDataFields = [
    ...Tr2PointLight.LightDataFields,
    "texturePath"
  ];

  @blue.read
  @type.rootRef("TriTextureRes")
  texture = null;

  /** m_lightData.texturePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.wpath("TriTextureRes")
  texturePath = "";

  @type.boolean
  isDynamic = true;

  @type.int32
  @type.enum("trinity.Tr2Light.LIGHT_TYPE")
  type = Tr2Light.POINT_LIGHT;

  _saturation = 1;

  /** Carbon SetSaturation (cpp:37-40); consumed by Update below. */
  @blue.method
  @meta.implemented
  SetSaturation(saturation)
  {
    this._saturation = Number(saturation);
  }

  /**
   * Carbon Initialize (cpp:16-23): fetch the texture when a path is
   * authored, then the point-light base. The reach is the process-wide
   * manager read at call time, which is what BeResMan is (be.resMan).
   */
  @blue.method
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
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  SetTexturePath(path)
  {
    this.texture = null;
    if (!path) return;
    this.texture = be.resMan.GetResource(path, {
      requirement: ResourceRequirement.TEXTURE
    });
  }

  /**
   * Applies the texture's average colour with the configured saturation.
   * Carbon Update (Tr2TexturedPointLight.cpp:51-57); no texture leaves the colour unchanged.
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  Update()
  {
    if (!this.texture) return;
    color.saturate(this.color, this.texture.GetAverageColor(), this._saturation);
  }
}

