export class CjsBlackSchemaRegistry
{
    constructor(schema = null)
    {
        this.shapes = CjsBlackSchemaRegistry.createShapeMap(schema);
    }

    GetSourceShape(kind)
    {
        return this.shapes.get(kind) || null;
    }

    static createShapeMap(schema)
    {
        const shapes = new Map();
        if (CjsBlackSchemaRegistry.isCompactClassMap(schema))
        {
            CjsBlackSchemaRegistry.addCompactClassMap(schema, shapes);
            return shapes;
        }

        CjsBlackSchemaRegistry.collectSchemaShapes(schema, shapes, new WeakSet());
        return shapes;
    }

    static collectSchemaShapes(value, shapes, seen)
    {
        if (!value || typeof value !== "object") return;
        if (seen.has(value)) return;
        seen.add(value);

        if (Array.isArray(value))
        {
            for (const item of value)
            {
                CjsBlackSchemaRegistry.collectSchemaShapes(item, shapes, seen);
            }
            return;
        }

        if (CjsBlackSchemaRegistry.isClassSchema(value))
        {
            CjsBlackSchemaRegistry.addShape(value, shapes);
            return;
        }

        if (Array.isArray(value.families))
        {
            for (const family of value.families)
            {
                CjsBlackSchemaRegistry.collectSchemaShapes(family, shapes, seen);
            }
        }

        if (Array.isArray(value.classes))
        {
            for (const item of value.classes)
            {
                CjsBlackSchemaRegistry.collectSchemaShapes(item, shapes, seen);
            }
        }
        else if (CjsBlackSchemaRegistry.isCompactClassMap(value.classes))
        {
            CjsBlackSchemaRegistry.addCompactClassMap(value.classes, shapes);
        }

        for (const item of Object.values(value))
        {
            if (item && typeof item === "object" && CjsBlackSchemaRegistry.isClassSchema(item))
            {
                CjsBlackSchemaRegistry.addShape(item, shapes);
            }
        }
    }

    static isCompactClassMap(value)
    {
        if (!value || typeof value !== "object" || Array.isArray(value)) return false;
        if (CjsBlackSchemaRegistry.isClassSchema(value)) return false;
        if (value.black || value.families || Array.isArray(value.classes)) return false;

        const entries = Object.entries(value);
        if (!entries.length) return false;

        return entries.every(([ className, fields ]) =>
            typeof className === "string" &&
            className.length > 0 &&
            CjsBlackSchemaRegistry.isCompactFieldMap(fields) &&
            CjsBlackSchemaRegistry.isCompactClassFields(fields)
        );
    }

    static isCompactClassFields(fields)
    {
        const specs = Object.values(fields || {});
        return specs.every(spec => CjsBlackSchemaRegistry.isCompactFieldSpec(spec));
    }

    static isCompactFieldSpec(spec)
    {
        if (typeof spec === "string") return true;
        if (!spec || typeof spec !== "object" || Array.isArray(spec)) return false;
        return typeof spec.type === "string" || typeof spec.kind === "string";
    }

    static addCompactClassMap(classes, shapes)
    {
        for (const [ className, fields ] of Object.entries(classes || {}))
        {
            CjsBlackSchemaRegistry.addShape({ className, fields }, shapes);
        }
    }

    static isClassSchema(value)
    {
        if (!value || typeof value !== "object") return false;
        if (Array.isArray(value)) return false;
        return Boolean(
            value.black?.fields ||
            (value.black && (value.black.className || value.className || value.blueClass || value.cppClass)) ||
            (value.className && CjsBlackSchemaRegistry.isCompactFieldMap(value.fields)) ||
            (value.className && Array.isArray(value.fields)) ||
            (value.blueClass && value.black)
        );
    }

    static addShape(schema, shapes)
    {
        const shape = CjsBlackSchemaRegistry.normalizeShape(schema);
        if (!shape?.className) return;

        shapes.set(shape.className, shape);
        if (schema.blueClass) shapes.set(schema.blueClass, shape);
        if (schema.cppClass) shapes.set(schema.cppClass, shape);
        if (schema.name) shapes.set(schema.name, shape);
    }

