// Source: trinity/trinity/Tr2ExpressionTermInfo.h
// Source: trinity/trinity/Tr2ExpressionTermInfo.cpp
// Source: trinity/trinity/Tr2ExpressionTermInfo_Blue.cpp
import { meta, types } from "#schema";
import { blue } from "#blue";


const TermType = {
  VARIABLE: 0,
  FUNCTION: 1,
  STRING_FUNCTION: 2
};


/**
 * Describes one term the expression language exposes - a variable, a function or
 * a string function - with its category, argument names and help text.
 */
@meta.define({
  className: "Tr2ExpressionTermInfo",
  family: "trinityCore"
})
export class Tr2ExpressionTermInfo
{
  /** Native term category; not persisted. */
  @meta.edit.readwrite
  @types.int32
  @types.enum("trinity.Tr2ExpressionTermInfo.TermType")
  type = TermType.VARIABLE;

  /** Help category name; not persisted. */
  @meta.edit.readwrite
  @types.string
  category = "";

  /** Exposed term name; not persisted. */
  @meta.edit.readwrite
  @types.string
  name = "";

  /** Help text for the term; not persisted. */
  @meta.edit.readwrite
  @types.string
  description = "";

  /** Factory-owned argument names, absent from the native member table. */
  _arguments = [];

  /**
   * A detached copy of the argument-name list.
   * @returns {string[]} Argument names in factory order.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetArguments()
  {
    return this._arguments.slice();
  }

  /**
   * Builds a VARIABLE term, which takes no arguments.
   * @param {string} category Help category.
   * @param {string} name Variable name.
   * @param {string} description Help text.
   * @returns {Tr2ExpressionTermInfo} New term record.
   */
  @meta.impl.implemented
  static variable(category, name, description)
  {
    return Tr2ExpressionTermInfo._create(TermType.VARIABLE, category, name, [], description);
  }

  /**
   * Builds a FUNCTION term where every trailing value but the last is an
   * argument name and the last is the description.
   * Adapted: combines the native fixed-arity factory overloads in one JavaScript rest parameter.
   * @param {string} category Help category.
   * @param {string} name Function name.
   * @param {...string} argumentsAndDescription Argument names followed by help text.
   * @returns {Tr2ExpressionTermInfo} New term record.
   */
  @meta.impl.adapted
  static function(category, name, ...argumentsAndDescription)
  {
    const values = argumentsAndDescription.slice();
    const description = values.pop() ?? "";
    return Tr2ExpressionTermInfo._create(TermType.FUNCTION, category, name, values, description);
  }

  /**
   * Builds a STRING_FUNCTION term taking exactly one argument.
   * @param {string} category Help category.
   * @param {string} name Function name.
   * @param {string} argument Sole argument name.
   * @param {string} description Help text.
   * @returns {Tr2ExpressionTermInfo} New term record.
   */
  @meta.impl.implemented
  static stringFunction(category, name, argument, description)
  {
    return Tr2ExpressionTermInfo._create(TermType.STRING_FUNCTION, category, name, [argument], description);
  }

  /**
   * Constructs and fills a term of the given type, copying the argument list so
   * the caller's array is not retained.
   * Custom: shares record construction among the portable factory overloads.
   * @param {number} termType Native term category.
   * @param {string} category Help category.
   * @param {string} name Term name.
   * @param {string[]} args Argument names.
   * @param {string} description Help text.
   * @returns {Tr2ExpressionTermInfo} New term record.
   */
  @meta.impl.custom
  static _create(termType, category, name, args, description)
  {
    const term = new Tr2ExpressionTermInfo();
    term.type = termType;
    term.category = category;
    term.name = name;
    term.description = description;
    term._arguments = args.slice();
    return term;
  }

  /** Native enum values exposed by the existing JavaScript catalog adapter. */
  static TermType = TermType;

}

// Carbon neither registers this nor gives it a chooser.
blue.enums.RegisterEnum("trinity.Tr2ExpressionTermInfo.TermType", TermType, {
  source: "trinity/trinity/Tr2ExpressionTermInfo.h", family: "trinityCore", line: 12
});

// Native IRoot record: concrete query identity with no exposure chain.
meta.carbon.interfaceTable({ interfaces: [Tr2ExpressionTermInfo], chainTo: null })(Tr2ExpressionTermInfo, { kind: "class" });
