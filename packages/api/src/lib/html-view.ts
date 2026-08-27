import type { BeamError } from "./errors";
import type { ConsumedBeam } from "./store";

// Minimal inline styling, no external assets or build step — this route is
// meant to render standalone in a browser without any web app dependency.
const BASE_STYLE = `
  :root { color-scheme: light dark; }
  body {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    max-width: 640px;
    margin: 4rem auto;
    padding: 0 1.5rem;
    line-height: 1.5;
  }
  .meta { font-size: 0.85rem; opacity: 0.65; margin: 0.15rem 0; }
  .stats-row { display: flex; flex-wrap: wrap; gap: 0 1.5rem; margin: 0 0 0.75rem; }
  .label { opacity: 0.55; }
  .last-view { color: #d33; opacity: 0.9; }
  .beam-box { position: relative; margin: 0.75rem 0 1.5rem; }
  .beam-text {
    white-space: pre-wrap;
    word-break: break-word;
    background: color-mix(in srgb, currentColor 6%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    padding-right: 3rem;
    margin: 0;
  }
  .copy-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: color-mix(in srgb, currentColor 8%, transparent);
    color: inherit;
    border-radius: 6px;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }
  .copy-btn:hover { background: color-mix(in srgb, currentColor 16%, transparent); }
  .copy-btn svg { width: 15px; height: 15px; flex: none; }
  .copy-btn .icon-check { display: none; }
  .copy-btn.copied { border-color: color-mix(in srgb, #2da44e 50%, transparent); color: #2da44e; }
  .copy-btn.copied .icon-copy { display: none; }
  .copy-btn.copied .icon-check { display: block; }
  .error { color: #d33; }
`;

// Runs inline (no external script file) to keep the page a single request.
const COPY_SCRIPT = `
  const btn = document.getElementById("copy-btn");
  const textEl = document.getElementById("beam-text");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textEl.textContent);
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1500);
    } catch (err) {
      btn.setAttribute("aria-label", "Copy failed");
    }
  });
`;

const COPY_ICON = `
      <svg class="icon-copy" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="5" y="5" width="9" height="9" rx="1.5"/>
        <path d="M3.5 10.5h-1a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v1"/>
      </svg>
      <svg class="icon-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M3 8.5l3 3 7-7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatUtc(iso: string): string {
  return `${iso.slice(0, 16).replace("T", " ")} UTC`;
}

// A generic, static title — never includes beam content or the id, so the
// page can't leak the secret via tab previews, browser history, or window
// titles (the same reasoning password managers use for masked fields).
function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <meta name="referrer" content="no-referrer" />
  <title>${escapeHtml(title)}</title>
  <style>${BASE_STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function renderBeamHtml(beam: ConsumedBeam): string {
  const remaining = beam.views_remaining;
  const viewsNote =
    remaining > 0
      ? `<p class="meta"><span class="label">Views:</span> ${remaining} left</p>`
      : `<p class="meta last-view"><span class="label">Views:</span> gone</p>`;

  return page(
    "beam",
    `
  <div class="stats-row">
    <p class="meta"><span class="label">Beamed:</span> ${escapeHtml(formatUtc(beam.created_at))}</p>
    <p class="meta"><span class="label">Expires:</span> ${escapeHtml(formatUtc(beam.expires_at))}</p>
    ${viewsNote}
  </div>
  <div class="beam-box">
    <pre class="beam-text" id="beam-text">${escapeHtml(beam.text)}</pre>
    <button class="copy-btn" id="copy-btn" type="button" aria-label="Copy beam text">${COPY_ICON}
    </button>
  </div>
  <script>${COPY_SCRIPT}</script>
`,
  );
}

export function renderErrorHtml(error: BeamError): string {
  return page(
    "beam \u2014 not found",
    `
  <p class="error">${escapeHtml(error.message)}</p>
  <p class="meta">This beam has already been viewed, expired, or never existed.</p>
`,
  );
}
