import { cpSync, readdirSync } from "fs";

const items = readdirSync("static");

for (const item of items) {
  const fn = "static/" + item;
  console.log("copy", fn);
  cpSync(fn, "dist/" + item, { recursive: true });
}

console.log("copy done");
