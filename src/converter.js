/**
 * Convert a parsed Fountain token list to Final Draft FDX XML.
 *
 * FDX spec reference: Final Draft 11/12 XML format.
 * Each Paragraph has a Type attribute and one or more Text children.
 * Inline styles (bold, italic, underline) use the Style attribute on Text.
 */

'use strict';

/** Map Fountain token types → FDX Paragraph Type attribute values */
const FDX_TYPE_MAP = {
  scene_heading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  parenthetical: 'Parenthetical',
  transition: 'Transition',
  centered: 'Action',
  lyrics: 'Action',
};

/** Escape characters that are special in XML. */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Parse Fountain inline markup into an array of styled segments.
 *
 * Fountain inline markup:
 *   ***text***  → Bold+Italic
 *   **text**    → Bold
 *   *text*      → Italic
 *   _text_      → Underline
 *
 * @param {string} text
 * @returns {Array<{ text: string, style: string|null }>}
 */
function parseInlineMarkup(text) {
  const segments = [];
  // Order matters: bold+italic must be checked before bold or italic
  const re = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;
  let lastIndex = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    // Emit any plain text before this match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), style: null });
    }

    if (match[1] !== undefined) {
      segments.push({ text: match[1], style: 'Bold+Italic' });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], style: 'Bold' });
    } else if (match[3] !== undefined) {
      segments.push({ text: match[3], style: 'Italic' });
    } else if (match[4] !== undefined) {
      segments.push({ text: match[4], style: 'Underline' });
    }

    lastIndex = re.lastIndex;
  }

  // Emit any remaining plain text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), style: null });
  }

  // Ensure at least one segment so empty strings are represented
  if (segments.length === 0) {
    segments.push({ text, style: null });
  }

  return segments;
}

/**
 * Render a text string as one or more FDX <Text> XML elements.
 *
 * @param {string} text
 * @param {string|null} defaultStyle - Style attribute for plain (unstyled) runs.
 *   Pass 'AllCaps' for Scene Heading / Character, '' for everything else.
 * @returns {string} XML fragment
 */
function renderTextElements(text, defaultStyle) {
  return parseInlineMarkup(text)
    .map(({ text: t, style }) => {
      const escaped = escapeXml(t);
      const resolvedStyle = style !== null ? style : defaultStyle;
      return resolvedStyle !== undefined && resolvedStyle !== null
        ? `<Text Style="${resolvedStyle}">${escaped}</Text>`
        : `<Text>${escaped}</Text>`;
    })
    .join('');
}

/**
 * Convert a single parsed token to an FDX <Paragraph> element string,
 * or null if the token has no FDX representation.
 *
 * @param {Object} token
 * @returns {string|null}
 */
function tokenToParagraph(token) {
  const fdxType = FDX_TYPE_MAP[token.type];
  if (!fdxType) return null;

  // Scene Heading and Character text is rendered AllCaps; all other plain runs
  // get an explicit empty Style attribute to match Final Draft conventions.
  const isAllCaps = token.type === 'scene_heading' || token.type === 'character';
  const defaultStyle = isAllCaps ? 'AllCaps' : '';

  const textXml = renderTextElements(token.text || '', defaultStyle);
  return `    <Paragraph Type="${fdxType}" Alignment="Left">\n      ${textXml}\n    </Paragraph>`;
}

/**
 * Build the optional <TitlePage> XML block from title-page key/value pairs.
 * Returns null when there are no recognised title-page fields.
 *
 * @param {Object.<string,string>} titlePage
 * @returns {string|null}
 */
function buildTitlePage(titlePage) {
  if (!titlePage || Object.keys(titlePage).length === 0) return null;

  const rows = [];

  const title = titlePage['Title'];
  const credit = titlePage['Credit'];
  const author = titlePage['Author'] || titlePage['Authors'];
  const source = titlePage['Source'];
  const contact = titlePage['Contact'];
  const notes = titlePage['Notes'];

  if (title) {
    rows.push(
      `      <Paragraph Alignment="Center"><Text>${escapeXml(title)}</Text></Paragraph>`
    );
  }
  if (credit) {
    rows.push(
      `      <Paragraph Alignment="Center"><Text>${escapeXml(credit)}</Text></Paragraph>`
    );
  }
  if (author) {
    rows.push(
      `      <Paragraph Alignment="Center"><Text>${escapeXml(author)}</Text></Paragraph>`
    );
  }
  if (source) {
    rows.push(
      `      <Paragraph Alignment="Center"><Text>${escapeXml(source)}</Text></Paragraph>`
    );
  }
  if (notes) {
    rows.push(
      `      <Paragraph Alignment="Left"><Text>${escapeXml(notes)}</Text></Paragraph>`
    );
  }
  if (contact) {
    rows.push(
      `      <Paragraph Alignment="Left"><Text>${escapeXml(contact)}</Text></Paragraph>`
    );
  }

  if (rows.length === 0) return null;

  return (
    '  <TitlePage>\n' +
    '    <Content>\n' +
    rows.join('\n') +
    '\n    </Content>\n' +
    '  </TitlePage>'
  );
}

/**
 * Convert a parsed Fountain result to an FDX XML string.
 *
 * @param {{ title_page: Object, tokens: Array }} parsed
 * @returns {string} FDX XML document
 */
function convert(parsed) {
  const { title_page, tokens } = parsed;

  const paragraphLines = tokens
    .map(tokenToParagraph)
    .filter(Boolean)
    .join('\n');

  const titlePageXml = buildTitlePage(title_page);

  const parts = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>',
    '<FinalDraft DocumentType="Script" Template="No" Version="1">',
    '  <Content>',
    paragraphLines,
    '  </Content>',
  ];

  if (titlePageXml) parts.push(titlePageXml);
  parts.push('</FinalDraft>');
  parts.push('');

  return parts.join('\n');
}

module.exports = { convert, parseInlineMarkup };
