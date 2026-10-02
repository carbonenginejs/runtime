// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp (GetValue rules)
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:10-18
//
// The six typed parameter subclasses live in sibling files (Carbon SOF_PARAM_DECLARE,
// EveSOFData.h:41-60; GetValue rules EveSOFData.cpp:85-102). All persist
// under the same {name, value} attribute names - only the class name and the
// value payload type distinguish them on the wire, so newly authored SOF data
// can carry these node types. Bool/Int/Float broadcast the scalar to all four
// components; Vector2 zero-pads z and w; Vector3 zero-pads w (0, not 1);
// Color passes through unchanged.
import { meta } from "#schema";
import { vec4 } from "#math/vec4";

/** Stores a named vector parameter and supports assignment and composition; the typed subclasses flatten to a shader vec4 through `GetValue()`.
 * Native IRoot-only data with a self-only Blue table. Defaults retain native
 * construction; the empty destructor needs no resource or update lifecycle.
 */
@meta.define({ className: "EveSOFDataParameter", family: "eve" })
export class EveSOFDataParameter
{

  /**
   * Authored shader parameter binding name, also used as the key by Assign; native m_name
   * (BlueSharedString).
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /**
   * Owned four-component shader parameter value; GetValue returns an independent copy. Native
   * m_value (Vector4); typed subclasses provide their own value representation.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  value = vec4.create();

  /**
   * The parameter as a shader vec4; the typed subclasses override this with
   * their broadcast/zero-pad rules (Carbon virtual GetValue, EveSOFData.h:27).
   * @returns {Float32Array} Independent vector, matching native return-by-value.
   */
  @meta.implemented
  GetValue()
  {
    return vec4.clone(this.value);
  }

  /**
   * Copies this value into a map under its authored name with an optional
   * prefix.
   * Custom: existing JavaScript SOF map-assignment convenience.
   * @param {object} [out={}] Destination parameter map.
   * @param {string} [prefix=""] Optional authored name prefix.
   * @returns {object} The destination map.
   */
  @meta.ours
  Assign(out = {}, prefix = "")
  {
    out[prefix ? prefix + this.name : this.name] = Array.from(this.GetValue());
    return out;
  }

  /**
   * Synchronizes a reusable list to base parameter names and copies matching
   * override vectors where present.
   * Custom: existing vector-record composition helper; typed scalar records
   * use their virtual GetValue through Assign instead of this raw-vector path.
   * @param {EveSOFDataParameter[]} [base=[]] Base vector records.
   * @param {EveSOFDataParameter[]|null} [overrides=null] Named overrides.
   * @param {EveSOFDataParameter[]} [out=[]] Reused destination records.
   * @returns {EveSOFDataParameter[]} The destination list.
   */
  @meta.ours
  static combineArrays(base = [], overrides = null, out = [])
  {
    const validNames = new Set(base.map(value => value.name));
    for (let index = out.length - 1; index >= 0; index--)
    {
      if (!validNames.has(out[index].name)) out.splice(index, 1);
    }
    for (const value of base)
    {
      let result = out.find(candidate => candidate.name === value.name);
      if (!result)
      {
        result = new this();
        result.name = value.name;
        out.push(result);
      }
      const override = overrides?.find(candidate => candidate.name === value.name);
      vec4.copy(result.value, override?.value ?? value.value);
    }
    return out;
  }

}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataParameter ],
  chainTo: null
})(EveSOFDataParameter);
