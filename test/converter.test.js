'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { convert, parseInlineMarkup } = require('../src/converter');
const { parse } = require('../src/parser');

// ---------------------------------------------------------------------------
// Helper: convert fountain text directly to FDX
// ---------------------------------------------------------------------------
function fdx(fountainText) {
  return convert(parse(fountainText));
}

// ---------------------------------------------------------------------------
// parseInlineMarkup
// ---------------------------------------------------------------------------

describe('parseInlineMarkup', () => {
  it('returns a single plain segment for text without markup', () => {
    const segs = parseInlineMarkup('Hello world');
    assert.deepEqual(segs, [{ text: 'Hello world', style: null }]);
  });

  it('parses **bold**', () => {
    const segs = parseInlineMarkup('**bold**');
    assert.deepEqual(segs, [{ text: 'bold', style: 'Bold' }]);
  });

  it('parses *italic*', () => {
    const segs = parseInlineMarkup('*italic*');
    assert.deepEqual(segs, [{ text: 'italic', style: 'Italic' }]);
  });

  it('parses ***bold italic***', () => {
    const segs = parseInlineMarkup('***bold italic***');
    assert.deepEqual(segs, [{ text: 'bold italic', style: 'Bold+Italic' }]);
  });

  it('parses _underline_', () => {
    const segs = parseInlineMarkup('_underline_');
    assert.deepEqual(segs, [{ text: 'underline', style: 'Underline' }]);
  });

  it('handles mixed markup and plain text', () => {
    const segs = parseInlineMarkup('Hello **world** and *you*');
    assert.equal(segs.length, 4);
    assert.deepEqual(segs[0], { text: 'Hello ', style: null });
    assert.deepEqual(segs[1], { text: 'world', style: 'Bold' });
    assert.deepEqual(segs[2], { text: ' and ', style: null });
    assert.deepEqual(segs[3], { text: 'you', style: 'Italic' });
  });

  it('returns a single plain segment for empty string', () => {
    const segs = parseInlineMarkup('');
    assert.deepEqual(segs, [{ text: '', style: null }]);
  });
});

// ---------------------------------------------------------------------------
// XML structure
// ---------------------------------------------------------------------------

