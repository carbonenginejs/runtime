# Runtime character documentation

Status: Evolving
Reviewed: 2026-09-08
Scope: `@carbonenginejs/runtime/character`
Audience: Character-runtime integrators and maintainers
Summary: Routes character data, planning, realization and class documentation.

The character layer owns the schema-v10 combined source library, standalone
schema-v4 appearance plans and CPU construction lifecycle. Injected backend
ALs own live realization and are imported separately from the CPU/data root.
The builder accepts decoded values or orchestrates twelve static-data reads;
applications retain endpoint and asset-lifecycle policy.

- [Architecture and ownership](architecture.md): CPU, GPU, format and native boundaries, plus realization requirements.
- [Runtime usage](guides/runtime-usage.md): build, install, edit, resolve and serialize.
- [Character document contract](reference/prepared-libraries.md): collections, identity, catalogs and migration.
- [Character appearance plans](reference/character-appearance-plans.md): implemented resolution and logical composition contract.
- [Class catalog](reference/classes/README.md): class and source lookup.

Source-backed data and explicitly labelled policy are distinct. A working
prototype or successful hydration does not establish complete renderer parity.
