// markdown.js - very small, safe-ish renderer for code fences and inline code

function escapeHtml(text){
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderMarkdownLite(src){
  if (!src) return '';
  let out = '';
  let i = 0;
  while (i < src.length){
    const fenceStart = src.indexOf('```', i);
    if (fenceStart === -1){
      out += renderInlineCode(src.slice(i));
      break;
    }
    // text before fence
    out += renderInlineCode(src.slice(i, fenceStart));

    // find fence end
    // language line may be like ```python\n
    const langLineEnd = src.indexOf('\n', fenceStart + 3);
    if (langLineEnd === -1){
      // no newline after fence start; treat as text
      out += renderInlineCode(src.slice(fenceStart));
      break;
    }
    const langRaw = src.slice(fenceStart + 3, langLineEnd).trim();
    const lang = /^[A-Za-z0-9_\-+.]+$/.test(langRaw) ? langRaw : '';
    const fenceEnd = src.indexOf('```', langLineEnd + 1);
    if (fenceEnd === -1){
      // no closing fence yet; render as text
      out += renderInlineCode(src.slice(fenceStart));
      break;
    }
    const code = src.slice(langLineEnd + 1, fenceEnd);
    const label = lang ? `<span class="header">${escapeHtml(lang)}</span>` : '';
    out += `<div class="codeblock">${label}<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(code)}</code></pre></div>`;
    i = fenceEnd + 3;
  }
  return out;
}

function renderInlineCode(text){
  // Escape entire text, then restore inline code spans
  // Replace `code` with <code>code</code>
  // Handle multiple occurrences, avoid nested backticks
  let result = '';
  let cursor = 0;
  while (cursor < text.length){
    const tick = text.indexOf('`', cursor);
    if (tick === -1){
      result += escapeHtml(text.slice(cursor));
      break;
    }
    const next = text.indexOf('`', tick + 1);
    if (next === -1){
      result += escapeHtml(text.slice(cursor));
      break;
    }
    // before code
    result += escapeHtml(text.slice(cursor, tick));
    const code = text.slice(tick + 1, next);
    result += `<code>${escapeHtml(code)}</code>`;
    cursor = next + 1;
  }
  return result;
}


