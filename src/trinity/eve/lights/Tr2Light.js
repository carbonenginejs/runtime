// Source: trinity/trinity/Lights/Tr2Light.h
// Source: trinity/trinity/Lights/Tr2Light.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { ResourceRequirement } from "#resource";
import { IsMatch, be, IInitialize, INotify } from "#blue";
import { PerLightShadowSetting } from "../../generated/eve/lights/enums.js";
import { CjsLightData, createCjsLightDataView } from "./CjsLightData.js";
import { Tr2LightManager } from "../../core/lighting/Tr2LightManager.js";
import { CreateLightRecord, MatrixCopyFrom3x4 } from "./lightConversion.js";
import { LightFeatures } from "./LightFeatures.js";


/**
 * Base scene light: holds the authored light attributes, resolves its bone
 * transform, and submits a converted point or spot record to the light manager
 * each frame.
 */
@blue.define({ className: "Tr2Light", abstract: true })
@blue.inherit(IInitialize, INotify)
@blue.interface()
export class Tr2Light
{
  static LightDataFields = [];

  static LightType = {
    UNDEFINED_LIGHT: 0,
    POINT_LIGHT: 1,
    SPOT_LIGHT: 2,
    COUNT: 3
  };

  static UNDEFINED_LIGHT = 0;
  static POINT_LIGHT = 1;
  static SPOT_LIGHT = 2;
  static COUNT = 3;

  @meta.readwrite
  @meta.persist
  @type.string
  name = "";

  @type.float64
  startTime = 0;

  @type.boolean
  isDynamic = false;

  @type.float32
  brightnessMultiplier = 1;

  @type.mat4
  boneTransform = mat4.create();

  // Every subclass exposes it Be::READ (Tr2PointLight_Blue.cpp:44 and siblings).
  @meta.read
  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  @meta.notify
  @meta.readwrite
  @meta.persist
  @type.wpath("Tr2LightProfileRes")
  lightProfilePath = "";

  @type.int32
  @type.enum("trinity.Tr2Light.LIGHT_TYPE")
  type = Tr2Light.UNDEFINED_LIGHT;

  // Compat view over the flattened light fields (2026-07-23 flatten
  // decision): the flat decorated fields on the concrete light classes are
  // the real storage; this keeps Carbon's GetLightData() reference surface.
  _lightDataView = null;

  /**
   * Captures the construction frame in Blue ticks.
   * Source: trinity/trinity/Lights/Tr2Light.cpp:89.
   */
  constructor()
  {
    this.startTime = be.os.GetCurrentFrameTime();
  }

  /**
   * Compat LightData view over the concrete light's flattened fields, built on
   * first access and redirecting both reads and writes back to this object.
   */
  get lightData()
  {
    this._lightDataView ??= createCjsLightDataView(this, this.constructor.LightDataFields);
    return this._lightDataView;
  }

  /**
   * Carbon's SetLightData (Tr2Light.cpp:93-96): copies a whole LightData. A
   * field the given record lacks takes LightData's default, as every field of
   * a C++ struct is always present.
   *
   * Adapted: the light keeps some LightData fields flattened onto itself
   * (`LightDataFields`); those are written to the light, the rest to its
   * LightData view, whose fields are Carbon's `m_lightData` storage.
   *
   * @param {CjsLightData|object} lightData The light data to copy.
   */
  @blue.method
  @meta.adapted
  SetLightData(lightData)
  {
    const defaults = new CjsLightData();
    for (const name of Object.keys(defaults))
    {
      this._CopyLightDataField(name, Object.hasOwn(lightData, name) ? lightData[name] : defaults[name]);
    }
  }

  /**
   * Writes one LightData field where this light stores it: flattened on the
   * light, or on its LightData view. Vectors are copied into existing storage.
   *
   * @param {string} name The LightData field.
   * @param {*} value The value to copy.
   */
  _CopyLightDataField(name, value)
  {
    const target = this.constructor.LightDataFields.includes(name) ? this : this.lightData;
    const current = target[name];
    if (ArrayBuffer.isView(current) && current.length === value.length) current.set(value);
    else target[name] = ArrayBuffer.isView(value) ? value.slice() : value;
  }

  /**
   * Sets the parent brightness factor, which scales the authored brightness only
   * when the light record is built for submission.
   */
  @blue.method
  @meta.implemented
  SetBrightnessMultiplier(multiplier)
  {
    this.brightnessMultiplier = Number(multiplier);
  }

  /**
   * Carbon's ChangeLightColor (Tr2Light.cpp:114-117): assigns the LightData colour.
   *
   * @param {Float32Array|number[]} color The new colour.
   */
  @blue.method
  @meta.implemented
  ChangeLightColor(color)
  {
    this._CopyLightDataField("color", color);
  }

