import { IRoot } from "../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2Mesh.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/Tr2SerializedMorphAnimation.json.).
import { type, blue } from "#schema";

/** Persistent-only native morph target name and weight record owned by a mesh. */
@be.define("Tr2SerializedMorphAnimation")

export class Tr2SerializedMorphAnimation extends IRoot
{

  /**
   * Morph-target name matched against the mesh geometry when restoring weights.
   * Native m_name (std::string) [PERSISTONLY].
   * @type {string}
   */
  @be.mapAttribute(be.PERSISTONLY)
  @type.string
  name = "";

  /**
   * Persisted influence weight for the named mesh morph target.
   * Native m_weight (float) [PERSISTONLY].
   * @type {number}
   */
  @be.mapAttribute(be.PERSISTONLY)
  @type.float32
  weight = 0;

}

