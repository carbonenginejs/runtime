// Source: trinity/trinity/Resources/TriGrannyRes.h
// Dropped reference shape. JavaScript CMF channel decoding replaces this helper.
// Verify fields against format-carbon resources/CmfVertexReader.json.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** CmfVertexReader dropped reference shape (resources), schema shapeHash b28887e3.... */
export class CmfVertexReader extends CjsModel
{

  /** posElem (cmf::VertexElement*) */
  posElem = null;

  /** normElem (cmf::VertexElement*) */
  normElem = null;

  /** tanElem (cmf::VertexElement*) */
  tanElem = null;

  /** binormElem (cmf::VertexElement*) */
  binormElem = null;

  /** pkdTanElem (cmf::VertexElement*) */
  pkdTanElem = null;

  /** pkdLegElem (cmf::VertexElement*) */
  pkdLegElem = null;

}

CjsSchema.define(CmfVertexReader, {
  className: "CmfVertexReader", family: "resources",
  fields: {
    posElem: type.objectRef("cmf::VertexElement"),
    normElem: type.objectRef("cmf::VertexElement"),
    tanElem: type.objectRef("cmf::VertexElement"),
    binormElem: type.objectRef("cmf::VertexElement"),
    pkdTanElem: type.objectRef("cmf::VertexElement"),
    pkdLegElem: type.objectRef("cmf::VertexElement")
  }
});
