import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs";
import elk from "https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.2.0/dist/mermaid-layout-elk.esm.min.mjs";

mermaid.registerLayoutLoaders(elk);

// Palette mirrors style.css; mermaid's base theme only accepts hex.
const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const c = dark
  ? { bg: "#201e1c", node: "#2b2825", line: "#9c968b", text: "#e8e4dc", cluster: "#1a1917", border: "#4a4640", accent: "#e08a4f" }
  : { bg: "#f1eee7", node: "#ffffff", line: "#6b675f", text: "#1c1b19", cluster: "#f7f5f0", border: "#c9c4b8", accent: "#b4541a" };

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  themeVariables: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    fontSize: "14px",
    background: c.bg,
    primaryColor: c.node,
    primaryTextColor: c.text,
    primaryBorderColor: c.border,
    lineColor: c.line,
    textColor: c.text,
    clusterBkg: c.cluster,
    clusterBorder: c.border,
    edgeLabelBackground: c.bg,
    titleColor: c.text,
  },
  flowchart: { htmlLabels: true, curve: "basis", useMaxWidth: true, nodeSpacing: 36, rankSpacing: 44 },
});

// Mermaid stays the only source. A figure holds one or two <pre class="mermaid"> blocks:
//   data-level="simple"  an authored plain-language diagram (optional)
//   (no data-level)      the detailed diagram; its data-collapse lists subgraph ids that
//                        the intermediate view folds into single nodes
const LABELS = { simple: "Simplified", mid: "Intermediate", detail: "Detailed" };
let seq = 0;

async function draw(fig, level) {
  const { simple, detail, collapse, layout } = fig.sources;
  let src = level === "simple" ? simple : detail;
  if (level === "mid") src += "\n" + collapse.map((id) => `  ${id}@{ view: collapsed }`).join("\n");
  // data-layout="elk" opts a dense diagram into the ELK layout engine.
  if (level !== "simple" && layout) src = `---\nconfig:\n  layout: ${layout}\n---\n` + src;
  const { svg } = await mermaid.render(`diagram-${seq++}`, src);
  fig.querySelector(".render").innerHTML = svg;
  fig.querySelectorAll("button[data-level]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === level)));
}

const want = new URLSearchParams(location.search).get("level");
for (const fig of document.querySelectorAll("figure.diagram")) {
  const text = (pre) => {
    if (!pre) return null;
    // The HTML parser turns <br/> in the source into elements; put them back as text.
    pre.querySelectorAll("br").forEach((b) => b.replaceWith("<br/>"));
    pre.hidden = true;
    return pre.textContent.trim();
  };
  const detailPre = fig.querySelector("pre.mermaid:not([data-level])");
  fig.sources = {
    simple: text(fig.querySelector('pre.mermaid[data-level="simple"]')),
    detail: text(detailPre),
    collapse: (detailPre.dataset.collapse || "").split(/\s+/).filter(Boolean),
    layout: detailPre.dataset.layout,
  };
  const levels = [fig.sources.simple && "simple", fig.sources.collapse.length && "mid", "detail"].filter(Boolean);

  const out = document.createElement("div");
  out.className = "render";
  fig.insertBefore(out, fig.querySelector("figcaption"));
  if (levels.length > 1) {
    const bar = document.createElement("div");
    bar.className = "levels";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Level of detail");
    for (const level of levels) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.level = level;
      b.textContent = LABELS[level];
      b.addEventListener("click", () => draw(fig, level));
      bar.append(b);
    }
    fig.prepend(bar);
  }
  await draw(fig, levels.includes(want) ? want : levels[0]);
}
document.documentElement.dataset.diagrams = "done";
