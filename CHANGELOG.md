# Changelog

All notable changes to **fountain2fdx** are documented here.

## [0.1.0] – 2026-03-24

### Added
- Core Fountain parser (`src/parser.js`) supporting:
  - Title page key/value pairs
  - Scene headings (`INT.` / `EXT.` / `EST.` / `INT./EXT.` / `I/E`) and forced headings (`.`)
  - Action paragraphs, forced action (`!`)
  - Character cues (all-caps), dual dialogue (`^`), V.O. / O.S. extensions
  - Dialogue and parentheticals
  - Transitions (ending in `TO:`, `FADE OUT.`, `FADE TO BLACK.`, forced with `>`)
  - Centered text (`> text <`)
  - Lyrics (`~`)
  - Section headings (`#`), synopses (`=`), page breaks (`===`)
  - Boneyard (`/* */`) removal, inline note (`[[...]]`) removal
- FDX converter (`src/converter.js`) with:
  - Full `<FinalDraft>` XML output
  - Inline markup: **bold**, *italic*, ***bold+italic***, _underline_
  - Optional `<TitlePage>` block
- CLI tool (`bin/fountain2fdx`) — run `fountain2fdx input.fountain [output.fdx]`
- VS Code extension (`extension.js`) with:
  - Command **Fountain to FDX: Convert File** (Command Palette)
  - Right-click context menu for `.fountain` files in the Explorer and editor
  - Success notification with **Open File** action
