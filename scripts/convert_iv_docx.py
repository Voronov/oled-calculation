#!/usr/bin/env python3
"""Convert a raw source-meter .docx export into the tabular form used for analysis.

The instrument writes each measurement as plain paragraphs:

     .0000V    1.511nA   -1.815nA
    .2000V    116.9nA   -1.613nA

This script applies the same substitutions that were previously done by hand in
Word — drop the "V" suffix, turn the current units into exponent notation —
and converts every contiguous run of data lines into a 3-column table
(V1, I1, I2). Everything else in the document is left in place.

Usage:
    python3 scripts/convert_iv_docx.py INPUT.docx [OUTPUT.docx]
    python3 scripts/convert_iv_docx.py INPUT.docx --tsv OUTDIR   # data only
"""

import re
import shutil
import sys
import zipfile
from pathlib import Path

DOCUMENT = 'word/document.xml'

# Unit suffix → exponent, longest first so "mA" is tried before a bare "A"
UNIT_REPLACEMENTS = [
    ('mA', 'e-3'),
    ('uA', 'e-6'),
    ('nA', 'e-9'),
    ('pA', 'e-12'),
]

# A data line: voltage, then two currents with an optional SI prefix
DATA_LINE = re.compile(
    r'^\s*(-?[\d.]+)V\s+(-?[\d.]+[munp]?A)\s+(-?[\d.]+[munp]?A)\s*$'
)

PARAGRAPH = re.compile(r'<w:p(?: [^>]*)?/>|<w:p(?: [^>]*)?>.*?</w:p>', re.S)
TEXT_NODE = re.compile(r'(<w:t(?: [^>]*)?>)(.*?)(</w:t>)', re.S)

TBL_OPEN = (
    '<w:tbl>'
    '<w:tblPr>'
    '<w:tblW w:w="0" w:type="auto"/>'
    '<w:tblBorders>'
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    '</w:tblBorders>'
    '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1"'
    ' w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
    '</w:tblPr>'
    '<w:tblGrid>'
    '<w:gridCol w:w="2407"/><w:gridCol w:w="2407"/><w:gridCol w:w="2408"/>'
    '</w:tblGrid>'
)

COLUMN_WIDTHS = (2407, 2407, 2408)


def convert_current(token: str) -> str:
    """1.511nA → 1.511e-9 ; 24.39mA → 24.39e-3"""
    for unit, exponent in UNIT_REPLACEMENTS:
        if token.endswith(unit):
            return token[: -len(unit)] + exponent
    return token


def substitute_text(text: str) -> str:
    """The plain find-and-replace pass: units first, then drop every "V"."""
    for unit, exponent in UNIT_REPLACEMENTS:
        text = text.replace(unit, exponent)
    return text.replace('V', '')


def paragraph_text(paragraph_xml: str) -> str:
    raw = ''.join(m.group(2) for m in TEXT_NODE.finditer(paragraph_xml))
    return (raw.replace('&lt;', '<').replace('&gt;', '>')
               .replace('&quot;', '"').replace('&apos;', "'")
               .replace('&amp;', '&'))


def escape(text: str) -> str:
    return (text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))


def build_row(cells: list[str]) -> str:
    parts = ['<w:tr>']
    for width, value in zip(COLUMN_WIDTHS, cells):
        parts.append(
            f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/></w:tcPr>'
            '<w:p><w:pPr><w:rPr><w:lang w:val="en-US"/></w:rPr></w:pPr>'
            '<w:r><w:rPr><w:lang w:val="en-US"/></w:rPr>'
            f'<w:t xml:space="preserve">{escape(value)}</w:t></w:r></w:p></w:tc>'
        )
    parts.append('</w:tr>')
    return ''.join(parts)


def build_table(rows: list[list[str]]) -> str:
    return TBL_OPEN + ''.join(build_row(r) for r in rows) + '</w:tbl>'


def rewrite_paragraph(paragraph_xml: str) -> str:
    """Apply the text substitutions inside an untouched paragraph."""
    return TEXT_NODE.sub(
        lambda m: m.group(1) + escape(substitute_text(paragraph_text(m.group(0)))) + m.group(3),
        paragraph_xml,
    )


def parse_blocks(document_xml: str) -> list[list[list[str]]]:
    """Every contiguous run of data lines, as lists of [V1, I1, I2] strings."""
    blocks: list[list[list[str]]] = []
    current: list[list[str]] = []
    for match in PARAGRAPH.finditer(document_xml):
        hit = DATA_LINE.match(paragraph_text(match.group(0)))
        if hit:
            current.append([hit.group(1),
                            convert_current(hit.group(2)),
                            convert_current(hit.group(3))])
        elif current:
            blocks.append(current)
            current = []
    if current:
        blocks.append(current)
    return blocks


def convert_document_xml(document_xml: str) -> str:
    out: list[str] = []
    pending: list[list[str]] = []
    cursor = 0

    def flush() -> None:
        if pending:
            out.append(build_table(pending))
            pending.clear()

    for match in PARAGRAPH.finditer(document_xml):
        out.append(document_xml[cursor:match.start()])
        cursor = match.end()

        paragraph = match.group(0)
        hit = DATA_LINE.match(paragraph_text(paragraph))
        if hit:
            pending.append([hit.group(1),
                            convert_current(hit.group(2)),
                            convert_current(hit.group(3))])
        else:
            flush()
            out.append(rewrite_paragraph(paragraph))

    flush()
    out.append(document_xml[cursor:])
    return ''.join(out)


def convert_docx(src: Path, dst: Path) -> int:
    with zipfile.ZipFile(src) as zin:
        document_xml = zin.read(DOCUMENT).decode('utf8')
        blocks = parse_blocks(document_xml)
        converted = convert_document_xml(document_xml)

        dst.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == DOCUMENT:
                    data = converted.encode('utf8')
                zout.writestr(item, data)
    return len(blocks)


def write_tsv(src: Path, outdir: Path) -> int:
    with zipfile.ZipFile(src) as zin:
        blocks = parse_blocks(zin.read(DOCUMENT).decode('utf8'))
    outdir.mkdir(parents=True, exist_ok=True)
    for i, rows in enumerate(blocks, 1):
        target = outdir / f'{src.stem}_{i:02d}.txt'
        target.write_text(''.join('\t'.join(r) + '\n' for r in rows))
    return len(blocks)


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 1

    src = Path(argv[1])
    if '--tsv' in argv:
        outdir = Path(argv[argv.index('--tsv') + 1])
        count = write_tsv(src, outdir)
        print(f'{count} blocks → {outdir}')
        return 0

    dst = Path(argv[2]) if len(argv) > 2 else src.with_name(src.stem + '_converted.docx')
    count = convert_docx(src, dst)
    print(f'{count} measurement blocks → {dst}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
