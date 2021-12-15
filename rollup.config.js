import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

export default ["content", "popup"].map((name) => ({
  input: `src/${name}.ts`,
  output: {
    name,
    dir: "dist",
    format: "iife",
  },
  plugins: [typescript(), json()],
}));
