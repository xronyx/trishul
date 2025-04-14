/**
 * Monaco Editor Setup
 * 
 * This file ensures Monaco Editor is set up with proper syntax highlighting
 * for JavaScript (and optionally other languages).
 */

import * as monaco from 'monaco-editor';

// Register JavaScript language
monaco.languages.register({ id: 'javascript' });

// Configure JavaScript language features
monaco.languages.setMonarchTokensProvider('javascript', {
  defaultToken: 'invalid',
  tokenPostfix: '.js',

  keywords: [
    'break', 'case', 'catch', 'class', 'continue', 'const',
    'constructor', 'debugger', 'default', 'delete', 'do', 'else',
    'export', 'extends', 'false', 'finally', 'for', 'from', 'function',
    'get', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null',
    'return', 'set', 'super', 'switch', 'symbol', 'this', 'throw', 'true',
    'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield',
    'async', 'await', 'of'
  ],

  typeKeywords: [
    'any', 'boolean', 'number', 'object', 'string', 'undefined'
  ],

  operators: [
    '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**',
    '*', '/', '%', '++', '--', '<<', '</', '>>', '>>>', '&',
    '|', '^', '!', '~', '&&', '||', '?', ':', '=', '+=', '-=',
    '*=', '**=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '|=',
    '^=', '@',
  ],

  // we include these common regular expressions
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // identifiers and keywords
      [/[a-zA-Z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],

      // whitespace
      { include: '@whitespace' },

      // regular expression: ensure it is terminated before beginning (otherwise it is an operator)
      [/\/(?=([^\\\/]|\\.)+\/([gimsuy]*)(\s*)(\.|;|\/|,|\)|\]|\}|$))/, { token: 'regexp', bracket: '@open', next: '@regexp' }],

      // delimiters and operators
      [/[()\[\]]/, '@brackets'],
      [/[{}]/, '@braces'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': ''
        }
      }],

      // numbers
      [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
      [/0[xX](@hexdigits)/, 'number.hex'],
      [/0[oO]?(@octaldigits)/, 'number.octal'],
      [/0[bB](@binarydigits)/, 'number.binary'],
      [/(@digits)/, 'number'],

      // delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // strings
      [/"([^"\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
      [/`/, 'string', '@string_backtick'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*\*(?!\/)/, 'comment.doc', '@jsdoc'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    comment: [
      [/[^\/*]+/, 'comment' ],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment']
    ],

    jsdoc: [
      [/[^\/*]+/, 'comment.doc'],
      [/\*\//, 'comment.doc', '@pop'],
      [/[\/*]/, 'comment.doc']
    ],

    // We match regular expression quite precisely
    regexp: [
      [/(\{)(\d+(?:,\d*)?)(\})/, ['regexp.escape.control', 'regexp.escape.control', 'regexp.escape.control']],
      [/(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/, ['regexp.escape.control', { token: 'regexp.escape.control', next: '@regexrange' }]],
      [/(\()(\?:|\?=|\?!)/, ['regexp.escape.control', 'regexp.escape.control']],
      [/[()]/, 'regexp.escape.control'],
      [/@escapes/, 'regexp.escape'],
      [/\./, 'regexp.escape.control'],
      [/\/([gimsuy]*)(\s*)$/, [{ token: 'regexp', bracket: '@close', next: '@pop' }, 'keyword.other']],
      [/\//, 'regexp'],
      [/([^\\\/]|\\.)+/, 'regexp'],
    ],

    regexrange: [
      [/-/, 'regexp.escape.control'],
      [/\^/, 'regexp.invalid'],
      [/@escapes/, 'regexp.escape'],
      [/[^\]]/, 'regexp'],
      [/\]/, { token: 'regexp.escape.control', next: '@pop', bracket: '@close' }]
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop']
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop']
    ],

    string_backtick: [
      [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
      [/[^\\`$]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/`/, 'string', '@pop']
    ],

    bracketCounting: [
      [/\{/, 'delimiter.bracket', '@bracketCounting'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: 'root' }
    ],
  },
});

export default monaco; 