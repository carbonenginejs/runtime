// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, meta } from "#schema";

/** Effect compile define retained as source metadata. */
export class Tr2EffectDefine
{

  /** name (const char*) */
  name = "";

  /** value (const char*) */
  value = "";

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectDefine, {
  className: "Tr2EffectDefine",
  family: "shader",
  fields: {
    name: meta.type.string,
    value: meta.type.string
  }
});
