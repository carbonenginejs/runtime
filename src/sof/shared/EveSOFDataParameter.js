// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp (GetValue rules)
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** EveSOFDataParameter (eve) - generated from schema shapeHash 148eba9e.... */
@type.define({ className: "EveSOFDataParameter", family: "eve" })
export class EveSOFDataParameter extends CjsModel
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_value (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  value = vec4.create();

  /**
   * The parameter as a shader vec4; the typed subclasses override this with
   * their broadcast/zero-pad rules (Carbon virtual GetValue, EveSOFData.h:27).
   */
  GetValue()
  {
    return vec4.clone(this.value);
  }

  /**
   * Copies this value into a map under its authored name with an optional
   * prefix.
   */
  Assign(out = {}, prefix = "")
  {
    out[prefix ? prefix + this.name : this.name] = Array.from(this.GetValue());
    return out;
  }

  /**
   * Synchronizes a reusable list to base parameter names and copies matching
   * override vectors where present.
   */
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


// The six typed parameter subclasses (Carbon SOF_PARAM_DECLARE,
// EveSOFData.h:41-60; GetValue rules EveSOFData.cpp:85-102). All persist
// under the same {name, value} attribute names - only the class name and the
// value payload type distinguish them on the wire, so newly authored SOF data
// can carry these node types. Bool/Int/Float broadcast the scalar to all four
// components; Vector2 zero-pads z and w; Vector3 zero-pads w (0, not 1);
// Color passes through unchanged.

/** Boolean shader parameter: broadcasts 1/0 to all four components. */
@type.define({ className: "EveSOFDataParameterBool", family: "eve" })
export class EveSOFDataParameterBool extends EveSOFDataParameter
{
  @io.persist
  @type.boolean
  value = false;

  GetValue()
  {
    const scalar = this.value ? 1 : 0;
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}

/** Integer shader parameter: broadcasts the value to all four components. */
@type.define({ className: "EveSOFDataParameterInt", family: "eve" })
export class EveSOFDataParameterInt extends EveSOFDataParameter
{
  @io.persist
  @type.int32
  value = 0;

  GetValue()
  {
    const scalar = Number(this.value);
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}

/** Float shader parameter: broadcasts the value to all four components. */
@type.define({ className: "EveSOFDataParameterFloat", family: "eve" })
export class EveSOFDataParameterFloat extends EveSOFDataParameter
{
  @io.persist
  @type.float32
  value = 0;

  GetValue()
  {
    const scalar = Number(this.value);
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}

/** Two-component shader parameter: zero-pads z and w. */
@type.define({ className: "EveSOFDataParameterVector2", family: "eve" })
export class EveSOFDataParameterVector2 extends EveSOFDataParameter
{
  @io.persist
  @type.vec2
  value = vec2.create();

  GetValue()
  {
    return vec4.fromValues(this.value[0], this.value[1], 0, 0);
  }
}

/** Three-component shader parameter: zero-pads w (0, not 1). */
@type.define({ className: "EveSOFDataParameterVector3", family: "eve" })
export class EveSOFDataParameterVector3 extends EveSOFDataParameter
{
  @io.persist
  @type.vec3
  value = vec3.create();

  GetValue()
  {
    return vec4.fromValues(this.value[0], this.value[1], this.value[2], 0);
  }
}

/** Color shader parameter: passes the four components through unchanged. */
@type.define({ className: "EveSOFDataParameterColor", family: "eve" })
export class EveSOFDataParameterColor extends EveSOFDataParameter
{
  @io.persist
  @type.vec4
  value = vec4.create();

  GetValue()
  {
    return vec4.clone(this.value);
  }
}
