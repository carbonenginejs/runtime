// Source: trinity/trinity/Tr2Mesh.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/Tr2SerializedMorphAnimation.json.).
import { carbon, edit, type } from "#schema";

/** Persistent-only native morph target name and weight record owned by a mesh. */
@type.define({ className: "Tr2SerializedMorphAnimation", family: "trinityCore" })
export class Tr2SerializedMorphAnimation
{

  /**
   * Morph-target name matched against the mesh geometry when restoring weights.
   * Native m_name (std::string) [PERSISTONLY].
   * @type {string}
   */
  @edit.persistOnly
  @type.string
  name = "";

  /**
   * Persisted influence weight for the named mesh morph target.
   * Native m_weight (float) [PERSISTONLY].
   * @type {number}
   */
  @edit.persistOnly
  @type.float32
  weight = 0;

}

carbon.interfaceTable({ interfaces: [Tr2SerializedMorphAnimation], chainTo: null })(Tr2SerializedMorphAnimation);