  /**
   * Returns the live LightData view, which aliases this light's fields instead
   * of copying them.
   *
   * Adapted: Carbon returns its stored `m_lightData` (Tr2Light.h:102). Carbon's
   * exposure already dissolves that struct into flat attributes on the light
   * (Tr2PointLight_Blue.cpp:18-34), so here the flat fields are the storage and
   * this view stands in for the struct. The flattening applies only to a light's
   * one-to-one LightData; attachment lights keep theirs nested.
   */
  @blue.method
  @meta.adapted
  GetLightData()
  {
    return this.lightData;
  }

  /**
   * Returns the parent brightness factor applied at submission time, not the
   * authored brightness.
   */
  @blue.method
  @meta.implemented
  GetBrightnessMultiplier()
  {
    return this.brightnessMultiplier;
  }

  /** Carbon Tr2Light::SetBoneMatrix (Tr2Light.cpp:98-106): only when
   * 0 <= boneIndex < boneCount (note >= 0, unlike the packed sets' > 0 -
   * bone 0 CAN drive a Tr2Light) - the Float4x3 bone is unpacked over an
   * identity (column-stride, MatrixUtils.cpp:81-96). QUIRK: on a non-match
   * the previous boneTransform STAYS (sticky, identity initially) - it is
   * not reset per call. `bones` is a flat Float32Array, stride 12. */
  @blue.method
  @meta.implemented
  SetBoneMatrix(bones, boneCount)
  {
    const boneIndex = this.lightData.boneIndex ?? -1;
    if (bones && boneIndex >= 0 && boneIndex < boneCount)
    {
      mat4.identity(this.boneTransform);
      MatrixCopyFrom3x4(this.boneTransform, bones, boneIndex);
    }
  }

  /** Carbon Tr2Light::AddLight (Tr2Light.cpp:119-149): dynamic update hook,
   * the ONLY entity-side flag validity check in the light family
   * (AreLightFlagsValid, cpp:126-129), the bone refresh, then
   * lightTransform = boneTransform * transform - Carbon row-vector, bone
   * first, so the gl-matrix operands SWAP (cpp:132) - and the point/spot
   * conversion submitted to the light manager. QUIRKS: UNDEFINED_LIGHT
   * submits NOTHING (a deserialized base light is silently inert); Carbon's
   * profileIndex here is GetTextureIndex() + 1 while the packed sets use no
   * +1 - moot in JS (the profile rides the record by reference) but
   * recorded. The record is scratch; the manager must copy. */
  /**
   * Refreshes whatever this light derives from its own state each frame.
   *
   * EMPTY IN CARBON (`Tr2Light.cpp:201-203`), and ported anyway. It was
   * missing entirely, so `AddLight` below called `this.Update?.()` - hedging a
   * call to its own class's method. Behaviour is identical either way, since
   * both do nothing; what the declaration buys is a subclass having something
   * to override, which is the whole point of the virtual.
   *
   * ONE SUBCLASS OVERRIDE IS STILL MISSING, and it is not empty:
   * `Tr2TexturedPointLight::Update` (`cpp:51-58`) sets the light colour to the
   * projected texture's average colour, saturated. Our Tr2TexturedPointLight
   * has no Update at all, and its own comment records the symptom - the
   * saturation it stores "is not read anywhere else in the port yet". It
   * cannot be ported until `TriTextureRes.GetAverageColor` is, which Carbon
   * declares and we do not. Registered rather than guessed at.
   */
  @blue.method
  @meta.noop
  Update()
  {
  }

  /**
   * Updates dynamic light data and submits a transformed point or spot light
   * when its flags are valid.
   *
   * Adapted: The profile-index flag packing and half-float narrowing are renderer-backend
   * concerns (record carries the profile by reference); the Perlin brightness flicker awaits
   * the frame-clock seam (see lightConversion.js).
   */
  @meta.adapted
  @blue.method
  AddLight(lightManager, transform, scale, bones = null, boneCount = 0)
  {
    if (this.isDynamic)
    {
      this.Update();
    }
    if (!Tr2LightManager.areLightFlagsValid(this.lightData.flags ?? 0))
    {
      return;
    }

    this.SetBoneMatrix(bones, boneCount);
    // Carbon (row-vector): m_boneTransform * transform - bone first.
    mat4.multiply(Tr2Light._lightTransformScratch, transform, this.boneTransform);

    const features = Tr2Light._featuresScratch;
    features.parentBrightness = this.brightnessMultiplier;
    features.parentScale = scale;

    const record = Tr2Light._lightRecord;
    if (this.type === Tr2Light.POINT_LIGHT)
    {
      this.lightData.AsPerPointLightData(Tr2Light._lightTransformScratch, features,
        lightManager.GetCurrentSpaceSceneShadowQuality(), record);
    }
    else if (this.type === Tr2Light.SPOT_LIGHT)
    {
      this.lightData.AsPerSpotLightData(Tr2Light._lightTransformScratch, features,
        lightManager.GetCurrentSpaceSceneShadowQuality(), record);
    }
    else
    {
      return;
    }
    record.lightType = this.type;
    record.lightData = this.lightData;
    record.lightProfile = this.lightProfile;
    record.owner = this;
    lightManager?.AddLight(record);
  }

