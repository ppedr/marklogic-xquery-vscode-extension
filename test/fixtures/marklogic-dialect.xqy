xquery version "1.0-ml";

(: MarkLogic 1.0-ml dialect: xdmp/cts calls, declare option, private functions :)

declare option xdmp:mapping "false";

declare private function local:get-doc($uri as xs:string) as document-node()? {
  xdmp:document-get($uri)
};

declare %private function local:annotated($x as xs:integer) as xs:integer {
  $x + 1
};

declare variable $db-name as xs:string :=
  xdmp:database-name(xdmp:database());

let $results := cts:search(
  fn:doc(),
  cts:and-query((
    cts:collection-query("my-collection"),
    cts:word-query("marklogic", ("case-insensitive"))
  )),
  ("unfiltered", "score-logtf")
)
for $doc in $results
let $uri := xdmp:node-uri($doc)
let $props := xdmp:document-properties($uri)
return (
  xdmp:log(fn:concat("Found: ", $uri), "debug"),
  $doc
)
