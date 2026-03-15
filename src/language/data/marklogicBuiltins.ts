import { XQueryFunction } from './xqueryBuiltins';

export const marklogicBuiltins: XQueryFunction[] = [

  // ── xdmp: ─────────────────────────────────────────────────────────────────

  {
    namespace: 'xdmp', localName: 'document-get',
    summary: 'Retrieves a document from the local filesystem or a URL.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'uri', type: 'xs:string' },
        { name: 'options', type: 'element()?', occurrence: '?', optional: true }
      ],
      returnType: 'document-node()*',
      description: 'Reads a document from a filesystem path or URL.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'document-insert',
    summary: 'Inserts a document into the database.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'uri', type: 'xs:string' },
        { name: 'root', type: 'node()' },
        { name: 'options', type: 'element()?', occurrence: '?', optional: true }
      ],
      returnType: 'empty-sequence()',
      description: 'Inserts $root as a new document at $uri.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'document-delete',
    summary: 'Deletes a document from the database.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'uri', type: 'xs:string' }],
      returnType: 'empty-sequence()',
      description: 'Deletes the document at the given URI.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'node-uri',
    summary: 'Returns the URI of a node.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'node', type: 'node()' }],
      returnType: 'xs:string?',
      description: 'Returns the URI of the document containing $node.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'document-properties',
    summary: 'Returns the properties document for a given URI.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'uri', type: 'xs:string' }],
      returnType: 'document-node()?',
      description: 'Returns the properties document associated with $uri.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'log',
    summary: 'Logs a message to the MarkLogic error log.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'msg', type: 'item()', occurrence: '*' },
        { name: 'level', type: 'xs:string', optional: true }
      ],
      returnType: 'empty-sequence()',
      description: 'Writes $msg to ErrorLog.txt at the given log level (default "info").'
    }]
  },
  {
    namespace: 'xdmp', localName: 'eval',
    summary: 'Evaluates an XQuery string in a separate transaction.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'xquery', type: 'xs:string' },
        { name: 'vars', type: 'item()*', optional: true },
        { name: 'options', type: 'element()?', occurrence: '?', optional: true }
      ],
      returnType: 'item()*',
      description: 'Evaluates the XQuery expression $xquery and returns the result.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'invoke',
    summary: 'Evaluates an XQuery module stored in the database.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'module', type: 'xs:string' },
        { name: 'vars', type: 'item()*', optional: true },
        { name: 'options', type: 'element()?', occurrence: '?', optional: true }
      ],
      returnType: 'item()*',
      description: 'Invokes the XQuery module at the given URI.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'database',
    summary: 'Returns the id of the current database.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'name', type: 'xs:string', optional: true }],
      returnType: 'xs:unsignedLong',
      description: 'Returns the id of the database named $name, or the current database if omitted.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'database-name',
    summary: 'Returns the name of a database given its id.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'database-id', type: 'xs:unsignedLong' }],
      returnType: 'xs:string',
      description: 'Returns the name of the database with the given id.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'version',
    summary: 'Returns the MarkLogic Server version string.',
    since: '5.0',
    signatures: [{ params: [], returnType: 'xs:string', description: 'Returns the current MarkLogic Server version.' }]
  },
  {
    namespace: 'xdmp', localName: 'host',
    summary: 'Returns the id of the current host.',
    since: '5.0',
    signatures: [{ params: [], returnType: 'xs:unsignedLong', description: 'Returns the id of the host on which the query is executing.' }]
  },
  {
    namespace: 'xdmp', localName: 'server',
    summary: 'Returns the id of the current App Server.',
    since: '5.0',
    signatures: [{ params: [], returnType: 'xs:unsignedLong', description: 'Returns the id of the App Server handling the current request.' }]
  },
  {
    namespace: 'xdmp', localName: 'request',
    summary: 'Returns the id of the current request.',
    since: '5.0',
    signatures: [{ params: [], returnType: 'xs:unsignedLong', description: 'Returns the unique id for the current request.' }]
  },
  {
    namespace: 'xdmp', localName: 'transaction',
    summary: 'Returns the id of the current transaction.',
    since: '5.0',
    signatures: [{ params: [], returnType: 'xs:unsignedLong', description: 'Returns the id of the current transaction.' }]
  },
  {
    namespace: 'xdmp', localName: 'user',
    summary: 'Returns the id of the current user.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'name', type: 'xs:string', optional: true }],
      returnType: 'xs:unsignedLong',
      description: 'Returns the id of the user named $name, or the current user if omitted.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'get-request-field',
    summary: 'Returns the value of a named HTTP request field.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'name', type: 'xs:string' },
        { name: 'default', type: 'xs:string', occurrence: '?', optional: true }
      ],
      returnType: 'xs:string*',
      description: 'Returns the value(s) of the request parameter named $name.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'set-response-content-type',
    summary: 'Sets the HTTP response Content-Type header.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'content-type', type: 'xs:string' }],
      returnType: 'empty-sequence()',
      description: 'Sets the Content-Type header of the HTTP response.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'quote',
    summary: 'Returns a string representation of the serialized node.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'arg', type: 'item()', occurrence: '*' },
        { name: 'options', type: 'element()?', occurrence: '?', optional: true }
      ],
      returnType: 'xs:string',
      description: 'Serializes $arg to a string according to the given options.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'unquote',
    summary: 'Parses an XML or JSON string into a node.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'arg', type: 'xs:string' },
        { name: 'default-namespace', type: 'xs:string', optional: true },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true }
      ],
      returnType: 'document-node()*',
      description: 'Parses $arg as XML (or JSON) and returns the resulting document node.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'sleep',
    summary: 'Suspends execution for a given number of milliseconds.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'msec', type: 'xs:unsignedInt' }],
      returnType: 'empty-sequence()',
      description: 'Pauses query execution for $msec milliseconds.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'collection',
    summary: 'Returns URIs of documents in a named collection.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'uri', type: 'xs:string', optional: true }],
      returnType: 'xs:string*',
      description: 'Returns the URIs of all documents in the collection $uri.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'directory',
    summary: 'Returns documents in a database directory.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'uri', type: 'xs:string' },
        { name: 'depth', type: 'xs:string', optional: true }
      ],
      returnType: 'node()*',
      description: 'Returns nodes in the directory $uri, with optional recursive depth.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'node-replace',
    summary: 'Replaces a node in the database with another node.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'old', type: 'node()' },
        { name: 'new', type: 'node()' }
      ],
      returnType: 'empty-sequence()',
      description: 'Atomically replaces $old with $new in the database.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'node-insert-child',
    summary: 'Inserts a node as the last child of a parent node.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'parent', type: 'node()' },
        { name: 'new', type: 'node()' }
      ],
      returnType: 'empty-sequence()',
      description: 'Appends $new as the last child of $parent.'
    }]
  },
  {
    namespace: 'xdmp', localName: 'node-delete',
    summary: 'Deletes a node from the database.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'node', type: 'node()' }],
      returnType: 'empty-sequence()',
      description: 'Deletes $node from its parent document in the database.'
    }]
  },

  // ── cts: ──────────────────────────────────────────────────────────────────

  {
    namespace: 'cts', localName: 'search',
    summary: 'Returns documents matching a cts:query.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'expression', type: 'node()', occurrence: '*' },
        { name: 'query', type: 'cts:query', occurrence: '?', optional: true },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true },
        { name: 'quality-weight', type: 'xs:double', optional: true },
        { name: 'forest-ids', type: 'xs:unsignedLong', occurrence: '*', optional: true }
      ],
      returnType: 'node()*',
      description: 'Returns nodes matching $query from $expression.'
    }]
  },
  {
    namespace: 'cts', localName: 'and-query',
    summary: 'Returns a query that matches all sub-queries.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'queries', type: 'cts:query', occurrence: '*' },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true }
      ],
      returnType: 'cts:and-query',
      description: 'Constructs a query matching documents that satisfy all of $queries.'
    }]
  },
  {
    namespace: 'cts', localName: 'or-query',
    summary: 'Returns a query that matches any sub-query.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'queries', type: 'cts:query', occurrence: '*' },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true }
      ],
      returnType: 'cts:or-query',
      description: 'Constructs a query matching documents that satisfy at least one of $queries.'
    }]
  },
  {
    namespace: 'cts', localName: 'not-query',
    summary: 'Returns a query that matches documents not matching its sub-query.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'query', type: 'cts:query' },
        { name: 'weight', type: 'xs:double', optional: true }
      ],
      returnType: 'cts:not-query',
      description: 'Constructs a query that excludes documents matching $query.'
    }]
  },
  {
    namespace: 'cts', localName: 'word-query',
    summary: 'Returns a query that matches documents containing specific words.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'text', type: 'xs:string', occurrence: '*' },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true },
        { name: 'weight', type: 'xs:double', optional: true }
      ],
      returnType: 'cts:word-query',
      description: 'Constructs a query matching documents containing any of the words in $text.'
    }]
  },
  {
    namespace: 'cts', localName: 'element-value-query',
    summary: 'Returns a query matching elements with a given value.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'element-name', type: 'xs:QName', occurrence: '*' },
        { name: 'text', type: 'xs:string', occurrence: '*' },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true },
        { name: 'weight', type: 'xs:double', optional: true }
      ],
      returnType: 'cts:element-value-query',
      description: 'Constructs a query that matches elements with the given value.'
    }]
  },
  {
    namespace: 'cts', localName: 'element-range-query',
    summary: 'Returns a query that matches elements using a range comparison.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'element-name', type: 'xs:QName', occurrence: '*' },
        { name: 'operator', type: 'xs:string' },
        { name: 'value', type: 'xs:anyAtomicType', occurrence: '*' },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true },
        { name: 'weight', type: 'xs:double', optional: true }
      ],
      returnType: 'cts:element-range-query',
      description: 'Constructs a query matching elements whose value satisfies the range comparison.'
    }]
  },
  {
    namespace: 'cts', localName: 'collection-query',
    summary: 'Returns a query that matches documents in a named collection.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'uri', type: 'xs:string', occurrence: '*' }],
      returnType: 'cts:collection-query',
      description: 'Constructs a query matching documents in any of the given collections.'
    }]
  },
  {
    namespace: 'cts', localName: 'directory-query',
    summary: 'Returns a query that matches documents under a directory URI.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'uri', type: 'xs:string', occurrence: '*' },
        { name: 'depth', type: 'xs:string', optional: true }
      ],
      returnType: 'cts:directory-query',
      description: 'Constructs a query matching documents whose URIs start with $uri.'
    }]
  },
  {
    namespace: 'cts', localName: 'uri-match',
    summary: 'Returns document URIs matching a pattern.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'pattern', type: 'xs:string' },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true }
      ],
      returnType: 'xs:string*',
      description: 'Returns URIs of documents whose URIs match $pattern.'
    }]
  },
  {
    namespace: 'cts', localName: 'uris',
    summary: 'Returns all document URIs in the database.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'start', type: 'xs:string', occurrence: '?', optional: true },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true },
        { name: 'query', type: 'cts:query', occurrence: '?', optional: true },
        { name: 'quality-weight', type: 'xs:double', optional: true },
        { name: 'forest-ids', type: 'xs:unsignedLong', occurrence: '*', optional: true }
      ],
      returnType: 'xs:string*',
      description: 'Returns an iterator over all document URIs in the database.'
    }]
  },
  {
    namespace: 'cts', localName: 'collections',
    summary: 'Returns all collection URIs in the database.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'start', type: 'xs:string', occurrence: '?', optional: true },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true },
        { name: 'query', type: 'cts:query', occurrence: '?', optional: true }
      ],
      returnType: 'xs:string*',
      description: 'Returns an iterator over all collection URIs in the database.'
    }]
  },
  {
    namespace: 'cts', localName: 'element-word-query',
    summary: 'Returns a query matching documents with words in a specific element.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'element-name', type: 'xs:QName', occurrence: '*' },
        { name: 'text', type: 'xs:string', occurrence: '*' },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true },
        { name: 'weight', type: 'xs:double', optional: true }
      ],
      returnType: 'cts:element-word-query',
      description: 'Constructs a query matching documents with specific words inside $element-name.'
    }]
  },
  {
    namespace: 'cts', localName: 'highlight',
    summary: 'Returns a copy of a node with query matches highlighted.',
    since: '5.0',
    signatures: [{
      params: [
        { name: 'node', type: 'node()' },
        { name: 'query', type: 'cts:query' },
        { name: 'callback', type: 'function(*)' }
      ],
      returnType: 'node()*',
      description: 'Walks $node and calls $callback for each text substring matching $query.'
    }]
  },
  {
    namespace: 'cts', localName: 'score',
    summary: 'Returns the relevance score of a node from a cts:search.',
    since: '5.0',
    signatures: [{
      params: [{ name: 'node', type: 'node()' }],
      returnType: 'xs:float?',
      description: 'Returns the cts:search relevance score for $node.'
    }]
  },

  // ── Priority 2 — map: ─────────────────────────────────────────────────────

  {
    namespace: 'map', localName: 'map',
    summary: 'Creates a new empty map.',
    since: '6.0',
    signatures: [{ params: [], returnType: 'map:map', description: 'Creates and returns a new empty mutable map.' }]
  },
  {
    namespace: 'map', localName: 'get',
    summary: 'Returns the value associated with a key in a map.',
    since: '6.0',
    signatures: [{
      params: [
        { name: 'map', type: 'map:map' },
        { name: 'key', type: 'xs:string' }
      ],
      returnType: 'item()*',
      description: 'Returns the value stored under $key in $map.'
    }]
  },
  {
    namespace: 'map', localName: 'put',
    summary: 'Sets a key-value pair in a map.',
    since: '6.0',
    signatures: [{
      params: [
        { name: 'map', type: 'map:map' },
        { name: 'key', type: 'xs:string' },
        { name: 'value', type: 'item()', occurrence: '*' }
      ],
      returnType: 'empty-sequence()',
      description: 'Stores $value under $key in $map (mutable operation).'
    }]
  },
  {
    namespace: 'map', localName: 'delete',
    summary: 'Removes a key-value pair from a map.',
    since: '6.0',
    signatures: [{
      params: [
        { name: 'map', type: 'map:map' },
        { name: 'key', type: 'xs:string' }
      ],
      returnType: 'empty-sequence()',
      description: 'Removes $key and its associated value from $map.'
    }]
  },
  {
    namespace: 'map', localName: 'keys',
    summary: 'Returns all keys in a map.',
    since: '6.0',
    signatures: [{
      params: [{ name: 'map', type: 'map:map' }],
      returnType: 'xs:string*',
      description: 'Returns the sequence of keys present in $map.'
    }]
  },
  {
    namespace: 'map', localName: 'contains',
    summary: 'Returns true if a map contains a given key.',
    since: '6.0',
    signatures: [{
      params: [
        { name: 'map', type: 'map:map' },
        { name: 'key', type: 'xs:string' }
      ],
      returnType: 'xs:boolean',
      description: 'Returns true if $key exists in $map.'
    }]
  },

  // ── Priority 2 — json: ────────────────────────────────────────────────────

  {
    namespace: 'json', localName: 'object',
    summary: 'Creates a JSON object node from a map.',
    since: '8.0',
    signatures: [{
      params: [{ name: 'map', type: 'map:map' }],
      returnType: 'object-node()',
      description: 'Constructs a JSON object node from the entries in $map.'
    }]
  },
  {
    namespace: 'json', localName: 'array',
    summary: 'Creates a JSON array node from a sequence.',
    since: '8.0',
    signatures: [{
      params: [{ name: 'items', type: 'item()', occurrence: '*' }],
      returnType: 'array-node()',
      description: 'Constructs a JSON array node from $items.'
    }]
  },
  {
    namespace: 'json', localName: 'to-array',
    summary: 'Converts a sequence to a JSON array.',
    since: '8.0',
    signatures: [{
      params: [
        { name: 'items', type: 'item()', occurrence: '*', optional: true },
        { name: 'size', type: 'xs:integer', optional: true }
      ],
      returnType: 'json:array',
      description: 'Returns a json:array containing the items of $items.'
    }]
  },

  // ── Priority 2 — sem: ─────────────────────────────────────────────────────

  {
    namespace: 'sem', localName: 'sparql',
    summary: 'Executes a SPARQL query against the triple store.',
    since: '7.0',
    signatures: [{
      params: [
        { name: 'sparql', type: 'xs:string' },
        { name: 'bindings', type: 'map:map', occurrence: '?', optional: true },
        { name: 'options', type: 'xs:string', occurrence: '*', optional: true },
        { name: 'store', type: 'sem:store', occurrence: '*', optional: true }
      ],
      returnType: 'sem:binding*',
      description: 'Evaluates the SPARQL $sparql query and returns solution bindings.'
    }]
  },
  {
    namespace: 'sem', localName: 'iri',
    summary: 'Constructs a semantic IRI value.',
    since: '7.0',
    signatures: [{
      params: [{ name: 'value', type: 'xs:anyAtomicType' }],
      returnType: 'sem:iri',
      description: 'Returns a sem:iri from $value.'
    }]
  },
  {
    namespace: 'sem', localName: 'triple',
    summary: 'Constructs an RDF triple.',
    since: '7.0',
    signatures: [{
      params: [
        { name: 'subject', type: 'sem:iri' },
        { name: 'predicate', type: 'sem:iri' },
        { name: 'object', type: 'xs:anyAtomicType' }
      ],
      returnType: 'sem:triple',
      description: 'Constructs an RDF triple from subject, predicate, and object.'
    }]
  },
];
