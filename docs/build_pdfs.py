#!/usr/bin/env python3
"""Render the ElkaTech documentation Markdown sources to professional PDFs.

No third-party Python packages required. The script converts a controlled
subset of Markdown to styled HTML (cover page, auto table of contents, print
CSS with page numbers + footer), then Google Chrome headless renders each HTML
to PDF. Re-run after editing any docs/*.md source:

    python3 docs/build_pdfs.py

Markdown supported: ATX headings (#..####), paragraphs, **bold**, *italic*,
`code`, fenced ``` code blocks, - / 1. lists (one nested level), > blockquotes,
GitHub pipe tables, and a `<!-- pagebreak -->` marker.
"""
import html
import os
import re
import subprocess
import sys

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# (markdown source, output pdf, document title, version, date)
DOCS = [
    ("ElkaTech_PRD.md", "ElkaTech_PRD.pdf", "Product Requirements Document"),
    ("ElkaTech_TRD.md", "ElkaTech_TRD.pdf", "Technical Requirements Document"),
    ("ElkaTech_App_Flow_UI_UX.md", "ElkaTech_App_Flow_UI_UX.pdf", "App Flow & UI/UX Flow"),
    ("ElkaTech_Schema_Design.md", "ElkaTech_Schema_Design.pdf", "Database Schema Design"),
]

PROJECT = "ElkaTech Launchpad — Service Platform"
DOC_DATE = "11 June 2026"
DOC_VERSION = "v2.0"

CSS = r"""
:root{
  --ink:#1c2430; --soft:#48566a; --faint:#7a8699; --line:#e4e8ef;
  --line2:#cfd6e2; --accent:#b4612a; --accent2:#8f4a1f; --panel:#f6f8fb;
  --head:#11253b;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  font-family:-apple-system,"Helvetica Neue","Segoe UI",Roboto,Arial,sans-serif;
  color:var(--ink); font-size:10.5pt; line-height:1.5;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
@page{
  size:A4; margin:18mm 16mm 20mm 16mm;
  @bottom-center{
    content:"ElkaTech Launchpad  ·  Confidential  ·  Page " counter(page) " of " counter(pages);
    font-family:-apple-system,Arial,sans-serif; font-size:8pt; color:#7a8699;
  }
}
@page cover{ margin:0; @bottom-center{content:none;} }

/* ---- Cover ---- */
.cover{
  page:cover; height:297mm; width:100%; position:relative;
  background:linear-gradient(150deg,#10202f 0%,#16314a 55%,#1f2a38 100%);
  color:#f4f1ea; padding:46mm 22mm; break-after:page;
}
.cover .mark{
  width:60px;height:60px;border:2.5px solid var(--accent);border-radius:14px;
  display:flex;align-items:center;justify-content:center;margin-bottom:30mm;
}
.cover .mark span{font-size:26px;font-weight:800;color:#f4f1ea;letter-spacing:1px;}
.cover .kicker{font-size:11pt;letter-spacing:.32em;text-transform:uppercase;color:#caa078;margin-bottom:10mm;}
.cover h1{font-size:34pt;line-height:1.12;margin:0 0 6mm;font-weight:800;color:#ffffff;}
.cover .project{font-size:14pt;color:#cdd7e3;margin:0 0 28mm;font-weight:500;}
.cover .meta{position:absolute;left:22mm;bottom:30mm;font-size:10.5pt;color:#aab8c8;}
.cover .meta b{color:#f4f1ea;font-weight:600;}
.cover .rule{width:64mm;height:3px;background:var(--accent);margin:0 0 8mm;border-radius:2px;}

/* ---- TOC ---- */
.toc{break-after:page;}
.toc h2{border:none;color:var(--head);font-size:19pt;margin:0 0 8mm;}
.toc ol{list-style:none;counter-reset:toc;margin:0;padding:0;}
.toc li{counter-increment:toc;padding:2.6mm 0;border-bottom:1px solid var(--line);font-size:11pt;color:var(--soft);}
.toc li::before{content:counter(toc) ".  ";color:var(--accent);font-weight:700;}
.toc li.sub{padding-left:9mm;font-size:10pt;color:var(--faint);border-bottom:1px dotted var(--line);counter-increment:none;}
.toc li.sub::before{content:"–  ";color:var(--line2);}

/* ---- Body ---- */
.content{padding-top:2mm;}
h1{font-size:20pt;color:var(--head);margin:0 0 4mm;}
h2{
  font-size:15.5pt;color:var(--head);margin:9mm 0 3mm;padding-bottom:2mm;
  border-bottom:2px solid var(--accent); break-after:avoid;
}
h3{font-size:12pt;color:var(--accent2);margin:6mm 0 2mm;break-after:avoid;}
h4{font-size:10.5pt;color:var(--head);margin:4mm 0 1.5mm;font-weight:700;break-after:avoid;}
p{margin:0 0 2.6mm;}
ul,ol{margin:0 0 3mm;padding-left:6.5mm;}
li{margin:0 0 1.4mm;}
li > ul,li > ol{margin:1.2mm 0 0;}
strong{color:var(--head);font-weight:700;}
code{
  font-family:"SF Mono",Menlo,Consolas,monospace;font-size:8.6pt;
  background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:.3mm 1.2mm;color:var(--accent2);
}
pre{
  background:#0f1b29;color:#e7edf5;border-radius:7px;padding:4mm 5mm;margin:0 0 4mm;
  font-family:"SF Mono",Menlo,Consolas,monospace;font-size:8.4pt;line-height:1.45;
  white-space:pre-wrap;word-break:break-word;break-inside:avoid;
}
pre code{background:none;border:none;color:inherit;padding:0;font-size:inherit;}
blockquote{
  margin:0 0 4mm;padding:2.4mm 5mm;border-left:3px solid var(--accent);
  background:var(--panel);color:var(--soft);border-radius:0 6px 6px 0;
}
blockquote p{margin:0;}
hr{border:none;border-top:1px solid var(--line);margin:5mm 0;}
table{
  width:100%;border-collapse:collapse;margin:0 0 4mm;font-size:8.7pt;
  table-layout:fixed;break-inside:auto;
}
th,td{
  border:1px solid var(--line2);padding:1.7mm 2.2mm;text-align:left;vertical-align:top;
  word-break:break-word;overflow-wrap:anywhere;
}
th{background:#eef2f7;color:var(--head);font-weight:700;font-size:8.3pt;text-transform:uppercase;letter-spacing:.02em;}
tr:nth-child(even) td{background:#fafbfd;}
tr{break-inside:avoid;}
.page-break{break-after:page;}
.lead{font-size:11pt;color:var(--soft);margin-bottom:5mm;}
"""


