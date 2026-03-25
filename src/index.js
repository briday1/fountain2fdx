'use strict';

/**
 * fountain2fdx core library.
 *
 * Usage:
 *   const { fountain2fdx, parse, convert } = require('fountain2fdx/src');
 *
 *   // High-level API
 *   const fdxXml = fountain2fdx(fountainText);
 *
 *   // Low-level API
 *   const parsed = parse(fountainText);   // { title_page, tokens }
 *   const fdxXml = convert(parsed);
 */

const { parse } = require('./parser');
const { convert } = require('./converter');

/**
 * Convert a Fountain screenplay string directly to FDX XML.
 *
 * @param {string} fountainText
 * @returns {string} FDX XML document string
 */
function fountain2fdx(fountainText) {
  return convert(parse(fountainText));
}

module.exports = { fountain2fdx, parse, convert };