    static normalizeShape(schema)
    {
        const black = schema.black || {};
        const className = black.className || schema.className || schema.blueClass || schema.cppClass || schema.name || null;
        if (!className) return null;

        const fields = CjsBlackSchemaRegistry.normalizeFields(schema);
        const blackFieldSource = CjsBlackSchemaRegistry.isCompactFieldMap(schema.fields)
            ? CjsBlackSchemaRegistry.compactBlackFields(schema.fields)
            : (black.fields || schema.blackFields || schema.fields || []);
        const blackFields = blackFieldSource
            .filter(item => item && typeof item === "object")
            .map(item => CjsBlackSchemaRegistry.normalizeBlackField(item, fields));

        return {
            ...schema,
            className,
            family: schema.family || null,
            fields,
            black: {
                ...black,
                className,
                fields: blackFields
            }
        };
    }

    static normalizeFields(schema)
    {
        const fields = [];
        const byName = new Map();
        const add = (field) =>
        {
            if (!field || typeof field !== "object") return;
            const name = field.name || field.fieldName || field.blueName || CjsBlackSchemaRegistry.toJsFieldName(field.cppName || field.member || "");
            if (!name || byName.has(name)) return;

            const normalized = {
                ...field,
                name,
                cppName: field.cppName || field.memberPath || field.memberRoot || field.member || null,
                cppType: field.cppType || null
            };
            byName.set(name, normalized);
            fields.push(normalized);
        };

        if (CjsBlackSchemaRegistry.isCompactFieldMap(schema.fields))
        {
            for (const [ blackName, fieldSpec ] of Object.entries(schema.fields))
            {
                add(CjsBlackSchemaRegistry.compactField(blackName, fieldSpec));
            }
        }
        else
        {
            for (const field of schema.fields || [])
            {
                add(field);
            }
        }

        for (const attribute of schema.attributes || [])
        {
            if (!attribute?.black) continue;
            const black = CjsBlackSchemaRegistry.normalizeBlackField(attribute.black, fields);
            add({
                name: black.fieldName || attribute.blueName || black.name,
                cppName: black.cppName,
                cppType: black.cppType || attribute.cppType,
                black
            });
        }

        return fields;
    }

    static isCompactFieldMap(value)
    {
        return !!value && typeof value === "object" && !Array.isArray(value);
    }

    static compactBlackFields(fields)
    {
        return Object.entries(fields || {}).map(([ blackName, fieldSpec ]) =>
            CjsBlackSchemaRegistry.compactBlackField(blackName, fieldSpec));
    }

    static compactField(blackName, fieldSpec)
    {
        const spec = CjsBlackSchemaRegistry.normalizeCompactSpec(blackName, fieldSpec);
        return {
            name: spec.fieldName,
            fieldName: spec.fieldName,
            enumType: spec.enumType,
            jsType: spec.jsType,
            black: spec.black
        };
    }

    static compactBlackField(blackName, fieldSpec)
    {
        return CjsBlackSchemaRegistry.normalizeCompactSpec(blackName, fieldSpec).black;
    }

    static normalizeCompactSpec(blackName, fieldSpec)
    {
        const
            spec = typeof fieldSpec === "string" ? { type: fieldSpec } : (fieldSpec || {}),
            type = spec.type || spec.kind || "unknown",
            fieldName = spec.field || spec.fieldName || blackName,
            descriptor = CjsBlackSchemaRegistry.compactTypeDescriptor(type, spec),
            black = {
                name: blackName,
                fieldName,
                storageName: fieldName,
                member: blackName,
                memberPath: fieldName,
                memberRoot: fieldName,
                indexKey: Object.hasOwn(spec, "index") ? spec.index : undefined,
                indexToken: spec.token || null,
                enumType: spec.enum || null,
                ...descriptor.black,
                jsType: descriptor.jsType
            };

        return {
            fieldName,
            enumType: spec.enum || null,
            jsType: descriptor.jsType,
            black
        };
    }