# ----------------------------------------------------------------------------
# Minimal, controlled Markdown -> HTML
# ----------------------------------------------------------------------------
def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", lambda m: "<code>" + m.group(1) + "</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", text)
    return text


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


_PAGEBREAKS = ("<!-- pagebreak -->", "<!--pagebreak-->")


def unwrap(md):
    """Join soft-wrapped continuation lines so a wrapped list item or paragraph
    becomes one logical line. Code fences, headings, tables, blockquotes, list
    markers, rules, and page breaks always start a fresh line."""
    lines = md.split("\n")
    out = []
    in_code = False
    for ln in lines:
        s = ln.strip()
        if s.startswith("```"):
            in_code = not in_code
            out.append(ln)
            continue
        if in_code or s == "":
            out.append(ln)
            continue
        is_starter = (
            s.startswith("#") or s.startswith(">") or "|" in s
            or re.match(r"^([-*]|\d+\.)\s", s) is not None
            or re.match(r"^-{3,}$", s) is not None
            or s.lower() in _PAGEBREAKS
        )
        if out and out[-1].strip() != "" and not is_starter:
            prev = out[-1].strip()
            prev_protected = (
                prev.startswith("#") or "|" in prev or prev.startswith("```")
                or prev.lower() in _PAGEBREAKS
            )
            if not prev_protected:
                out[-1] = out[-1].rstrip() + " " + s
                continue
        out.append(ln)
    return "\n".join(out)


