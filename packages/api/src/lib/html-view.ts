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
  .beam-text {
    white-space: pre-wrap;
    word-break: break-word;
    background: color-mix(in srgb, currentColor 6%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin: 1.5rem 0;
  }
  .meta { font-size: 0.85rem; opacity: 0.65; }
  .error { color: #d33; }
`;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
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
  const remainingNote =
    remaining > 0
      ? `${remaining} view${remaining === 1 ? "" : "s"} remaining`
      : "This was the last view \u2014 it's gone now.";

  return page(
    "beam",
    `
  <p class="meta">Beam · created ${escapeHtml(beam.created_at)}</p>
  <div class="beam-text">${escapeHtml(beam.text)}</div>
  <p class="meta">${escapeHtml(remainingNote)}</p>
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
