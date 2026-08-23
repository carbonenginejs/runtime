// Source: trinity/trinity/Tr2ExpressionTermInfo.h
// Source: trinity/trinity/Tr2ExpressionTermInfo.cpp
// Source: trinity/trinity/Tr2ExpressionTermInfo_Blue.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


const TermType = Object.freeze({
  VARIABLE: 0,
  FUNCTION: 1,
  STRING_FUNCTION: 2
});


/**
 * Describes one term the expression language exposes - a variable, a function or
 * a string function - with its category, argument names and help text.
 */
@type.define({
  className: "Tr2ExpressionTermInfo",
  family: "trinityCore"
})
export class Tr2ExpressionTermInfo extends CjsModel
{
  @io.readwrite
  @type.int32
  @type.enum("TermType")
  type = TermType.VARIABLE;

  @io.readwrite
  @type.string
  category = "";

  @io.readwrite
  @type.string
  name = "";

  @io.readwrite
  @type.string
  description = "";

  #arguments = [];

  /** A detached copy of the argument-name list. */
  @carbon.method
  @impl.implemented
  GetArguments()
  {
    return this.#arguments.slice();
  }

  /** Builds a VARIABLE term, which takes no arguments. */
  static Variable(category, name, description)
  {
    return Tr2ExpressionTermInfo.#create(TermType.VARIABLE, category, name, [], description);
  }

  /**
   * Builds a FUNCTION term where every trailing value but the last is an
   * argument name and the last is the description.
   */
  static Function(category, name, ...argumentsAndDescription)
  {
    const values = argumentsAndDescription.slice();
    const description = values.pop() ?? "";
    return Tr2ExpressionTermInfo.#create(TermType.FUNCTION, category, name, values, description);
  }

  /** Builds a STRING_FUNCTION term taking exactly one argument. */
  static StringFunction(category, name, argument, description)
  {
    return Tr2ExpressionTermInfo.#create(TermType.STRING_FUNCTION, category, name, [argument], description);
  }

  /**
   * Constructs and fills a term of the given type, copying the argument list so
   * the caller's array is not retained.
   */
  static #create(termType, category, name, args, description)
  {
    const term = new Tr2ExpressionTermInfo();
    term.type = termType;
    term.category = category;
    term.name = name;
    term.description = description;
    term.#arguments = args.slice();
    return term;
  }

  static TermType = TermType;

}
