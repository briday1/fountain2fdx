'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../src/parser');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return only tokens of a given type from a parse result. */
function tokensOfType(text, type) {
  return parse(text).tokens.filter((t) => t.type === type);
}

// ---------------------------------------------------------------------------
// Title Page
// ---------------------------------------------------------------------------

describe('title page', () => {
  it('parses key/value pairs before the first blank line', () => {
    const text = 'Title: Big Fish\nAuthor: John August\n\nINT. THE BARN - DAY';
    const { title_page } = parse(text);
    assert.equal(title_page['Title'], 'Big Fish');
    assert.equal(title_page['Author'], 'John August');
  });

  it('supports multi-line values via indented continuation', () => {
    const text = 'Title: My Script\nAuthor: Jane Smith\n    And Co-Author\n\nINT. OFFICE - DAY';
    const { title_page } = parse(text);
    assert.equal(title_page['Author'], 'Jane Smith\nAnd Co-Author');
  });

  it('does not produce tokens for title-page lines', () => {
    const text = 'Title: Test\n\nINT. SOMEWHERE - DAY';
    const { tokens } = parse(text);
    assert.equal(tokens[0].type, 'scene_heading');
  });

  it('returns empty title_page when none is present', () => {
    const { title_page } = parse('INT. OFFICE - DAY');
    assert.deepEqual(title_page, {});
  });
});

// ---------------------------------------------------------------------------
// Scene Headings
// ---------------------------------------------------------------------------

describe('scene headings', () => {
  it('parses INT. heading', () => {
    const [tok] = tokensOfType('INT. THE BARN - DAY', 'scene_heading');
    assert.equal(tok.text, 'INT. THE BARN - DAY');
  });

  it('parses EXT. heading', () => {
    const [tok] = tokensOfType('EXT. THE BARN - NIGHT', 'scene_heading');
    assert.equal(tok.text, 'EXT. THE BARN - NIGHT');
  });

  it('parses EST. heading', () => {
    const [tok] = tokensOfType('EST. CITY - DAY', 'scene_heading');
    assert.equal(tok.text, 'EST. CITY - DAY');
  });

  it('parses INT./EXT. heading', () => {
    const [tok] = tokensOfType('INT./EXT. CAR - MOVING', 'scene_heading');
    assert.equal(tok.text, 'INT./EXT. CAR - MOVING');
  });

  it('parses I/E heading', () => {
    const [tok] = tokensOfType('I/E VEHICLE', 'scene_heading');
    assert.equal(tok.type, 'scene_heading');
  });

  it('parses forced scene heading with . prefix', () => {
    const [tok] = tokensOfType('.FOREST - DUSK', 'scene_heading');
    assert.equal(tok.text, 'FOREST - DUSK');
  });

  it('is case-insensitive for the prefix', () => {
    const [tok] = tokensOfType('int. office - day', 'scene_heading');
    assert.ok(tok, 'should parse lowercase int.');
  });
});

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

describe('action', () => {
  it('parses a simple action paragraph', () => {
    const [tok] = tokensOfType('The dog runs across the yard.', 'action');
    assert.equal(tok.text, 'The dog runs across the yard.');
  });

  it('collapses multiple consecutive lines into one action token', () => {
    const text = 'Line one.\nLine two.\nLine three.';
    const [tok] = tokensOfType(text, 'action');
    assert.equal(tok.text, 'Line one.\nLine two.\nLine three.');
  });

  it('forces action with ! prefix', () => {
    const [tok] = tokensOfType('!REMEMBER THIS IS ACTION', 'action');
    assert.equal(tok.text, 'REMEMBER THIS IS ACTION');
  });
});

// ---------------------------------------------------------------------------
// Characters & Dialogue
// ---------------------------------------------------------------------------

describe('character', () => {
  it('parses an all-caps character cue followed by dialogue', () => {
    const text = 'JOHN\nHello there.';
    const chars = tokensOfType(text, 'character');
    assert.equal(chars.length, 1);
    assert.equal(chars[0].text, 'JOHN');
  });

  it('parses character with parenthetical extension', () => {
    const text = 'JOHN (V.O.)\nSome voiceover.';
    const [tok] = tokensOfType(text, 'character');
    assert.equal(tok.text, 'JOHN (V.O.)');
  });

  it('marks dual-dialogue character with dual:true', () => {
    const text = 'JOHN ^\nHello.\n\nJANE\nHi.';
    const [john] = tokensOfType(text, 'character');
    assert.equal(john.dual, true);
    assert.equal(john.text, 'JOHN');
  });

  it('does not treat all-caps line without following dialogue as character', () => {
    // A single all-caps line with nothing after it is action
    const text = 'JUST AN ALL CAPS ACTION LINE\n\nSomething else.';
    const chars = tokensOfType(text, 'character');
    assert.equal(chars.length, 0);
  });
});

