# Hydrating JSON output

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/hlsl` JSON node hydration
Audience: Advanced users and integrators
Summary: Explains how callers can replace selected plain JSON nodes with their own constructors.

## Register constructors

The default `json` output uses plain objects. The `classes` option can
instantiate selected node kinds with caller-provided constructors:

```js
import CjsHlslFormat from "@carbonenginejs/runtime-resource/formats/hlsl";

const effect = CjsHlslFormat.read(bytes, {
    classes: {
        Technique: MyTechnique,
        StageInput: MyStageInput
    }
});
```

Supported keys are exposed as `CjsHlslFormat.CLASS_KEYS`:

```text
Root
Permutation
EffectDescription
Technique
Pass
StageInput
Constant
Resource
Sampler
ShaderBytecode
```

## Reuse a profile

```js
const reader = new CjsHlslFormat();

reader.SetClass("Technique", MyTechnique);
reader.SetClasses({ StageInput: MyStageInput });

reader.HasClass("Technique");
reader.GetClass("Technique");

const effect = reader.Read(bytes);
```

Hydration changes object prototypes, not the documented field shape. Nested
records without a class key remain plain JSON-compatible data. Depending on
the caller's constructors as a serialization schema is discouraged; persist
the documented graph fields instead.

This feature is caller-selected JSON projection only. It does not construct
canonical runtime `Tr2EffectRes` or `Tr2Shader` instances. Those are built
from the compiled container bytes by `@carbonenginejs/runtime-resource`.
