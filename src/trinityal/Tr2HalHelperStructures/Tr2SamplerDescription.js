// Source: trinity/trinityal/Tr2HalHelperStructures.h:137-254 (struct Tr2SamplerDescription)
import { CjsSchema, type } from "#schema";
//   trinity/trinityal/Tr2HalHelperStructures.h:255-277 (struct hash<Tr2SamplerDescription>)
//   trinity/trinityal/include/Tr2SamplerStateAL.h (forward declaration, and the factory)
//
// ONE FOLDER PER DONOR HEADER - see the sibling files for why.
//
// THE CLASS WAS MISSING AND THIS FILE HELD ONLY FUNCTIONS. Carbon declares a
// struct with a documented default constructor; we had a normaliser returning an
// anonymous object, and the previous provenance header named `Tr2SamplerAL.h`,
// which does not declare it. A struct with defaults reduced to a literal with
// `?? 0` is how those defaults drifted - see below.
//
// THREE DEFAULTS WERE WRONG, and two were not even members of their enum. Carbon's
// default constructor sets TF_POINT (1), TA_WRAP (1) and CMP_ALWAYS (8); the
// normaliser defaulted all three to 0. `TextureFilter` does have a zero
// (`TF_NONE`), so an omitted filter silently meant NO filtering rather than point
// sampling. `TextureAddressMode` and `CompareFunc` are 1-based and have no zero at
// all, so an omitted address mode or comparison produced a value outside the enum,
// which no backend can map and nothing reported.
//
// THE FACTORY KEY IS CARBON'S TOO. `Tr2SamplerStateAL::Create` is a lookup in a
// `Tr2ObjectFactory<..., Tr2SamplerDescription>` owned by the primary context
// (`Tr2SamplerStateAL.cpp:25-28`), so two equal descriptions yield one state and
// `operator==` on states is identity. Carbon reaches that through
// `std::hash<Tr2SamplerDescription>`; JavaScript has no hash specialisation to
// install, so `SamplerDescriptionKey` is the equivalent and the Map it feeds is
// the factory.
import { CompareFunc, TextureAddressMode, TextureFilter } from "../../global/consts/renderContext/index.js";

const rawView = new DataView(new ArrayBuffer(4));

/** A float from its raw IEEE-754 bits, or the float itself. */
function floatOf(value, raw, fallback)
{
  if (Number.isFinite(value)) return value;

  if (Number.isInteger(raw))
  {
    rawView.setUint32(0, raw >>> 0, true);

    return rawView.getFloat32(0, true);
  }

  return fallback;
}

/**
 * Carbon's `std::numeric_limits<float>::max()`, the open upper LOD bound an author
 * leaves unbounded.
 */
export const SAMPLER_LOD_UNBOUNDED = 3.4028234663852886e38;


/**
 * The authored sampler state a `Tr2SamplerStateAL` is created from, and the key
 * its factory dedupes on.
 *
 * The field initialisers are Carbon's default constructor
 * (Tr2HalHelperStructures.h:139-157); Carbon's two other constructors are the
 * `create__` factories below.
 */
export class Tr2SamplerDescription
{
  /** m_minFilter, a `TextureFilter` value. */
  minFilter = TextureFilter.TF_POINT;

  /** m_magFilter, a `TextureFilter` value. */
  magFilter = TextureFilter.TF_POINT;

  /** m_mipFilter, a `TextureFilter` value. */
  mipFilter = TextureFilter.TF_POINT;

  /** m_isComparisonFilter */
  isComparisonFilter = false;

  /** m_addressU, a `TextureAddressMode` value. */
  addressU = TextureAddressMode.TA_WRAP;

  /** m_addressV, a `TextureAddressMode` value. */
  addressV = TextureAddressMode.TA_WRAP;

  /** m_addressW, a `TextureAddressMode` value. */
  addressW = TextureAddressMode.TA_WRAP;

  /** m_mipLODBias */
  mipLODBias = 0;

  /** m_maxAnisotropy */
  maxAnisotropy = 1;