  /**
   * Carbon Tr2Light::GetLight (Tr2Light.cpp:152-163): position and radius
   * straight from the light data, color = authored rgb * brightness. Carbon's
   * three reference out-params become one out record (JS out-params go last
   * and are returned). The color is the rgb triple - the alpha channel is
   * unused by every Carbon consumer of this method (EveChildCloud2's light
   * block takes GetXYZ).
   *
   * Adapted: The Perlin noise flicker (cpp:157-161) reads the global frame clock (BeOS
   * GetCurrentFrameTime) - an engine seam; the base brightness is used until it lands.
   */
  @blue.method
  @meta.adapted
  GetLight(out = { position: vec3.create(), radius: 0, color: vec3.create() })
  {
    const lightData = this.lightData;
    const position = lightData.position;
    if (position)
    {
      vec3.copy(out.position, position);
    }
    out.radius = lightData.radius ?? 0;
    const brightness = lightData.brightness ?? 0;
    const color = lightData.color;
    out.color[0] = (color?.[0] ?? 0) * brightness;
    out.color[1] = (color?.[1] ?? 0) * brightness;
    out.color[2] = (color?.[2] ?? 0) * brightness;
    return out;
  }

  /** Carbon Initialize (Tr2Light.cpp:165-174): resolve the authored profile path. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this._ResolveLightProfile();
    return true;
  }

  /**
   * Carbon OnModified (Tr2Light.cpp:177-189): a lightProfilePath change
   * re-resolves the profile.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "lightProfilePath")) this._ResolveLightProfile();
    return true;
  }

  /**
   * Carbon's shared body for both call sites: an empty path clears the
   * profile, otherwise the manager supplies it - `BeResMan->GetResource(
   * m_lightProfilePath, L"lp", profile )`, where the extension is its own
   * argument and the requested TYPE is deduced from the destination.
   */
  _ResolveLightProfile()
  {
    if (!this.lightProfilePath)
    {
      this.lightProfile = null;
      return;
    }
    this.lightProfile = be.resMan.GetResource(this.lightProfilePath, {
      ext: "lp",
      requirement: ResourceRequirement.LIGHT_PROFILE
    });
  }

  /**
   * Carbon Tr2Light::RenderDebugInfo (Tr2Light.cpp:205-207; declared
   * Tr2Light.h:87 with `bones = nullptr, boneCount = 0`): an EMPTY virtual
   * base - Tr2PointLight, Tr2SpotLight and Tr2FactionLight draw their own
   * markers. Ported as the same empty body so the debug traversal can call it
   * unconditionally.
   *
   * @param {ITr2DebugRenderer2} _renderer The debug renderer.
   * @param {mat4} _worldMatrix The owner's world matrix.
   * @param {Float32Array|null} [_bones] Packed Float4x3 bone matrices.
   * @param {number} [_boneCount] Number of bones in `_bones`.
   */
  @blue.method
  @meta.noop
  RenderDebugInfo(_renderer, _worldMatrix, _bones = null, _boneCount = 0)
  {
  }

  static LIGHT_TYPE = Tr2Light.LightType;

  static PerLightShadowSetting = PerLightShadowSetting;

  /**
   * Carbon's `Tr2LightFlagChooser`, registered as the BlueEnum object
   * `Tr2LightFlags` (Tr2Light_Blue.cpp:16-21). Its members are the chooser's
   * keys and its values Tr2LightManager's flag bits, the one home of those
   * values. Every light's `flags` member names it as its chooser without the
   * ENUM bit (`blue.chooser`; Tr2PointLight_Blue.cpp:18 and siblings).
   */
  static Tr2LightFlags = {
    AFFECTS_SURFACES: Tr2LightManager.FLAG_AFFECTS_SURFACES,
    AFFECTS_PARTICLES: Tr2LightManager.FLAG_AFFECTS_PARTICLES
  };

  static _lightTransformScratch = mat4.create();

  static _featuresScratch = new LightFeatures();

  static _lightRecord = CreateLightRecord();

}

// Carbon neither registers this nor gives it a chooser.
be.enums.Create("trinity.Tr2Light.LIGHT_TYPE", Tr2Light.LightType);

// BLUE_REGISTER_ENUM_EX( "Tr2LightFlags", uint16_t, Tr2LightFlagChooser,
// ENUM_REG_ENUM_OBJECT_ON_MODULE ) (Tr2Light_Blue.cpp:16-21).
be.enums.Create("trinity.Tr2LightFlags", Tr2Light.Tr2LightFlags, {
  exposedName: "Tr2LightFlags",
  exposure: 2,
  chooser: [
    { name: "AFFECTS_SURFACES", value: Tr2LightManager.FLAG_AFFECTS_SURFACES, description: "Affects surfaces" },
    { name: "AFFECTS_PARTICLES", value: Tr2LightManager.FLAG_AFFECTS_PARTICLES, description: "Affects lit particles" }
  ]
});

