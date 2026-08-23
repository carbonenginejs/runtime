# Runtime audio class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime-audio` maintained classes  
Audience: Users, maintainers, and automated readers  
Summary: Indexes one-sentence purpose descriptors for every maintained runtime-audio class.

## Purpose

The catalog records exact source ownership, public visibility, and provenance
kind. It is an index rather than a method reference.

## Catalog map

- [Realization and music classes](realization.md)
- [Carbon graph classes](trinity.md)

## Kind values

- `CarbonEngineJS original`: behavior designed for the JavaScript runtime.
- `Faithful Carbon port`: portable data or behavior follows the public Carbon
  contract.
- `Adapted Carbon concept`: the class preserves Carbon intent with an explicit
  JavaScript or browser adaptation.
- `Internal implementation class`: not exported as package API.

## Related documentation

- [Current API reference](../api.md)
- [Carbon compatibility](../carbon-compatibility.md)