describe('FDX XML structure', () => {
  it('starts with the XML declaration', () => {
    const out = fdx('INT. OFFICE - DAY');
    assert.ok(out.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>'));
  });

  it('has a FinalDraft root element', () => {
    const out = fdx('INT. OFFICE - DAY');
    assert.ok(out.includes('<FinalDraft DocumentType="Script" Template="No" Version="1">'));
    assert.ok(out.includes('</FinalDraft>'));
  });

  it('has a Content element', () => {
    const out = fdx('INT. OFFICE - DAY');
    assert.ok(out.includes('<Content>'));
    assert.ok(out.includes('</Content>'));
  });
});

// ---------------------------------------------------------------------------
// Paragraph type mapping
// ---------------------------------------------------------------------------

describe('paragraph type mapping', () => {
  it('maps scene_heading → Scene Heading', () => {
    const out = fdx('INT. OFFICE - DAY');
    assert.ok(out.includes('Type="Scene Heading"'));
  });

  it('maps action → Action', () => {
    const out = fdx('The hero enters the room.');
    assert.ok(out.includes('Type="Action"'));
  });

  it('maps character → Character', () => {
    const out = fdx('JOHN\nHello.');
    assert.ok(out.includes('Type="Character"'));
  });

  it('maps dialogue → Dialogue', () => {
    const out = fdx('JOHN\nHello there.');
    assert.ok(out.includes('Type="Dialogue"'));
  });

  it('maps parenthetical → Parenthetical', () => {
    const out = fdx('JOHN\n(quietly)\nHello.');
    assert.ok(out.includes('Type="Parenthetical"'));
  });

  it('maps transition → Transition', () => {
    const out = fdx('CUT TO:');
    assert.ok(out.includes('Type="Transition"'));
  });

  it('maps centered → Action', () => {
    const out = fdx('> THE END <');
    assert.ok(out.includes('Type="Action"'));
    assert.ok(out.includes('THE END'));
  });

  it('maps lyrics → Action', () => {
    const out = fdx('~La la la');
    assert.ok(out.includes('Type="Action"'));
    assert.ok(out.includes('La la la'));
  });
});

// ---------------------------------------------------------------------------
// Text content
// ---------------------------------------------------------------------------

describe('text content in FDX', () => {
  it('includes the scene heading text inside a Text element', () => {
    const out = fdx('INT. COFFEE SHOP - DAY');
    assert.ok(out.includes('<Text Style="AllCaps">INT. COFFEE SHOP - DAY</Text>'));
  });

  it('escapes XML special characters', () => {
    // & in a scene heading and quotes/apostrophes in dialogue
    const out = fdx(
      'INT. SMITH & JONES - DAY\n\nJOHN\n"It\'s a trap!"'
    );
    assert.ok(out.includes('&amp;'));
    assert.ok(out.includes('&quot;'));
    assert.ok(out.includes('&apos;'));
  });

  it('renders bold markup as Style="Bold"', () => {
    const out = fdx('The hero is **very** brave.');
    assert.ok(out.includes('Style="Bold"'));
    assert.ok(out.includes('>very<'));
  });

  it('renders italic markup as Style="Italic"', () => {
    const out = fdx('The hero is *very* brave.');
    assert.ok(out.includes('Style="Italic"'));
  });

  it('renders underline markup as Style="Underline"', () => {
    const out = fdx('The hero is _very_ brave.');
    assert.ok(out.includes('Style="Underline"'));
  });
});

// ---------------------------------------------------------------------------
// Title page
// ---------------------------------------------------------------------------

describe('title page in FDX', () => {
  it('emits a TitlePage element when title-page fields are present', () => {
    const text = 'Title: My Film\nAuthor: Jane\n\nINT. OFFICE - DAY';
    const out = fdx(text);
    assert.ok(out.includes('<TitlePage>'));
    assert.ok(out.includes('My Film'));
    assert.ok(out.includes('Jane'));
  });

  it('does not emit a TitlePage element when none present', () => {
    const out = fdx('INT. OFFICE - DAY');
    assert.ok(!out.includes('<TitlePage>'));
  });
});

// ---------------------------------------------------------------------------
// Sections, synopsis, page_break have no FDX representation
// ---------------------------------------------------------------------------

describe('non-output token types', () => {
  it('section tokens do not appear in FDX output', () => {
    const out = fdx('# Act One\n\nINT. OFFICE - DAY');
    assert.ok(!out.includes('Type="Section"'));
  });

  it('synopsis tokens do not appear in FDX output', () => {
    const out = fdx('= The hero arrives.\n\nINT. OFFICE - DAY');
    assert.ok(!out.includes('Type="Synopsis"'));
  });

  it('page_break tokens do not appear in FDX output', () => {
    const out = fdx('INT. OFFICE - DAY\n\n===\n\nINT. OUTSIDE - NIGHT');
    assert.ok(!out.includes('Type="Page Break"'));
    // But the two scene headings should still appear
    assert.equal((out.match(/Type="Scene Heading"/g) || []).length, 2);
  });
});

// ---------------------------------------------------------------------------
// Full script round-trip
// ---------------------------------------------------------------------------

describe('full script round-trip', () => {
  it('converts a complete short script to valid FDX', () => {
    const fountain = [
      'Title: The Chase',
      'Author: A. Writer',
      '',
      'EXT. ROOFTOP - NIGHT',
      '',
      'Rain lashes the city below.',
      '',
      'HERO',
      '(breathless)',
      "You'll never catch me!",
      '',
      'CUT TO:',
      '',
      'INT. POLICE CAR - CONTINUOUS',
      '',
      'The **detective** grips the wheel.',
    ].join('\n');

    const out = fdx(fountain);

    // Well-formed XML envelope
    assert.ok(out.includes('<FinalDraft'));
    assert.ok(out.includes('</FinalDraft>'));

    // Elements present
    assert.ok(out.includes('Type="Scene Heading"'));
    assert.ok(out.includes('Type="Action"'));
    assert.ok(out.includes('Type="Character"'));
    assert.ok(out.includes('Type="Parenthetical"'));
    assert.ok(out.includes('Type="Dialogue"'));
    assert.ok(out.includes('Type="Transition"'));

    // Title page
    assert.ok(out.includes('<TitlePage>'));
    assert.ok(out.includes('The Chase'));
    assert.ok(out.includes('A. Writer'));

    // Inline bold in action
    assert.ok(out.includes('Style="Bold"'));
  });
});
