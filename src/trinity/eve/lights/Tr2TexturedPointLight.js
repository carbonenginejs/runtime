// Source: trinity/trinity/Lights/Tr2TexturedPointLight.h
// Source: trinity/trinity/Lights/Tr2TexturedPointLight.cpp
// Source: trinity/trinity/Lights/Tr2TexturedPointLight_Blue.cpp
import { IsMatch, IInitialize, INotify } from "#blue";
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
  @blue.read
  @type.rootRef("TriTextureRes")
  texture = null;

  // Carbon maps this row into the embedded LightData m_lightData
  // (Tr2Light.h:102), an attribute over that path; the point light's rows are
  // inherited (Tr2TexturedPointLight_Blue.cpp:17-37 repeats them).

  /** m_lightData.texturePath (std::wstring) [READWRITE, PERSIST, NOTIFY] (Tr2TexturedPointLight_Blue.cpp:33). */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.wpath("TriTextureRes")
  get texturePath()
  {
    return this._lightData.texturePath;
  }

  /** Writes m_lightData.texturePath. */
  set texturePath(value)
  {
    this._lightData.texturePath = value;
  }

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
    if (this._lightData.texturePath)
    {
      this.SetTexturePath(this._lightData.texturePath);
    }
    return super.Initialize();
  }

  /**
   * Carbon SetLightData (cpp:25-29): the point light's copy, then the texture
   * is refetched from the new data's path.
   * @param {LightData} lightData
   */
  @blue.method
  @meta.implemented
  SetLightData(lightData)
  {
    super.SetLightData(lightData);
    this.SetTexturePath(this._lightData.texturePath);
  }

  /**
   * Carbon OnModified (cpp:42–49): texture changes refetch, then forward base.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "texturePath")) this.SetTexturePath(this._lightData.texturePath);
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
    color.saturate(this._lightData.color, this.texture.GetAverageColor(), this._saturation);
  }
}