describe('dialogue', () => {
  it('parses dialogue following a character cue', () => {
    const text = 'SARAH\nI really like pie.';
    const diags = tokensOfType(text, 'dialogue');
    assert.equal(diags.length, 1);
    assert.equal(diags[0].text, 'I really like pie.');
  });
});

describe('parenthetical', () => {
  it('parses a parenthetical between character and dialogue', () => {
    const text = 'SARAH\n(quietly)\nI really like pie.';
    const parens = tokensOfType(text, 'parenthetical');
    assert.equal(parens.length, 1);
    assert.equal(parens[0].text, '(quietly)');
  });
});

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

describe('transition', () => {
  it('parses CUT TO:', () => {
    const [tok] = tokensOfType('CUT TO:', 'transition');
    assert.equal(tok.text, 'CUT TO:');
  });

  it('parses FADE OUT.', () => {
    const [tok] = tokensOfType('FADE OUT.', 'transition');
    assert.equal(tok.text, 'FADE OUT.');
  });

  it('parses FADE TO BLACK.', () => {
    const [tok] = tokensOfType('FADE TO BLACK.', 'transition');
    assert.equal(tok.text, 'FADE TO BLACK.');
  });

  it('parses forced transition with > prefix', () => {
    const [tok] = tokensOfType('>WIPE TO:', 'transition');
    assert.equal(tok.text, 'WIPE TO:');
  });
});

// ---------------------------------------------------------------------------
// Centered text
// ---------------------------------------------------------------------------

describe('centered', () => {
  it('parses centered text with > ... < syntax', () => {
    const [tok] = tokensOfType('> THE END <', 'centered');
    assert.equal(tok.text, 'THE END');
  });
});

// ---------------------------------------------------------------------------
// Lyrics
// ---------------------------------------------------------------------------

describe('lyrics', () => {
  it('parses lyrics with ~ prefix', () => {
    const [tok] = tokensOfType('~La la la', 'lyrics');
    assert.equal(tok.text, 'La la la');
  });
});

// ---------------------------------------------------------------------------
// Page break
// ---------------------------------------------------------------------------

describe('page_break', () => {
  it('parses === as a page break', () => {
    const [tok] = tokensOfType('===', 'page_break');
    assert.ok(tok);
  });

  it('parses ======= as a page break', () => {
    const [tok] = tokensOfType('=======', 'page_break');
    assert.ok(tok);
  });
});

// ---------------------------------------------------------------------------
// Sections and synopsis (metadata – parsed but not converted to FDX)
// ---------------------------------------------------------------------------

describe('section', () => {
  it('parses # section headings', () => {
    const [tok] = tokensOfType('# Act One', 'section');
    assert.equal(tok.text, 'Act One');
    assert.equal(tok.level, 1);
  });

  it('parses ## sub-section headings', () => {
    const [tok] = tokensOfType('## Scene Two', 'section');
    assert.equal(tok.level, 2);
  });
});

describe('synopsis', () => {
  it('parses = synopsis lines', () => {
    const [tok] = tokensOfType('= The hero escapes.', 'synopsis');
    assert.equal(tok.text, 'The hero escapes.');
  });
});

// ---------------------------------------------------------------------------
// Boneyard (block comments) are stripped before parsing
// ---------------------------------------------------------------------------

describe('boneyard', () => {
  it('strips /* ... */ block comments from the output', () => {
    const text = '/* This is a note */\nINT. OFFICE - DAY';
    const { tokens } = parse(text);
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].type, 'scene_heading');
  });
});

// ---------------------------------------------------------------------------
// Inline note [[...]] is ignored
// ---------------------------------------------------------------------------

describe('inline notes', () => {
  it('ignores [[...]] note lines', () => {
    const text = 'INT. OFFICE - DAY\n\n[[This is a note]]\n\nThe hero sits.';
    const actions = tokensOfType(text, 'action');
    assert.equal(actions.length, 1);
    assert.equal(actions[0].text, 'The hero sits.');
  });
});

// ---------------------------------------------------------------------------
// Full script round-trip
// ---------------------------------------------------------------------------

describe('full script', () => {
  it('parses a complete short script correctly', () => {
    const text = [
      'Title: My Short Film',
      'Author: Jane Doe',
      '',
      'INT. COFFEE SHOP - DAY',
      '',
      'JANE sits at a corner table, staring at her laptop.',
      '',
      'JANE',
      '(sighing)',
      "Why won't this compile?",
      '',
      'CUT TO:',
      '',
      'EXT. STREET - NIGHT',
      '',
      'JANE walks quickly.',
    ].join('\n');

    const { title_page, tokens } = parse(text);

    assert.equal(title_page['Title'], 'My Short Film');
    assert.equal(title_page['Author'], 'Jane Doe');

    const types = tokens.map((t) => t.type);
    assert.deepEqual(types, [
      'scene_heading',
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'transition',
      'scene_heading',
      'action',
    ]);
  });
});
