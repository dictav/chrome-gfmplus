import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";

(function install_mermaid() {
  console.log("install mermaid");
  ["mermaid.min.js", "mermaid.min.js.LICENSE.txt"].forEach((fn) => {
    cpSync("./node_modules/mermaid/dist/" + fn, "dist/mermaid/" + fn);
  });
})();

(function install_katex() {
  console.log("install katex");
  const dir = "./node_modules/katex/dist/";

  ["katex.min.css", "katex.min.js"].forEach((fn) => {
    cpSync(dir + fn, "dist/katex/" + fn);
  });

  readdirSync(dir + "fonts")
    .filter((font) => font.endsWith(".woff2"))
    .forEach((font) => {
      cpSync(dir + "fonts/" + font, "dist/katex/fonts/" + font);
    });
})();

console.log("install done");
