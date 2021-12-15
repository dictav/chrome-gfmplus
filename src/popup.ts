import type { Plugin } from "./plugins";
import Plugins from "./plugins";

async function initPluginSetting(plugin: Plugin) {
  const { name, version } = plugin;
  const setting = await plugin.setting();

  document.getElementById(name + "_version")!.textContent = version;

  const sw = document.getElementById(name + "_enabled") as HTMLInputElement;
  sw.checked = setting.enabled;
  sw.addEventListener("change", async function () {
    console.log("enabled", this.checked);
    await plugin.setEnabled(this.checked);
  });

  const lg = document.getElementById(name + "_lang") as HTMLInputElement;
  lg.value = setting.lang;
  lg.addEventListener("change", async function () {
    console.log("lang", this.value);
    await plugin.setLang(this.value);
  });
}

Plugins.forEach(initPluginSetting);
