// Source: trinity/trinity/Tr2Mesh.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/Tr2SerializedMorphAnimation.json.).
import { type, blue } from "#schema";

/** Persistent-only native morph target name and weight record owned by a mesh. */
@blue.define("Tr2SerializedMorphAnimation")
@blue.interface()
export class Tr2SerializedMorphAnimation
{

  /**
   * Morph-target name matched against the mesh geometry when restoring weights.
   * Native m_name (std::string) [PERSISTONLY].
   * @type {string}
   */
  @blue.persistOnly
  @type.string
  name = "";

  /**
   * Persisted influence weight for the named mesh morph target.
   * Native m_weight (float) [PERSISTONLY].
   * @type {number}
   */
  @blue.persistOnly
  @type.float32
  weight = 0;

}