  /** m_comparisonFunc, a `CompareFunc` value. */
  comparisonFunc = CompareFunc.CMP_ALWAYS;

  /** m_borderColor: four floats, RGBA. Carbon's constructor zeroes all four. */
  borderColor = new Float32Array(4);

  /** m_minLOD */
  minLOD = 0;

  /** m_maxLOD */
  maxLOD = SAMPLER_LOD_UNBOUNDED;

  /**
   * Carbon's every-field constructor (Tr2HalHelperStructures.h:159-190): each
   * parameter initialises its own member, and the border colour is copied
   * element by element.
   *
   * @param {number} minFilter A `TextureFilter` value.
   * @param {number} magFilter A `TextureFilter` value.
   * @param {number} mipFilter A `TextureFilter` value.
   * @param {boolean} isComparisonFilter Whether this is a comparison sampler.
   * @param {number} addressU A `TextureAddressMode` value.
   * @param {number} addressV A `TextureAddressMode` value.
   * @param {number} addressW A `TextureAddressMode` value.
   * @param {number} mipLODBias Mip LOD bias.
   * @param {number} maxAnisotropy Maximum anisotropy.
   * @param {number} comparisonFunc A `CompareFunc` value.
   * @param {ArrayLike<number>} borderColor Four floats, RGBA.
   * @param {number} minLOD Minimum LOD.
   * @param {number} maxLOD Maximum LOD.
   * @returns {Tr2SamplerDescription} The description.
   */
  static create__AllFields(minFilter, magFilter, mipFilter, isComparisonFilter, addressU, addressV, addressW,
    mipLODBias, maxAnisotropy, comparisonFunc, borderColor, minLOD, maxLOD)
  {
    const description = new Tr2SamplerDescription();

    description.minFilter = minFilter;
    description.magFilter = magFilter;
    description.mipFilter = mipFilter;
    description.isComparisonFilter = isComparisonFilter;
    description.addressU = addressU;
    description.addressV = addressV;
    description.addressW = addressW;
    description.mipLODBias = mipLODBias;
    description.maxAnisotropy = maxAnisotropy;
    description.comparisonFunc = comparisonFunc;
    description.minLOD = minLOD;
    description.maxLOD = maxLOD;
    description.borderColor[0] = borderColor[0];
    description.borderColor[1] = borderColor[1];
    description.borderColor[2] = borderColor[2];
    description.borderColor[3] = borderColor[3];

    return description;
  }

  /**
   * Carbon's compact constructor (Tr2HalHelperStructures.h:192-215): one
   * filter for min, mag and mip, one address mode for U, V and W, no
   * comparison, zero mip LOD bias, `CMP_ALWAYS` and a zero border. The three
   * trailing parameters carry Carbon's default arguments.
   *
   * @param {number} filter A `TextureFilter` value for all three stages.
   * @param {number} address A `TextureAddressMode` value for all three axes.
   * @param {number} [maxAnisotropy] Maximum anisotropy.
   * @param {number} [minLOD] Minimum LOD.
   * @param {number} [maxLOD] Maximum LOD; Carbon's `FLT_MAX` by default.
   * @returns {Tr2SamplerDescription} The description.
   */
  static create__FilterAddress(filter, address, maxAnisotropy = 1, minLOD = 0, maxLOD = SAMPLER_LOD_UNBOUNDED)
  {
    const description = new Tr2SamplerDescription();

    description.minFilter = filter;
    description.magFilter = filter;
    description.mipFilter = filter;
    description.isComparisonFilter = false;
    description.addressU = address;
    description.addressV = address;
    description.addressW = address;
    description.mipLODBias = 0;
    description.maxAnisotropy = maxAnisotropy;
    description.comparisonFunc = CompareFunc.CMP_ALWAYS;
    description.minLOD = minLOD;
    description.maxLOD = maxLOD;

    return description;
  }
}


