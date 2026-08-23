// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataPatternLayer } from "./EveSOFDataPatternLayer.js";
import { EveSOFDataPatternPerHull } from "./EveSOFDataPatternPerHull.js";

/** EveSOFDataPattern (eve) - generated from schema shapeHash f8a30280.... */
@type.define({ className: "EveSOFDataPattern", family: "eve" })
export class EveSOFDataPattern extends CjsModel
{

  /** m_projections (PEveSOFDataPatternPerHullVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataPatternPerHull")
  projections = [];

  /** m_applicationGroups (PEveSOFDataPatternApplicationGroupVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataPatternApplicationGroup")
  applicationGroups = [];

  /** m_layer1 (EveSOFDataPatternLayerPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataPatternLayer")
  layer1 = null;

  /** m_layer2 (EveSOFDataPatternLayerPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataPatternLayer")
  layer2 = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_sof6 (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  sof6 = false;

  /** Tests for a case-insensitive hull projection within this pattern. */
  Has(hullName)
  {
    return this.IndexOfProjection(hullName) !== -1;
  }

  /**
   * Returns the pattern's shared layers and hull-specific transforms, or rejects
   * a missing projection.
   */
  Get(hullName)
  {
    const index = this.IndexOfProjection(hullName);
    if (index === -1)
    {
      throw new ErrSOFProjectionNotFound({ pattern: this.name, projection: hullName });
    }
    const projection = this.projections[index];
    return {
      name: this.name,
      layer1: this.layer1,
      layer2: this.layer2,
      transformLayer1: projection.transformLayer1,
      transformLayer2: projection.transformLayer2
    };
  }

  /**
   * Locates a hull projection case-insensitively and returns its array index or
   * -1.
   */
  IndexOfProjection(hullName)
  {
    const name = String(hullName ?? "").toUpperCase();
    return this.projections.findIndex(value => String(value?.name ?? "").toUpperCase() === name);
  }

  /**
   * Clears authored texture and material state from each existing layer while
   * retaining the layer objects.
   */
  EmptyLayers()
  {
    if (this.layer1) this.layer1.Empty();
    if (this.layer2) this.layer2.Empty();
    return this;
  }

  /** Swaps the first and second authored layer references in place. */
  FlipLayers()
  {
    [this.layer1, this.layer2] = [this.layer2, this.layer1];
    return this;
  }

  /**
   * Mirrors the paired transforms in every hull projection without exchanging
   * the shared layers.
   */
  FlipTransformLayers()
  {
    this.projections.forEach(projection => {
      if (projection) projection.Flip();
    });
    return this;
  }

  /**
   * Exchanges both shared layers and each projection's paired transforms as one
   * in-place operation.
   */
  Flip()
  {
    this.FlipLayers();
    this.FlipTransformLayers();
    return this;
  }

  /**
   * Creates, updates, or clears the two pattern layers from caller-supplied
   * custom-mask descriptors.
   */
  SetLayersFromCustomMasks(customMask1, customMask2)
  {
    this.layer1 = setLayerFromCustomMask(this.layer1, customMask1, "PatternMask1Map");
    this.layer2 = setLayerFromCustomMask(this.layer2, customMask2, "PatternMask2Map");
    return this;
  }

  /**
   * Creates or reuses the requested hull projection, copies both custom-mask
   * transforms into it, and returns that projection.
   */
  SetHullProjectionFromCustomMasks(hullName, customMask1, customMask2)
  {
    if (!hullName) throw new TypeError("EveSOFDataPattern requires a hull name");
    const index = this.IndexOfProjection(hullName);
    const projection = index === -1
      ? new EveSOFDataPatternPerHull(hullName)
      : this.projections[index];
    if (index === -1) this.projections.push(projection);
    projection.SetFromCustomMasks(customMask1, customMask2);
    return projection;
  }

}

/** Reports that a pattern has no projection for the requested hull. */
export class ErrSOFProjectionNotFound extends Error
{
  /**
   * Creates a projection lookup error carrying both the pattern and hull names
   * with a stable error code.
   */
  constructor({ pattern = "", projection = "" } = {})
  {
    super("SOF pattern projection '" + projection + "' not found for pattern '" + pattern + "'");
    this.name = "ErrSOFProjectionNotFound";
    this.code = "EVE_SOF_PROJECTION_NOT_FOUND";
    this.pattern = pattern;
    this.projection = projection;
  }
}

function setLayerFromCustomMask(layer, customMask, textureName)
{
  if (!customMask) return null;
  return (layer ?? new EveSOFDataPatternLayer(textureName)).SetFromCustomMask(customMask);
}
