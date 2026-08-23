# Live deprecation records

Files in this directory are metadata sidecars for maintained classes that are
still live but have a named replacement and removal plan. The class source does
not move here. Sidecars are not imported, exported, or schema-registered.

Each `{ClassName}.json` records its status, declaration date, nullable removal
date, replacement, reason, source, and concrete removal gates. When the class
is actually deleted, update the existing record rather than deleting it.
