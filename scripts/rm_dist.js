import { readdirSync, rmSync } from "fs";

const items = readdirSync("dist");

for (const item of items) {
  const fn = "dist/" + item;
  console.log("remove", fn);
  rmSync(fn, { recursive: true });
}

console.log("remove done");