    static compactTypeDescriptor(type, spec)
    {
        const normalized = String(type || "unknown");
        switch (normalized)
        {
            case "boolean":
            case "bool":
                return CjsBlackSchemaRegistry.compactBlackType("BOOL", { kind: "boolean" });
            case "string":
                return CjsBlackSchemaRegistry.compactBlackType("STDSTRING", { kind: "string" });
            case "wstring":
                return CjsBlackSchemaRegistry.compactBlackType("STDWSTRING", { kind: "string" });
            case "path":
                return CjsBlackSchemaRegistry.compactBlackType("STDSTRING", { kind: "path" });
            case "expression":
                return CjsBlackSchemaRegistry.compactBlackType("STDSTRING", { kind: "expression", js: "string" });
            case "enum":
                return CjsBlackSchemaRegistry.compactBlackType("LONG", { kind: "enum" }, { signed: true });
            case "float":
                return CjsBlackSchemaRegistry.compactBlackType("FLOAT", { kind: "float32" });
            case "double":
                return CjsBlackSchemaRegistry.compactBlackType("DOUBLE", { kind: "float64" });
            case "int":
                return CjsBlackSchemaRegistry.compactBlackType("LONG", { kind: "int32" }, { signed: true });
            case "uint":
                return CjsBlackSchemaRegistry.compactBlackType("ULONG", { kind: "uint32" }, { signed: false });
            case "int64":
                return CjsBlackSchemaRegistry.compactBlackType("INT64", { kind: "int64" }, { signed: true });
            case "uint64":
                return CjsBlackSchemaRegistry.compactBlackType("UINT64", { kind: "uint64" }, { signed: false });
            case "byte":
                return CjsBlackSchemaRegistry.compactBlackType("BYTE", { kind: "int8" }, { signed: true });
            case "ubyte":
                return CjsBlackSchemaRegistry.compactBlackType("BYTE", { kind: "uint8" }, { signed: false });
            case "short":
                return CjsBlackSchemaRegistry.compactBlackType("SHORT", { kind: "int16" }, { signed: true });
            case "ushort":
                return CjsBlackSchemaRegistry.compactBlackType("SHORT", { kind: "uint16" }, { signed: false });
            case "vector2":
                return CjsBlackSchemaRegistry.compactFloatArrayType("vector2", 2);
            case "vector3":
                return CjsBlackSchemaRegistry.compactFloatArrayType("vector3", 3);
            case "vector4":
                return CjsBlackSchemaRegistry.compactFloatArrayType("vector4", 4);
            case "color":
                return CjsBlackSchemaRegistry.compactFloatArrayType("color", 4);
            case "quaternion":
                return CjsBlackSchemaRegistry.compactFloatArrayType("quaternion", 4);
            case "matrix3":
                return CjsBlackSchemaRegistry.compactFloatArrayType("matrix3", 9);
            case "matrix4":
                return CjsBlackSchemaRegistry.compactFloatArrayType("matrix4", 16);
            case "floatArray":
                return CjsBlackSchemaRegistry.compactFloatArrayType("array", spec.length || 0);
            case "array":
                return CjsBlackSchemaRegistry.compactBlackType("IROOT", { kind: "array" }, { container: "list" });
            case "dict":
                return CjsBlackSchemaRegistry.compactBlackType("IROOT", { kind: "map" }, { container: "dict" });
            case "object":
                return CjsBlackSchemaRegistry.compactBlackType("IROOTPTR", { kind: "objectRef" });
            case "rawObject":
                return CjsBlackSchemaRegistry.compactBlackType("IROOT", { kind: "rawStruct" });
            case "structList":
                return CjsBlackSchemaRegistry.compactBlackType("IROOT", { kind: "array" }, {
                    container: "list",
                    cppType: spec.cppType || "StructureList"
                });
            case "binaryBlock":
                return CjsBlackSchemaRegistry.compactBlackType("BINARYBLOCK", { kind: "typedArray" });
            default:
                return CjsBlackSchemaRegistry.compactBlackType(null, { kind: normalized });
        }
    }