def convert(md):
    md = unwrap(md)
    lines = md.split("\n")
    out = []
    toc = []  # (level, title, slug)
    i = 0
    n = len(lines)

    def flush_table(block):
        rows = [r for r in block if r.strip()]
        if len(rows) < 2:
            return
        def cells(r):
            r = r.strip()
            if r.startswith("|"):
                r = r[1:]
            if r.endswith("|"):
                r = r[:-1]
            return [c.strip() for c in r.split("|")]
        header = cells(rows[0])
        body = rows[2:]
        out.append("<table><thead><tr>")
        for h in header:
            out.append("<th>" + inline(h) + "</th>")
        out.append("</tr></thead><tbody>")
        for r in body:
            out.append("<tr>")
            for c in cells(r):
                out.append("<td>" + inline(c) + "</td>")
            out.append("</tr>")
        out.append("</tbody></table>")

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # page break marker
        if stripped.lower() in ("<!-- pagebreak -->", "<!--pagebreak-->"):
            out.append('<div class="page-break"></div>')
            i += 1
            continue
        # blank
        if not stripped:
            i += 1
            continue
        # fenced code
        if stripped.startswith("```"):
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(html.escape(lines[i], quote=False))
                i += 1
            i += 1
            out.append("<pre><code>" + "\n".join(buf) + "</code></pre>")
            continue
        # headings
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            title = m.group(2).strip()
            slug = slugify(title)
            if level in (2, 3):
                toc.append((level, title, slug))
            out.append(f'<h{level} id="{slug}">' + inline(title) + f"</h{level}>")
            i += 1
            continue
        # horizontal rule
        if re.match(r"^-{3,}$", stripped):
            out.append("<hr>")
            i += 1
            continue
        # table (line with | and next line is separator)
        if "|" in stripped and i + 1 < n and re.match(r"^\s*\|?[\s:|-]+\|[\s:|-]*$", lines[i + 1]):
            block = []
            while i < n and "|" in lines[i] and lines[i].strip():
                block.append(lines[i])
                i += 1
            flush_table(block)
            continue
        # blockquote
        if stripped.startswith(">"):
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip()[1:].strip())
                i += 1
            out.append("<blockquote><p>" + inline(" ".join(buf)) + "</p></blockquote>")
            continue
        # lists (supports one nested level by indentation)
        if re.match(r"^\s*([-*]|\d+\.)\s+", line):
            list_lines = []
            while i < n and (re.match(r"^\s*([-*]|\d+\.)\s+", lines[i]) or
                             (lines[i].strip() and lines[i].startswith("   ") and list_lines)):
                list_lines.append(lines[i])
                i += 1
            out.append(render_list(list_lines))
            continue
        # paragraph
        buf = []
        while i < n and lines[i].strip() and not re.match(r"^(#{1,4}\s|```|>|\s*([-*]|\d+\.)\s)", lines[i]) \
                and "|" not in lines[i] and lines[i].strip().lower() not in ("<!-- pagebreak -->",):
            buf.append(lines[i].strip())
            i += 1
        if buf:
            out.append("<p>" + inline(" ".join(buf)) + "</p>")
        else:
            i += 1

    return "\n".join(out), toc


def render_list(list_lines):
    # Determine ordered vs unordered from first marker.
    first = list_lines[0].lstrip()
    ordered = bool(re.match(r"^\d+\.", first))
    tag = "ol" if ordered else "ul"
    html_out = [f"<{tag}>"]
    idx = 0
    while idx < len(list_lines):
        ln = list_lines[idx]
        indent = len(ln) - len(ln.lstrip())
        m = re.match(r"^\s*(?:[-*]|\d+\.)\s+(.*)$", ln)
        content = inline(m.group(1)) if m else inline(ln.strip())
        # gather nested
        nested = []
        j = idx + 1
        while j < len(list_lines):
            nl = list_lines[j]
            nindent = len(nl) - len(nl.lstrip())
            if nindent > indent and re.match(r"^\s*(?:[-*]|\d+\.)\s+", nl):
                nested.append(nl)
                j += 1
            else:
                break
        html_out.append("<li>" + content)
        if nested:
            html_out.append(render_list(nested))
        html_out.append("</li>")
        idx = j
    html_out.append(f"</{tag}>")
    return "".join(html_out)


def build_html(title, body_md):
    body_html, toc = convert(body_md)
    toc_items = []
    for level, t, slug in toc:
        cls = "sub" if level == 3 else ""
        toc_items.append(f'<li class="{cls}">{html.escape(t)}</li>')
    toc_html = "<ol>" + "".join(toc_items) + "</ol>" if toc_items else ""

    cover = f"""
    <div class="cover">
      <div class="mark"><span>E</span></div>
      <div class="kicker">ElkaTech Launchpad</div>
      <div class="rule"></div>
      <h1>{html.escape(title)}</h1>
      <div class="project">{html.escape(PROJECT)}</div>
      <div class="meta">
        <div><b>Document:</b> {html.escape(title)}</div>
        <div><b>Project:</b> ElkaTech Launchpad</div>
        <div><b>Version:</b> {DOC_VERSION}</div>
        <div><b>Date:</b> {DOC_DATE}</div>
        <div><b>Status:</b> Current — feature/owner-support-roles</div>
      </div>
    </div>"""

    toc_section = f'<section class="toc"><h2>Table of Contents</h2>{toc_html}</section>' if toc_html else ""

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>{CSS}</style></head>
<body>{cover}{toc_section}<main class="content">{body_html}</main></body></html>"""


def main():
    ok = True
    for md_name, pdf_name, title in DOCS:
        md_path = os.path.join(DOCS_DIR, md_name)
        if not os.path.exists(md_path):
            print(f"!! missing source: {md_name}")
            ok = False
            continue
        with open(md_path, encoding="utf-8") as f:
            md = f.read()
        html_doc = build_html(title, md)
        html_path = os.path.join("/tmp", pdf_name.replace(".pdf", ".html"))
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_doc)
        pdf_path = os.path.join(DOCS_DIR, pdf_name)
        subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
             f"--print-to-pdf={pdf_path}", f"file://{html_path}"],
            check=True, capture_output=True,
        )
        size = os.path.getsize(pdf_path)
        print(f"OK  {pdf_name}  ({size:,} bytes)")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