/**
 * The normal form of a sampler description.
 *
 * TWO SPELLINGS ARRIVE HERE. The effect reader keeps floats as their raw bits
 * (`Tr2SamplerSetup.fromCarbonBinary`: `minLODRaw`, `maxLODRaw`, `mipLODBiasRaw`,
 * `borderColorRaw`) so a round trip is byte-exact; an override built at runtime
 * carries plain floats. The normal form is the floats, and both spellings
 * normalise to it, so the factory key is the same whichever road a description
 * took.
 *
 * @param {object|null} description Authored state in either spelling.
 * @returns {object|null} The normalised description, or null for nothing.
 */
export function NormalizeSamplerDescription(description)
{
  if (!description || typeof description !== "object") return null;

  const border = description.borderColor ?? description.borderColorRaw ?? [];
  const rawBorder = description.borderColor ? null : description.borderColorRaw ?? null;

  // Defaults are Carbon's default constructor, NOT zero. `isComparisonFilter` is
  // also Carbon's field name; it was `comparison` here, which reads as the
  // comparison FUNCTION rather than the flag selecting a comparison sampler.
  return {
    minFilter: description.minFilter ?? TextureFilter.TF_POINT,
    magFilter: description.magFilter ?? TextureFilter.TF_POINT,
    mipFilter: description.mipFilter ?? TextureFilter.TF_POINT,
    isComparisonFilter: Boolean(description.isComparisonFilter ?? description.comparison),
    addressU: description.addressU ?? TextureAddressMode.TA_WRAP,
    addressV: description.addressV ?? TextureAddressMode.TA_WRAP,
    addressW: description.addressW ?? TextureAddressMode.TA_WRAP,
    mipLODBias: floatOf(description.mipLODBias, description.mipLODBiasRaw, 0),
    maxAnisotropy: description.maxAnisotropy ?? 1,
    comparisonFunc: description.comparisonFunc ?? CompareFunc.CMP_ALWAYS,
    borderColor: [ 0, 1, 2, 3 ].map(index => floatOf(rawBorder ? undefined : border[index], rawBorder?.[index], 0)),
    minLOD: floatOf(description.minLOD, description.minLODRaw, 0),
    maxLOD: floatOf(description.maxLOD, description.maxLODRaw, SAMPLER_LOD_UNBOUNDED)
  };
}


/**
 * The factory key for a description: two descriptions with equal keys are one
 * sampler state.
 *
 * This is what Carbon reaches through `std::hash<Tr2SamplerDescription>`
 * (`Tr2HalHelperStructures.h:255-277`), which JavaScript cannot install.
 *
 * @param {object} description A description in either spelling.
 * @returns {string|null} The key, or null for nothing.
 */
export function SamplerDescriptionKey(description)
{
  const normalized = NormalizeSamplerDescription(description);

  return normalized ? JSON.stringify(normalized) : null;
}

CjsSchema.decorateField(Tr2SamplerDescription, "minFilter", type.int32);
CjsSchema.decorateField(Tr2SamplerDescription, "magFilter", type.int32);
CjsSchema.decorateField(Tr2SamplerDescription, "mipFilter", type.int32);
CjsSchema.decorateField(Tr2SamplerDescription, "isComparisonFilter", type.boolean);
CjsSchema.decorateField(Tr2SamplerDescription, "addressU", type.int32);
CjsSchema.decorateField(Tr2SamplerDescription, "addressV", type.int32);
CjsSchema.decorateField(Tr2SamplerDescription, "addressW", type.int32);
CjsSchema.decorateField(Tr2SamplerDescription, "mipLODBias", type.float32);
CjsSchema.decorateField(Tr2SamplerDescription, "maxAnisotropy", type.uint32);
CjsSchema.decorateField(Tr2SamplerDescription, "comparisonFunc", type.uint32);
CjsSchema.decorateField(Tr2SamplerDescription, "borderColor", type.float32Array);
CjsSchema.decorateField(Tr2SamplerDescription, "minLOD", type.float32);
CjsSchema.decorateField(Tr2SamplerDescription, "maxLOD", type.float32);
CjsSchema.blue.define(Tr2SamplerDescription, { className: "Tr2SamplerDescription" });
