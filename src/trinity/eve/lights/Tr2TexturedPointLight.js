// Source: trinity/trinity/Lights/Tr2TexturedPointLight.h
// Source: trinity/trinity/Lights/Tr2TexturedPointLight.cpp
// Source: trinity/trinity/Lights/Tr2TexturedPointLight_Blue.cpp
// Flattened LightData surface (2026-07-23 decision): texturePath joins the
// flat fields inherited from Tr2PointLight, verified against
// lights/Tr2TexturedPointLight.json (tools-core schema build).
import { carbon, impl, io, type } from "#schema";
import { CjsResMan, ResourceRequirement } from "#resource";
const f32 = Math.fround;

/**
 * Carbon Color::Saturate (Color_inline.h:161): lerp from perceived-intensity
 * grey toward the colour by max(0, saturation) - a grey-to-colour blend, not
 * a clamp; saturation 1 is a plain copy. Lived in the archived literal math
 * port until 2026-09-08; this is its one consumer, so the body lives here.
 */
function saturateColor(out, a, saturation)
{
  const s = f32(saturation);
  if (s === 1)
  {
    out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
    return out;
  }

  const r = a[0], g = a[1], b = a[2], alpha = a[3];
  // Perceived intensity; the weights are Carbon's own eye-response constants.
  const i = f32(f32(f32(r * f32(0.299)) + f32(g * f32(0.587))) + f32(b * f32(0.114)));

  const t = Math.max(0, s);
  out[0] = i + f32(f32(r - i) * t);
  out[1] = i + f32(f32(g - i) * t);
  out[2] = i + f32(f32(b - i) * t);
  out[3] = alpha;
  return out;
}
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

  @io.read
  @type.objectRef("TriTextureRes")
  texture = null;

  /** m_lightData.texturePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  texturePath = "";

  @type.boolean
  isDynamic = true;

  @type.int32
  @type.enum("LIGHT_TYPE")
  type = Tr2Light.POINT_LIGHT;

  #saturation = 1;

  /** Carbon SetSaturation (cpp:37-40); consumed by Update below. */
  @carbon.method
  @impl.implemented
  SetSaturation(saturation)
  {
    this.#saturation = Number(saturation);
  }

  /**
   * Carbon Initialize (cpp:16-23): fetch the texture when a path is
   * authored, then the point-light base. The reach is the process-wide
   * manager read at call time (the BeResMan pattern, CjsResMan.GetGlobal);
   * with none installed a hand-composing caller assigns `texture` itself.
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
   * Carbon OnModified (cpp:42-49): a texturePath change refetches; the
   * settled-state notification compares against the resolved resource's
   * identity rather than Be::Var pointers.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("CjsModel notifications expose settled state rather than Be::Var identity; the path is refetched whenever notified, which is idempotent for an unchanged path via the manager cache.")
  OnModified()
  {
    this.SetTexturePath(this.texturePath);
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
    const resourceManager = CjsResMan.GetGlobal();
    if (!resourceManager || !path) return;
    this.texture = resourceManager.GetResource(path, {
      requirement: ResourceRequirement.TEXTURE
    });
  }

  /**
   * Carbon Update (cpp:51-56): the light colour becomes the texture's
   * average colour run through Carbon's Saturate - the grey-to-colour lerp
   * (Color_inline.h:161), not a clamp. The average is a resource
   * capability, read as a GetAverageColor duck exactly as EveBannerSet
   * does; a resource without it (or not yet loaded) leaves the colour
   * untouched, matching Carbon's null-texture early-out.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("TriTextureRes precomputes m_averageColor at bitmap load; the runtime resource exposes it as a GetAverageColor capability where an adapter provides one, so absence leaves the colour untouched exactly like Carbon's null texture.")
  Update()
  {
    const texture = this.texture;
    if (!texture || typeof texture.GetAverageColor !== "function") return;
    const average = texture.GetAverageColor();
    if (!average) return;
    saturateColor(this.color, average, this.#saturation);
  }
}
