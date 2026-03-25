# fountain2fdx

Convert [Fountain](https://fountain.io) screenplay files (`.fountain`) to [Final Draft XML](https://www.finaldraft.com) format (`.fdx`).

Available as both a **CLI tool** and a **VS Code extension**.

---

## Installation

### CLI (global)

```bash
npm install -g fountain2fdx
```

### VS Code Extension

Search for **"Fountain to FDX"** in the VS Code Extensions Marketplace, or install from the command line:

```bash
code --install-extension briday1.fountain2fdx
```

---

## CLI Usage

```
fountain2fdx <input.fountain> [output.fdx]
```

| Argument | Description |
|---|---|
| `input.fountain` | Path to the source Fountain file |
| `output.fdx` | Path for the FDX output *(optional – stdout if omitted)* |

**Options:**

| Flag | Description |
|---|---|
| `-h`, `--help` | Show help |
| `-v`, `--version` | Show version |

### Examples

```bash
# Convert and save as my-script.fdx
fountain2fdx my-script.fountain my-script.fdx

# Convert and print to stdout
fountain2fdx my-script.fountain

# Pipe output
fountain2fdx my-script.fountain | xmllint --format -
```

---

## VS Code Extension Usage

1. Open a `.fountain` file in VS Code.
2. Either:
   - Open the **Command Palette** (`⇧⌘P`) and run **Fountain to FDX: Convert File**, or
   - **Right-click** the `.fountain` file in the Explorer and choose **Fountain to FDX: Convert File**.
3. The converted `.fdx` file is saved alongside the original. A notification offers to open it.

---

## Fountain Format Support

| Element | Syntax | Supported |
|---|---|---|
| Title page | `Key: Value` at document start | ✅ |
| Scene heading | `INT. LOCATION - TIME` | ✅ |
| Forced scene heading | `.LOCATION` | ✅ |
| Action | Plain paragraphs | ✅ |
| Forced action | `!` prefix | ✅ |
| Character | `ALL CAPS` before dialogue | ✅ |
| Dialogue | Lines after character | ✅ |
| Parenthetical | `(text)` in dialogue block | ✅ |
| Dual dialogue | `CHARACTER ^` | ✅ |
| Transition | `CUT TO:` / `FADE OUT.` / `> text` | ✅ |
| Centered | `> text <` | ✅ |
| Lyrics | `~ text` | ✅ |
| Bold | `**text**` | ✅ |
| Italic | `*text*` | ✅ |
| Bold italic | `***text***` | ✅ |
| Underline | `_text_` | ✅ |
| Sections | `# / ## / ###` | ✅ (parsed, not in FDX) |
| Synopsis | `= text` | ✅ (parsed, not in FDX) |
| Page break | `===` | ✅ (parsed, not in FDX) |
| Boneyard | `/* text */` | ✅ (stripped) |
| Notes | `[[text]]` | ✅ (stripped) |

---

## Library Usage

```js
const { fountain2fdx, parse, convert } = require('fountain2fdx/src');

// High-level: fountain text → FDX XML string
const fdxXml = fountain2fdx(fountainText);

// Low-level
const parsed = parse(fountainText);  // { title_page, tokens }
const fdxXml = convert(parsed);
```

---

## Development

```bash
# Run tests
npm test

# Run the CLI locally
node bin/fountain2fdx examples/example.fountain
```

---

## License

MIT