    static compactBlackType(beType, jsType, extra = {})
    {
        return {
            jsType,
            black: {
                beType,
                wireType: CjsBlackSchemaRegistry.compactWireType(beType, extra.container),
                ...extra
            }
        };
    }

    static compactFloatArrayType(kind, length)
    {
        return CjsBlackSchemaRegistry.compactBlackType("FLOATARRAY", { kind, length }, { length });
    }

    static compactWireType(beType, container = null)
    {
        switch (beType)
        {
            case "BOOL":
                return "bool";
            case "STDSTRING":
            case "STDWSTRING":
                return "stringRef";
            case "FLOAT":
                return "float32";
            case "DOUBLE":
                return "float64";
            case "LONG":
                return "int32";
            case "ULONG":
                return "uint32";
            case "INT64":
                return "int64";
            case "UINT64":
                return "uint64";
            case "BYTE":
                return "uint8";
            case "SHORT":
                return "uint16";
            case "FLOATARRAY":
                return "floatArray";
            case "BINARYBLOCK":
                return "binaryBlock";
            case "IROOTPTR":
                return "objectRef";
            case "IROOT":
                return container ? "container" : "inlineObject";
            default:
                return null;
        }
    }

    static normalizeBlackField(field, sourceFields = [])
    {
        const names = field.names || null;
        const name = field.name || CjsBlackSchemaRegistry.getNameRole(names, "name") || field.nameExpression || null;
        const fieldName = field.fieldName || CjsBlackSchemaRegistry.getNameRole(names, "fieldName") || name || null;
        const cppName = field.cppName ||
            CjsBlackSchemaRegistry.getNameRole(names, "cppName") ||
            CjsBlackSchemaRegistry.getNameRole(names, "memberPath") ||
            CjsBlackSchemaRegistry.getNameRole(names, "memberRoot") ||
            null;
        const member = field.member || CjsBlackSchemaRegistry.getNameRole(names, "member") || cppName || name;
        const memberPath = field.memberPath || CjsBlackSchemaRegistry.getNameRole(names, "memberPath") || cppName;
        const memberRoot = field.memberRoot || CjsBlackSchemaRegistry.getNameRole(names, "memberRoot") || memberPath;
        const sourceField = sourceFields.find(item =>
            item.name === fieldName ||
            item.name === name ||
            item.cppName === cppName ||
            item.cppName === memberPath ||
            item.cppName === memberRoot
        );

        return {
            ...field,
            names,
            name,
            fieldName,
            storageName: field.storageName || fieldName || name,
            cppName: cppName || sourceField?.cppName || null,
            member,
            memberPath,
            memberRoot,
            cppType: field.cppType || sourceField?.cppType || null,
            beType: field.beType || null
        };
    }

    static matchesBlackFieldName(field, blackName)
    {
        if (!field || !blackName) return false;
        if (field.name === blackName) return true;
        if (field.fieldName === blackName) return true;
        if (field.member === blackName) return true;
        if (field.memberPath === blackName) return true;
        if (field.memberRoot === blackName) return true;
        if (field.cppName === blackName) return true;
        if (field.nameExpression === blackName) return true;

        if (field.names && typeof field.names === "object")
        {
            return Object.hasOwn(field.names, blackName);
        }

        return false;
    }

    static getNameRole(names, role)
    {
        if (!names || typeof names !== "object") return null;

        for (const [ name, roles ] of Object.entries(names))
        {
            const roleList = Array.isArray(roles) ? roles : String(roles || "").split(/\s+/);
            if (roleList.includes(role)) return name;
        }

        return null;
    }

    static toJsFieldName(value)
    {
        return String(value || "").replace(/^m_/, "");
    }
}
