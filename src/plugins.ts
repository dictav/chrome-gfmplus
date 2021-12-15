// @ts-ignore
import mermaidPkg from "../node_modules/mermaid/package.json";
// @ts-ignore
import katexPkg from "../node_modules/katex/package.json";

function pluginKey(plugin: string): string {
  return "plugins/" + plugin;
}

export type PluginSetting = {
  lang: string;
  enabled: boolean;
};

type renderFunc = (elem: HTMLElement, code: string) => void;

export class Plugin {
  name = "unknown";
  version = "unknown";
  render: renderFunc = () => {};

  constructor(name: string, version: string, render: renderFunc) {
    this.name = name;
    this.version = version;
    this.render = render;
  }

  async setting(): Promise<PluginSetting> {
    const plugin = this.name;

    return new Promise(function (resolve) {
      const key = pluginKey(plugin);
      let setting: PluginSetting;

      chrome.storage.sync.get(key, async function (store) {
        setting = store[key];

        if (!setting) {
          setting = { lang: plugin, enabled: true };
          await chrome.storage.sync.set({ [key]: setting });
        }

        resolve(setting);
      });
    });
  }

  async setEnabled(enabled: boolean) {
    const key = pluginKey(this.name);
    const setting = await this.setting();
    setting.enabled = enabled;
    return chrome.storage.sync.set({ [key]: setting });
  }

  async setLang(lang: string) {
    const key = pluginKey(this.name);
    const setting = await this.setting();
    setting.lang = lang || this.name;
    return chrome.storage.sync.set({ [key]: setting });
  }
}

async function renderMermaid(preview: HTMLElement, code: string) {
  // @ts-ignore
  const { render } = mermaid.mermaidAPI;

  try {
    render(preview.id + "_mermaid", code, function (svgCode: string) {
      preview.innerHTML = svgCode;
      preview.firstElementChild!.removeAttribute("height");
    });
  } catch (err) {
    preview.innerHTML = (err as Error).message;
  }
}

async function renderKaTeX(preview: HTMLElement, code: string) {
  // @ts-ignore
  const { renderToString } = katex;

  try {
    preview.innerHTML = renderToString(code, {
      throwOnError: true,
      displayMode: true,
      output: "html",
    });
  } catch (e) {
    preview.innerHTML = (e as Error).message;
  }
}

const Plugins: Plugin[] = [
  new Plugin("mermaid", mermaidPkg.version, renderMermaid),
  new Plugin("katex", katexPkg.version, renderKaTeX),
];

export default Plugins;
