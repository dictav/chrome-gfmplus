import type { Plugin } from "./plugins";
import Plugins from "./plugins";

type PluginCode = {
  plugin: Plugin;
  lang: string;
  code: string;
  start: number;
  end: number;
};

async function init() {
  // @ts-ignore
  mermaid.mermaidAPI.initialize({ startOnLoad: false });

  const stylesheet = document.createElement("link");
  stylesheet.href = chrome.runtime.getURL("katex/katex.min.css");
  stylesheet.rel = "stylesheet";
  document.head.appendChild(stylesheet);

  observePre();
  observeIssueBody();
  observeNewComment();
  observeNewCodeAndGist();
}

async function observePre() {
  for (const plugin of Plugins) {
    const setting = await plugin.setting();
    const sources = document.querySelectorAll(`pre[lang=${setting.lang}]`);

    for (let i = 0; i < sources.length; i++) {
      renderPreElem(sources[i] as HTMLPreElement, plugin, `${i}`);
    }
  }

  // loop
  setTimeout(observePre, 1000);
}

function observeIssueBody() {
  const textareaList = document.querySelectorAll(
    "textarea[id^=issue][id$=body]"
  );

  for (const item of Array.from(textareaList)) {
    const textarea = item as HTMLTextAreaElement;
    previewPluginInTextarea(textarea);
  }

  // loop
  setTimeout(observeIssueBody, 500);
}

function observeNewComment() {
  const textareaList = document.querySelectorAll("textarea#new_comment_field");

  for (const item of Array.from(textareaList)) {
    const textarea = item as HTMLTextAreaElement;
    previewPluginInTextarea(textarea);
  }

  // loop
  setTimeout(observeNewComment, 500);
}

function observeNewCodeAndGist() {
  const codeMirrorList = document.querySelectorAll(
    ".CodeMirror-code[contentEditable]"
  );

  for (const item of Array.from(codeMirrorList)) {
    const div = item as HTMLDivElement;
    previewPluginInCodeMirror(div);
  }

  // loop
  setTimeout(observeNewCodeAndGist, 500);
}

const previewCodeCache: { [key: string]: string } = {};

async function previewPluginInTextarea(textarea: HTMLTextAreaElement) {
  const preview = getPreviewElem(textarea);
  const pluginCodes = await getPluginCodes(textarea.value);

  if (pluginCodes.length === 0) {
    preview.classList.add("hidden");
    return;
  }

  preview.classList.remove("hidden");

  const pos = textarea.selectionStart;
  let pluginCode = pluginCodes[0];

  for (const c of pluginCodes) {
    if (c.start <= pos && pos <= c.end) {
      pluginCode = c;
      break;
    }
  }

  const { plugin, code } = pluginCode;

  if (code === previewCodeCache[textarea.id]) {
    return;
  }

  previewCodeCache[textarea.id] = code;

  plugin.render(preview, code);
}

async function previewPluginInCodeMirror(codeMirror: HTMLDivElement) {
  const id = codeMirror.id;
  const lines = Array.from(codeMirror.querySelectorAll("pre.CodeMirror-line"));
  const value = lines.map((line) => line.textContent).join("\n");

  const pluginCodes = await getPluginCodes(value);

  if (pluginCodes.length === 0) {
    return;
  }

  let pluginCode = pluginCodes[0];
  let pos = 0;

  const sel = document.getSelection();
  const node = sel?.focusNode?.parentNode;
  if (sel && node) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // @ts-ignore: typescript does not allow comparing ParentNode and ChildNode
      if (Array.from(line.childNodes).includes(node)) {
        break;
      }

      pos += line.textContent!.length + 1;
    }

    pos += sel.focusOffset;
  }

  for (const c of pluginCodes) {
    if (c.start <= pos && pos <= c.end) {
      pluginCode = c;
      break;
    }
  }

  const { plugin, code } = pluginCode;

  if (code === previewCodeCache[id]) {
    return;
  }

  previewCodeCache[id] = code;

  /* .CodeMirror <-------------- target element
   *  └── .CodeMirror-scroll
   *       └── .CodeMirror-sizer
   *            └── div
   *                └── .CodeMirror-lines
   *                     └── div[role=presentation]
   *                         └── .CodeMirror-code  <-- codeMirror
   */
  const elem = getPreviewElem(
    codeMirror.parentElement!.parentElement!.parentElement!.parentElement!
      .parentElement!.parentElement!
  );

  plugin.render(elem, code);
}

