import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsObjectDTO } from "./CjsObjectDTO.js";

/**
 * Geometry-oriented DTO used by CMF/GR2/GEO-like readers.
 *
 * Runtime-resource can normalize geometry format output into a private payload
 * and optionally mirror common arrays into helper fields.
 */
@type.define({ className: "CjsGeometryDTO", family: "resource" })
export class CjsGeometryDTO extends CjsObjectDTO
{
  @io.persist
  @type.list("unknown")
  meshes = [];

  @io.persist
  @type.list("unknown")
  skeletons = [];

  @io.persist
  @type.list("unknown")
  animations = [];

  @io.persist
  @type.unknown
  bounds = null;

  @io.persist
  @type.list("unknown")
  materials = [];

  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  static payload = "geometry";
}
