# Architecture and boundaries

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/dxbc`
Audience: Shader-tool authors, lowering-backend authors, and maintainers
Summary: Defines DXBC decoding ownership, strictness, dependency direction, and target-language non-goals.

## Purpose

`format-dxbc` turns caller-supplied DXBC bytes into validated container,
signature, program, operand, declaration, and instruction records. It stops
before target-language code generation.

## Dependency direction

```text
caller or format-hlsl
          |
          | DXBC bytes
          v
     format-dxbc
       /      \
      v        v
format-webgl  format-webgpu
```

The package has no runtime dependency and its public source works in browsers
and Node. Lowering packages depend on its decoded records; it does not import
them.

## Owned responsibilities

- DXBC magic, header, checksum field, total-size, and chunk-directory parsing.
- Bounds-checked access to chunk payloads.
- `ISGN`, `ISG1`, `OSGN`, `OSG1`, `OSG5`, `PCSG`, and `PSG1` signature
  records.
- `SHEX` and `SHDR` program version and token-stream reading.
- SM4/SM5 opcode, operand, declaration, control, and extension-token decoding.
- SM5.1 binding-range and resource-reference records.
- JSON-compatible output and an internal raw-object mode.
- Structured decode errors with source and offset details.

## Ownership elsewhere

- Compiled effect containers, permutations, techniques, and binding manifests
  belong to `format-hlsl`.
- GLSL ES generation and WebGL-specific register/storage policy belong to
  `format-webgl`.
- WGSL generation, pass-global WebGPU binding allocation, and Carbon WebGPU assembly
  belong to `format-webgpu`.
- GPU shader-module and pipeline realization belongs to engine packages.

## Strictness

The reader validates container and chunk bounds before exposing data.
Executable instructions must consume exactly their declared token length.
Declarations decode the payload forms implemented by the package and retain
remaining valid words in `tailTokens`, allowing unusual stages to remain
inspectable without pretending every declaration payload has a specialized
projection.

The opcode-name table covers the SM4/SM5 vocabulary used for framing. That does
not imply every opcode has a target-language implementation in every lowering
package.

## Output stability

`emit: "json"` is the stable integration surface. It returns plain data and
converts typed arrays into number arrays.

`emit: "raw"` exposes package-internal class instances for advanced backends.
Those classes are not public npm exports; consumers should treat their concrete
constructors as internal and depend only on the fields used by the owning
lowering package.

## Related documentation

- [Package documentation](README.md)
- [Public API reference](reference/api.md)
- [Decoded output contract](reference/decoded-output.md)
