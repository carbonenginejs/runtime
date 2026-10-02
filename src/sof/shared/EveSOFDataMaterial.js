// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:187-195
import { meta } from "#schema";

/** Stores named material parameters and assigns them to a target with an optional parameter prefix.
 * Native IRoot-only data with a self-only Blue table. Owned authored records
 * are not loaded resources; native construction and empty destruction need
 * no additional initialization or update lifecycle.
 */
@meta.define({ className: "EveSOFDataMaterial", family: "eve" })
export class EveSOFDataMaterial
{

  /**
   * Authored material identifier, used as the SOF catalog lookup key.
   * Native m_name (std::string), READWRITE | PERSIST.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /**
   * Owned authored shader-parameter records, including typed subclasses.
   * Native m_parameters (PEveSOFDataParameterVector), READ | PERSIST.
   * @type {EveSOFDataParameter[]}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataParameter")
  parameters = [];

  /**
   * Writes every authored material parameter into the supplied map using an
   * optional prefix.
   * Custom: retained JavaScript SOF parameter-map helper.
   * @param {object} [out={}] Destination parameter map.
   * @param {string} [prefix=""] Optional name prefix.
   * @returns {object} The destination map.
   */
  @meta.ours
  AssignParameters(out = {}, prefix = "")
  {
    for (const parameter of this.parameters) parameter.Assign(out, prefix);
    return out;
  }

}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataMaterial ],
  chainTo: null
})(EveSOFDataMaterial);
