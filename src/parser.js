/**
 * Fountain screenplay format parser.
 *
 * Implements the Fountain spec: https://fountain.io/syntax
 *
 * Parsed token types:
 *   scene_heading, action, character, dialogue, parenthetical,
 *   transition, centered, lyrics, section, synopsis, page_break
 */

'use strict';

const SCENE_HEADING_RE = /^(int|ext|est|int\.\/ext|ext\.\/int|i\/e)[\. ]/i;

// Transitions that are recognised by keyword alone (must be full-line, all-caps)
const NAMED_TRANSITIONS = new Set([
  'FADE OUT.',
  'FADE TO BLACK.',
  'SMASH CUT TO BLACK.',
  'IRIS OUT.',
]);

/**
 * Parse a Fountain format string into a structured object.
 *
 * @param {string} text - Raw Fountain text
 * @returns {{ title_page: Object.<string,string>, tokens: Array }}
 */
function parse(text) {
  // Normalise line endings and strip boneyard (block comments)
  const content = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const lines = content.split('\n');
  const titlePage = {};
  const tokens = [];
  let i = 0;

  // --- Title Page ---
  // Present when the very first non-empty line looks like "Key: value"
  // where the key is NOT all-uppercase (all-uppercase = screenplay element like "CUT TO:")
  // and has a non-empty value or an indented continuation on the next line.
  if (lines[0] && isTitlePageStart(lines[0])) {
    while (i < lines.length && lines[i] !== '') {
      const line = lines[i];
      const match = line.match(/^([\w ][\w ]*?)\s*:\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Multi-line values use indented continuation lines
        while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
          i++;
          value += '\n' + lines[i].trim();
        }
        titlePage[key] = value;
      }
      i++;
    }
    // Skip blank lines that separate title page from body
    while (i < lines.length && lines[i] === '') i++;
  }

  // --- Script Body ---
  while (i < lines.length) {
    // Skip blank lines
    if (lines[i] === '') {
      i++;
      continue;
    }

    const line = lines[i];

    // Inline notes [[...]] are ignored
    if (/^\[\[.*\]\]\s*$/.test(line)) {
      i++;
      continue;
    }

    // Page break: three or more = signs on their own line
    if (/^={3,}\s*$/.test(line)) {
      tokens.push({ type: 'page_break' });
      i++;
      continue;
    }

    // Section heading: # / ## / ###
    if (line.startsWith('#')) {
      const level = (line.match(/^(#+)/) || ['', ''])[1].length;
      tokens.push({ type: 'section', level, text: line.replace(/^#+\s*/, '') });
      i++;
      continue;
    }

    // Synopsis: = text  (but not page break ===)
    if ((line.startsWith('= ') || line === '=') && !/^={3,}/.test(line)) {
      tokens.push({ type: 'synopsis', text: line.slice(1).trim() });
      i++;
      continue;
    }

    // Centered text: > text <
    if (/^>\s*.+\s*<\s*$/.test(line)) {
      tokens.push({
        type: 'centered',
        text: line.replace(/^>\s*/, '').replace(/\s*<\s*$/, '').trim(),
      });
      i++;
      continue;
    }

    // Forced transition: > text  (without trailing <)
    if (line.startsWith('>')) {
      tokens.push({ type: 'transition', text: line.slice(1).trim() });
      i++;
      continue;
    }

    // Forced action: ! prefix
    if (line.startsWith('!')) {
      const actionLines = [line.slice(1)];
      i++;
      while (i < lines.length && lines[i] !== '') {
        actionLines.push(lines[i]);
        i++;
      }
      tokens.push({ type: 'action', text: actionLines.join('\n') });
      continue;
    }

    // Forced scene heading: . prefix (but not ..)
    if (line.startsWith('.') && line.length > 1 && line[1] !== '.') {
      tokens.push({ type: 'scene_heading', text: line.slice(1).trim() });
      i++;
      continue;
    }

    // Scene heading: INT. / EXT. / EST. / INT./EXT. / EXT./INT. / I/E
    if (SCENE_HEADING_RE.test(line)) {
      tokens.push({ type: 'scene_heading', text: line.trim() });
      i++;
      continue;
    }

    // Transition: all-caps line ending in TO:, or named transition
    if (isTransitionLine(line)) {
      tokens.push({ type: 'transition', text: line.trim() });
      i++;
      continue;
    }

    // Lyrics: ~ prefix
    if (line.startsWith('~')) {
      tokens.push({ type: 'lyrics', text: line.slice(1).trim() });
      i++;
      continue;
    }

    // Character + Dialogue block
    // Rule: all-caps line preceded by blank and followed by non-blank content
    if (isCharacterLine(line) && i + 1 < lines.length && lines[i + 1] !== '') {
      const dual = line.trimEnd().endsWith('^');
      const charText = line.replace(/\s*\^\s*$/, '').trim();
      tokens.push({ type: 'character', text: charText, dual });
      i++;

      while (i < lines.length && lines[i] !== '') {
        const dline = lines[i];
        if (/^\(.*\)\s*$/.test(dline)) {
          tokens.push({ type: 'parenthetical', text: dline.trim() });
        } else {
          tokens.push({ type: 'dialogue', text: dline });
        }
        i++;
      }
      continue;
    }

    // Action: collect consecutive non-blank lines
    const actionLines = [];
    while (i < lines.length && lines[i] !== '') {
      // Skip inline notes
      if (!/^\[\[.*\]\]\s*$/.test(lines[i])) {
        actionLines.push(lines[i]);
      }
      i++;
    }
    if (actionLines.length > 0) {
      tokens.push({ type: 'action', text: actionLines.join('\n') });
    }
  }

  return { title_page: titlePage, tokens };
}

/**
 * Return true when a line is a valid title-page key/value pair.
 * Keys must contain at least one lowercase letter so that all-uppercase
 * screenplay elements (e.g. "CUT TO:") are never mistaken for title-page keys.
 * @param {string} line
 */
function isTitlePageStart(line) {
  const match = line.match(/^([\w ][\w ]*?)\s*:\s*(.*)$/);
  if (!match) return false;
  const key = match[1].trim();
  // Reject all-uppercase keys – they are screenplay elements, not title-page fields
  if (key === key.toUpperCase()) return false;
  return true;
}

/**
 * Return true when a line is an all-caps transition keyword.
 * @param {string} line
 */
function isTransitionLine(line) {
  if (!/[A-Z]/.test(line)) return false;
  if (line !== line.toUpperCase()) return false;
  if (NAMED_TRANSITIONS.has(line.trim())) return true;
  if (line.trimEnd().endsWith('TO:')) return true;
  return false;
}

/**
 * Return true when a line looks like a Fountain character cue.
 * @param {string} line
 */
function isCharacterLine(line) {
  if (!/[A-Z]/.test(line)) return false;

  // Strip dual-dialogue marker and trailing parenthetical extension
  const cleaned = line
    .replace(/\s*\^\s*$/, '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .trim();

  if (!cleaned) return false;
  if (cleaned !== cleaned.toUpperCase()) return false;
  if (SCENE_HEADING_RE.test(line)) return false;
  if (isTransitionLine(line)) return false;

  return true;
}

module.exports = { parse };
