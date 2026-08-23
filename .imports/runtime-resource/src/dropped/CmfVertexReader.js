// Source: trinity/trinity/Resources/TriGrannyRes.h
// Dropped reference shape. JavaScript CMF channel decoding replaces this helper.
// Verify fields against format-carbon resources/CmfVertexReader.json.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** CmfVertexReader dropped reference shape (resources), schema shapeHash b28887e3.... */
@type.define({ className: "CmfVertexReader", family: "resources" })
export class CmfVertexReader extends CjsModel
{

  /** posElem (cmf::VertexElement*) */
  @type.objectRef("cmf::VertexElement")
  posElem = null;

  /** normElem (cmf::VertexElement*) */
  @type.objectRef("cmf::VertexElement")
  normElem = null;

  /** tanElem (cmf::VertexElement*) */
  @type.objectRef("cmf::VertexElement")
  tanElem = null;

  /** binormElem (cmf::VertexElement*) */
  @type.objectRef("cmf::VertexElement")
  binormElem = null;

  /** pkdTanElem (cmf::VertexElement*) */
  @type.objectRef("cmf::VertexElement")
  pkdTanElem = null;

  /** pkdLegElem (cmf::VertexElement*) */
  @type.objectRef("cmf::VertexElement")
  pkdLegElem = null;

}