async function getPluginCodes(value: string): Promise<PluginCode[]> {
  const langPluginMap = new Map();

  for (const plugin of Plugins) {
    const setting = await plugin.setting();
    if (setting.enabled) {
      langPluginMap.set(setting.lang, plugin);
    }
  }

  if (langPluginMap.size === 0) {
    return [];
  }

  const cond = "(" + Array.from(langPluginMap.keys()).join("|") + ")";
  const re = new RegExp("^```" + cond + "\n[^`]*```", "gm");
  const m = Array.from(value.matchAll(re));

  if (!m) {
    return [];
  }

  const codes = [];

  for (let i = 0; i < m.length; i++) {
    const code = m[i][0];
    const lang = m[i][1];
    const start = value.indexOf(code);
    codes[i] = {
      plugin: langPluginMap.get(lang),
      lang,
      code: code.substring(lang.length + 4, code.length - 3),
      start,
      end: start + code.length,
    };
  }

  return codes;
}

function getPreviewElem(codeElem: HTMLElement): HTMLElement {
  const wrapperId = "gfmplus_preview_wrapper_" + codeElem.id;
  const previewId = "gfmplus_preview_" + codeElem.id;

  if (codeElem.parentElement!.id !== wrapperId) {
    const wrapper = document.createElement("div");
    const preview = document.createElement("div");

    wrapper.id = wrapperId;
    wrapper.classList.add("gfmplus-preview-wrapper");
    preview.id = previewId;
    preview.classList.add("gfmplus-preview");

    codeElem.before(wrapper);
    wrapper.appendChild(codeElem);
    wrapper.appendChild(preview);
  }

  const preview = document.getElementById(previewId);

  if (!preview) {
    throw new Error("there is no preview element");
  }

  return preview;
}

function renderPreElem(src: HTMLPreElement, plugin: Plugin, id: string) {
  if (src.getAttribute("gfmplus-rendered")) {
    return;
  }

  const code = src.querySelector("code")!.textContent!;
  src.setAttribute("gfmplus-rendered", "true");

  const wrapper = document.createElement("div");
  wrapper.classList.add("gfmplus-render-wrapper");

  src.before(wrapper);

  const tabs = document.createElement("ul");
  tabs.classList.add("gfmplus-render-tabs");
  const graphTab = document.createElement("li");
  graphTab.textContent = "graph";
  graphTab.classList.add("active");
  const srcTab = document.createElement("li");
  srcTab.textContent = "code";

  tabs.appendChild(graphTab);
  tabs.appendChild(srcTab);

  const renderBox = document.createElement("div");
  renderBox.classList.add("gfmplus-render");
  const graph = document.createElement("div");
  graph.id = `gfmplus_render_graph_${plugin.name}_${id}`;
  graph.classList.add("active");

  renderBox.appendChild(graph);
  renderBox.appendChild(src);

  wrapper.appendChild(tabs);
  wrapper.appendChild(renderBox);

  graphTab.addEventListener("click", function () {
    graphTab.classList.add("active");
    graph.classList.add("active");
    srcTab.classList.remove("active");
    src.classList.remove("active");
  });

  srcTab.addEventListener("click", function () {
    graphTab.classList.remove("active");
    graph.classList.remove("active");
    srcTab.classList.add("active");
    src.classList.add("active");
  });

  plugin.render(graph, code);
}

init();
