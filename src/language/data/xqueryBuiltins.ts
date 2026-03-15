export interface XQueryFunctionParam {
  name: string;
  type: string;
  occurrence?: '?' | '*' | '+';
  optional?: boolean;
}

export interface XQueryFunctionSignature {
  params: XQueryFunctionParam[];
  returnType: string;
  description: string;
}

export interface XQueryFunction {
  namespace: string;
  localName: string;
  signatures: XQueryFunctionSignature[];
  summary: string;
  since?: string;
}

export const xqueryBuiltins: XQueryFunction[] = [

  // ── fn: ──────────────────────────────────────────────────────────────────

  {
    namespace: 'fn', localName: 'concat',
    summary: 'Concatenates two or more atomic values and returns the resulting string.',
    signatures: [{
      params: [
        { name: 'arg1', type: 'xs:anyAtomicType', occurrence: '?' },
        { name: 'arg2', type: 'xs:anyAtomicType', occurrence: '?' },
        { name: '...', type: 'xs:anyAtomicType', occurrence: '*', optional: true }
      ],
      returnType: 'xs:string',
      description: 'Concatenates two or more atomic values.'
    }]
  },
  {
    namespace: 'fn', localName: 'string',
    summary: 'Returns the string value of the argument.',
    signatures: [{
      params: [{ name: 'arg', type: 'item()', occurrence: '?', optional: true }],
      returnType: 'xs:string',
      description: 'Returns the string value of the argument, or the string value of the context item if no argument is given.'
    }]
  },
  {
    namespace: 'fn', localName: 'string-length',
    summary: 'Returns the length of the string.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:string', occurrence: '?', optional: true }],
      returnType: 'xs:integer',
      description: 'Returns the number of characters in the string.'
    }]
  },
  {
    namespace: 'fn', localName: 'substring',
    summary: 'Returns the portion of a string identified by a starting location and optional length.',
    signatures: [{
      params: [
        { name: 'sourceString', type: 'xs:string', occurrence: '?' },
        { name: 'start', type: 'xs:double' },
        { name: 'length', type: 'xs:double', optional: true }
      ],
      returnType: 'xs:string',
      description: 'Returns the substring of $sourceString beginning at $start, optionally limited to $length characters.'
    }]
  },
  {
    namespace: 'fn', localName: 'contains',
    summary: 'Returns true if the first string contains the second.',
    signatures: [{
      params: [
        { name: 'arg1', type: 'xs:string', occurrence: '?' },
        { name: 'arg2', type: 'xs:string', occurrence: '?' },
        { name: 'collation', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:boolean',
      description: 'Returns true if $arg1 contains $arg2 as a substring.'
    }]
  },
  {
    namespace: 'fn', localName: 'starts-with',
    summary: 'Returns true if the first string starts with the second.',
    signatures: [{
      params: [
        { name: 'arg1', type: 'xs:string', occurrence: '?' },
        { name: 'arg2', type: 'xs:string', occurrence: '?' },
        { name: 'collation', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:boolean',
      description: 'Returns true if $arg1 starts with $arg2.'
    }]
  },
  {
    namespace: 'fn', localName: 'ends-with',
    summary: 'Returns true if the first string ends with the second.',
    signatures: [{
      params: [
        { name: 'arg1', type: 'xs:string', occurrence: '?' },
        { name: 'arg2', type: 'xs:string', occurrence: '?' },
        { name: 'collation', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:boolean',
      description: 'Returns true if $arg1 ends with $arg2.'
    }]
  },
  {
    namespace: 'fn', localName: 'upper-case',
    summary: 'Converts a string to upper-case.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:string', occurrence: '?' }],
      returnType: 'xs:string',
      description: 'Returns the value of $arg after translating every character to its upper-case equivalent.'
    }]
  },
  {
    namespace: 'fn', localName: 'lower-case',
    summary: 'Converts a string to lower-case.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:string', occurrence: '?' }],
      returnType: 'xs:string',
      description: 'Returns the value of $arg after translating every character to its lower-case equivalent.'
    }]
  },
  {
    namespace: 'fn', localName: 'normalize-space',
    summary: 'Returns the whitespace-normalized value of the argument.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:string', occurrence: '?', optional: true }],
      returnType: 'xs:string',
      description: 'Strips leading and trailing whitespace and collapses internal whitespace runs to a single space.'
    }]
  },
  {
    namespace: 'fn', localName: 'tokenize',
    summary: 'Returns a sequence of strings constructed by splitting the input at occurrences of a pattern.',
    signatures: [{
      params: [
        { name: 'input', type: 'xs:string', occurrence: '?' },
        { name: 'pattern', type: 'xs:string' },
        { name: 'flags', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:string*',
      description: 'Splits $input at each match of the regex $pattern.'
    }]
  },
  {
    namespace: 'fn', localName: 'matches',
    summary: 'Returns true if a string matches a regular expression.',
    signatures: [{
      params: [
        { name: 'input', type: 'xs:string', occurrence: '?' },
        { name: 'pattern', type: 'xs:string' },
        { name: 'flags', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:boolean',
      description: 'Returns true if $input matches the regular expression $pattern.'
    }]
  },
  {
    namespace: 'fn', localName: 'replace',
    summary: 'Returns a string with regex matches replaced.',
    signatures: [{
      params: [
        { name: 'input', type: 'xs:string', occurrence: '?' },
        { name: 'pattern', type: 'xs:string' },
        { name: 'replacement', type: 'xs:string' },
        { name: 'flags', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:string',
      description: 'Returns the value of $input with every substring matching $pattern replaced by $replacement.'
    }]
  },
  {
    namespace: 'fn', localName: 'count',
    summary: 'Returns the number of items in a sequence.',
    signatures: [{
      params: [{ name: 'arg', type: 'item()', occurrence: '*' }],
      returnType: 'xs:integer',
      description: 'Returns the number of items in $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'empty',
    summary: 'Returns true if the argument is the empty sequence.',
    signatures: [{
      params: [{ name: 'arg', type: 'item()', occurrence: '*' }],
      returnType: 'xs:boolean',
      description: 'Returns true if $arg is the empty sequence.'
    }]
  },
  {
    namespace: 'fn', localName: 'exists',
    summary: 'Returns true if the argument is not the empty sequence.',
    signatures: [{
      params: [{ name: 'arg', type: 'item()', occurrence: '*' }],
      returnType: 'xs:boolean',
      description: 'Returns true if $arg is not the empty sequence.'
    }]
  },
  {
    namespace: 'fn', localName: 'not',
    summary: 'Returns the boolean negation of the argument.',
    signatures: [{
      params: [{ name: 'arg', type: 'item()', occurrence: '*' }],
      returnType: 'xs:boolean',
      description: 'Returns true if the effective boolean value of $arg is false, and false otherwise.'
    }]
  },
  {
    namespace: 'fn', localName: 'boolean',
    summary: 'Computes the effective boolean value of the argument.',
    signatures: [{
      params: [{ name: 'arg', type: 'item()', occurrence: '*' }],
      returnType: 'xs:boolean',
      description: 'Returns the effective boolean value of $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'distinct-values',
    summary: 'Removes duplicate atomic values from a sequence.',
    signatures: [{
      params: [
        { name: 'arg', type: 'xs:anyAtomicType', occurrence: '*' },
        { name: 'collation', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:anyAtomicType*',
      description: 'Returns the distinct values present in $arg, in document order.'
    }]
  },
  {
    namespace: 'fn', localName: 'reverse',
    summary: 'Returns items in reverse order.',
    signatures: [{
      params: [{ name: 'arg', type: 'item()', occurrence: '*' }],
      returnType: 'item()*',
      description: 'Returns the items in $arg in reverse document order.'
    }]
  },
  {
    namespace: 'fn', localName: 'subsequence',
    summary: 'Returns a contiguous subsequence of items.',
    signatures: [{
      params: [
        { name: 'sourceSeq', type: 'item()', occurrence: '*' },
        { name: 'startingLoc', type: 'xs:double' },
        { name: 'length', type: 'xs:double', optional: true }
      ],
      returnType: 'item()*',
      description: 'Returns items from $sourceSeq beginning at $startingLoc, optionally limited to $length items.'
    }]
  },
  {
    namespace: 'fn', localName: 'index-of',
    summary: 'Returns positions in a sequence where an item equals the search value.',
    signatures: [{
      params: [
        { name: 'seq', type: 'xs:anyAtomicType', occurrence: '*' },
        { name: 'search', type: 'xs:anyAtomicType' },
        { name: 'collation', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:integer*',
      description: 'Returns all 1-based positions in $seq at which a value equal to $search occurs.'
    }]
  },
  {
    namespace: 'fn', localName: 'doc',
    summary: 'Returns the document node at the given URI.',
    signatures: [{
      params: [{ name: 'uri', type: 'xs:string', occurrence: '?', optional: true }],
      returnType: 'document-node()?',
      description: 'Returns the document node corresponding to the URI.'
    }]
  },
  {
    namespace: 'fn', localName: 'collection',
    summary: 'Returns the sequence of documents in a named collection.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:string', occurrence: '?', optional: true }],
      returnType: 'node()*',
      description: 'Returns the sequence of nodes in the collection identified by $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'data',
    summary: 'Returns the typed values of nodes or atomic values.',
    signatures: [{
      params: [{ name: 'arg', type: 'item()', occurrence: '*', optional: true }],
      returnType: 'xs:anyAtomicType*',
      description: 'Returns the typed value of each item in $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'name',
    summary: 'Returns the name of a node as a string.',
    signatures: [{
      params: [{ name: 'arg', type: 'node()', occurrence: '?', optional: true }],
      returnType: 'xs:string',
      description: 'Returns the name of $arg as a string in the form prefix:localname.'
    }]
  },
  {
    namespace: 'fn', localName: 'local-name',
    summary: 'Returns the local part of the name of a node.',
    signatures: [{
      params: [{ name: 'arg', type: 'node()', occurrence: '?', optional: true }],
      returnType: 'xs:string',
      description: 'Returns the local part of the expanded QName of $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'namespace-uri',
    summary: 'Returns the namespace URI of a node.',
    signatures: [{
      params: [{ name: 'arg', type: 'node()', occurrence: '?', optional: true }],
      returnType: 'xs:anyURI',
      description: 'Returns the namespace URI of the expanded QName of $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'number',
    summary: 'Returns the numeric value of the argument.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?', optional: true }],
      returnType: 'xs:double',
      description: 'Returns the value of $arg converted to an xs:double.'
    }]
  },
  {
    namespace: 'fn', localName: 'sum',
    summary: 'Returns the sum of values in a sequence.',
    signatures: [{
      params: [
        { name: 'arg', type: 'xs:anyAtomicType', occurrence: '*' },
        { name: 'zero', type: 'xs:anyAtomicType', occurrence: '?', optional: true }
      ],
      returnType: 'xs:anyAtomicType',
      description: 'Returns the sum of values in $arg, or $zero if the sequence is empty.'
    }]
  },
  {
    namespace: 'fn', localName: 'min',
    summary: 'Returns the minimum value in a sequence.',
    signatures: [{
      params: [
        { name: 'arg', type: 'xs:anyAtomicType', occurrence: '*' },
        { name: 'collation', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:anyAtomicType?',
      description: 'Returns the minimum value from $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'max',
    summary: 'Returns the maximum value in a sequence.',
    signatures: [{
      params: [
        { name: 'arg', type: 'xs:anyAtomicType', occurrence: '*' },
        { name: 'collation', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:anyAtomicType?',
      description: 'Returns the maximum value from $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'avg',
    summary: 'Returns the average of values in a sequence.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '*' }],
      returnType: 'xs:anyAtomicType?',
      description: 'Returns the arithmetic mean of values in $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'abs',
    summary: 'Returns the absolute value of a number.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:numeric', occurrence: '?' }],
      returnType: 'xs:numeric?',
      description: 'Returns the absolute value of $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'ceiling',
    summary: 'Rounds a number up to the nearest integer.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:numeric', occurrence: '?' }],
      returnType: 'xs:numeric?',
      description: 'Returns the smallest integer not less than $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'floor',
    summary: 'Rounds a number down to the nearest integer.',
    signatures: [{
      params: [{ name: 'arg', type: 'xs:numeric', occurrence: '?' }],
      returnType: 'xs:numeric?',
      description: 'Returns the largest integer not greater than $arg.'
    }]
  },
  {
    namespace: 'fn', localName: 'round',
    summary: 'Rounds a number to the nearest integer.',
    signatures: [{
      params: [
        { name: 'arg', type: 'xs:numeric', occurrence: '?' },
        { name: 'precision', type: 'xs:integer', optional: true }
      ],
      returnType: 'xs:numeric?',
      description: 'Rounds $arg to the nearest integer, or to $precision decimal places.'
    }]
  },
  {
    namespace: 'fn', localName: 'current-date',
    summary: 'Returns the current date.',
    signatures: [{ params: [], returnType: 'xs:date', description: 'Returns the current date in the implicit timezone.' }]
  },
  {
    namespace: 'fn', localName: 'current-dateTime',
    summary: 'Returns the current date and time.',
    signatures: [{ params: [], returnType: 'xs:dateTime', description: 'Returns the current dateTime in the implicit timezone.' }]
  },
  {
    namespace: 'fn', localName: 'current-time',
    summary: 'Returns the current time.',
    signatures: [{ params: [], returnType: 'xs:time', description: 'Returns the current time in the implicit timezone.' }]
  },
  {
    namespace: 'fn', localName: 'format-date',
    summary: 'Formats an xs:date value as a string.',
    signatures: [{
      params: [
        { name: 'value', type: 'xs:date', occurrence: '?' },
        { name: 'picture', type: 'xs:string' },
        { name: 'language', type: 'xs:string', occurrence: '?', optional: true },
        { name: 'calendar', type: 'xs:string', occurrence: '?', optional: true },
        { name: 'place', type: 'xs:string', occurrence: '?', optional: true }
      ],
      returnType: 'xs:string?',
      description: 'Formats $value using the XSLT picture string $picture.'
    }]
  },
  {
    namespace: 'fn', localName: 'format-number',
    summary: 'Formats a number as a string using a picture string.',
    signatures: [{
      params: [
        { name: 'value', type: 'xs:numeric', occurrence: '?' },
        { name: 'picture', type: 'xs:string' },
        { name: 'decimal-format-name', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:string',
      description: 'Formats $value using the decimal picture string $picture.'
    }]
  },
  {
    namespace: 'fn', localName: 'error',
    summary: 'Raises an application-level error.',
    signatures: [{
      params: [
        { name: 'code', type: 'xs:QName', occurrence: '?', optional: true },
        { name: 'description', type: 'xs:string', optional: true },
        { name: 'error-object', type: 'item()', occurrence: '*', optional: true }
      ],
      returnType: 'none',
      description: 'Raises a dynamic error.'
    }]
  },
  {
    namespace: 'fn', localName: 'trace',
    summary: 'Evaluates its argument and returns it, writing a trace message.',
    signatures: [{
      params: [
        { name: 'value', type: 'item()', occurrence: '*' },
        { name: 'label', type: 'xs:string' }
      ],
      returnType: 'item()*',
      description: 'Returns $value unchanged after writing $label and the value to the trace output.'
    }]
  },
  {
    namespace: 'fn', localName: 'deep-equal',
    summary: 'Returns true if two sequences are deep-equal.',
    signatures: [{
      params: [
        { name: 'parameter1', type: 'item()', occurrence: '*' },
        { name: 'parameter2', type: 'item()', occurrence: '*' },
        { name: 'collation', type: 'xs:string', optional: true }
      ],
      returnType: 'xs:boolean',
      description: 'Returns true if the two arguments are deep-equal to each other.'
    }]
  },

  // ── xs: constructor functions ─────────────────────────────────────────────

  {
    namespace: 'xs', localName: 'string',
    summary: 'Constructs an xs:string value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:string?', description: 'Casts $arg to xs:string.' }]
  },
  {
    namespace: 'xs', localName: 'integer',
    summary: 'Constructs an xs:integer value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:integer?', description: 'Casts $arg to xs:integer.' }]
  },
  {
    namespace: 'xs', localName: 'decimal',
    summary: 'Constructs an xs:decimal value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:decimal?', description: 'Casts $arg to xs:decimal.' }]
  },
  {
    namespace: 'xs', localName: 'double',
    summary: 'Constructs an xs:double value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:double?', description: 'Casts $arg to xs:double.' }]
  },
  {
    namespace: 'xs', localName: 'float',
    summary: 'Constructs an xs:float value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:float?', description: 'Casts $arg to xs:float.' }]
  },
  {
    namespace: 'xs', localName: 'boolean',
    summary: 'Constructs an xs:boolean value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:boolean?', description: 'Casts $arg to xs:boolean.' }]
  },
  {
    namespace: 'xs', localName: 'date',
    summary: 'Constructs an xs:date value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:date?', description: 'Casts $arg to xs:date.' }]
  },
  {
    namespace: 'xs', localName: 'dateTime',
    summary: 'Constructs an xs:dateTime value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:dateTime?', description: 'Casts $arg to xs:dateTime.' }]
  },
  {
    namespace: 'xs', localName: 'time',
    summary: 'Constructs an xs:time value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:time?', description: 'Casts $arg to xs:time.' }]
  },
  {
    namespace: 'xs', localName: 'duration',
    summary: 'Constructs an xs:duration value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:duration?', description: 'Casts $arg to xs:duration.' }]
  },
  {
    namespace: 'xs', localName: 'anyURI',
    summary: 'Constructs an xs:anyURI value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:anyURI?', description: 'Casts $arg to xs:anyURI.' }]
  },
  {
    namespace: 'xs', localName: 'QName',
    summary: 'Constructs an xs:QName value.',
    signatures: [{
      params: [
        { name: 'namespaceURI', type: 'xs:string', occurrence: '?' },
        { name: 'qualifiedName', type: 'xs:string' }
      ],
      returnType: 'xs:QName',
      description: 'Creates a QName from a namespace URI and a lexical qualified name.'
    }]
  },
  {
    namespace: 'xs', localName: 'normalizedString',
    summary: 'Constructs an xs:normalizedString value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:normalizedString?', description: 'Casts $arg to xs:normalizedString.' }]
  },
  {
    namespace: 'xs', localName: 'token',
    summary: 'Constructs an xs:token value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:token?', description: 'Casts $arg to xs:token.' }]
  },
  {
    namespace: 'xs', localName: 'long',
    summary: 'Constructs an xs:long value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:long?', description: 'Casts $arg to xs:long.' }]
  },
  {
    namespace: 'xs', localName: 'int',
    summary: 'Constructs an xs:int value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:int?', description: 'Casts $arg to xs:int.' }]
  },
  {
    namespace: 'xs', localName: 'short',
    summary: 'Constructs an xs:short value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:short?', description: 'Casts $arg to xs:short.' }]
  },
  {
    namespace: 'xs', localName: 'byte',
    summary: 'Constructs an xs:byte value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:byte?', description: 'Casts $arg to xs:byte.' }]
  },
  {
    namespace: 'xs', localName: 'unsignedLong',
    summary: 'Constructs an xs:unsignedLong value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:unsignedLong?', description: 'Casts $arg to xs:unsignedLong.' }]
  },
  {
    namespace: 'xs', localName: 'unsignedInt',
    summary: 'Constructs an xs:unsignedInt value.',
    signatures: [{ params: [{ name: 'arg', type: 'xs:anyAtomicType', occurrence: '?' }], returnType: 'xs:unsignedInt?', description: 'Casts $arg to xs:unsignedInt.' }]
  },
];
