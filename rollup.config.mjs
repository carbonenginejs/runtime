import { babel } from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";

const external = id => id.startsWith("@carbonenginejs/")
  || id.startsWith("node:")
  || id === "meshoptimizer"
  || id.startsWith("meshoptimizer/")
  || id === "yaml";

export default {
  input: [
    "src/index.js",
    "src/generated/resources/index.js",
    "src/formats/index.js",
    "src/formats/black/index.js",
    "src/formats/black/core/blackSchema.js",
    "src/formats/black/core/blackEnums.js",
    "src/formats/black/core/blackVersion.js",
    "src/formats/bnk/index.js",
    "src/formats/cmf/index.js",
    "src/formats/dds/index.js",
    "src/formats/fbx/index.js",
    "src/formats/flac/index.js",
    "src/formats/gif/index.js",
    "src/formats/gltf/index.js",
    "src/formats/jpeg/index.js",
    "src/formats/mp3/index.js",
    "src/formats/mp4/index.js",
    "src/formats/obj/index.js",
    "src/formats/ogg/index.js",
    "src/formats/png/index.js",
    "src/formats/red/index.js",
    "src/formats/red/core/blackDefinitions.js",
    "src/formats/stl/index.js",
    "src/formats/tga/index.js",
    "src/formats/wav/index.js",
    "src/formats/webm/index.js",
    "src/formats/webp/index.js",
    "src/formats/wem/index.js",
    "src/formats/yaml/index.js"
  ],
  external,
  output: {
    dir: "npm/dist",
    format: "esm",
    preserveModules: true,
    preserveModulesRoot: "src",
    sourcemap: true
  },
  plugins: [
    json({ compact: true }),
    babel({
      babelHelpers: "bundled",
      extensions: [".js"],
      babelrc: false,
      configFile: false,
      plugins: [
        ["@babel/plugin-proposal-decorators", { version: "2023-11" }]
      ]
    })
  ]
};
