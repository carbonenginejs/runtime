// Source: trinity/trinity/Resources/TriGrannyRes.h
// Dropped reference shape. JavaScript CMF channel decoding replaces this helper.
// Verify fields against format-carbon resources/CmfVertexReader.json.
import { CjsSchema, meta } from "#schema";

/** Retained-only reference shape mirroring Carbon's CMF vertex-element pointer-lookup helper, superseded by the JavaScript CMF format's channel decoding. */
export class CmfVertexReader
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
    posElem: meta.type.objectRef("cmf::VertexElement"),
    normElem: meta.type.objectRef("cmf::VertexElement"),
    tanElem: meta.type.objectRef("cmf::VertexElement"),
    binormElem: meta.type.objectRef("cmf::VertexElement"),
    pkdTanElem: meta.type.objectRef("cmf::VertexElement"),
    pkdLegElem: meta.type.objectRef("cmf::VertexElement")
  }
});
