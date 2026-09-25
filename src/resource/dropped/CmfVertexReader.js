// Source: trinity/trinity/Resources/TriGrannyRes.h
// Dropped reference shape. JavaScript CMF channel decoding replaces this helper.
// Verify fields against format-carbon resources/CmfVertexReader.json.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Retained-only reference shape mirroring Carbon's CMF vertex-element pointer-lookup helper, superseded by the JavaScript CMF format's channel decoding. */
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
