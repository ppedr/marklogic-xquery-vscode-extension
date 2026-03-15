xquery version "1.0-ml";

(:
  Edge cases:
    1. Nested comments
    2. < ambiguity — operator vs XML constructor
    3. Doubled-delimiter string escapes
    4. Axis :: vs namespace : disambiguation
    5. Pragma / extension expressions
:)

(: 1. Nested comments — inner comment must not close the outer one :)
(: outer start (: inner comment :) outer still open :)
declare variable $nested-comment-ok as xs:boolean := true();

(: 2. < as comparison operator — preceded by $var, number, or ) :)
declare variable $a as xs:integer := 5;
declare variable $b as xs:integer := 10;

let $is-less   := if ($a lt $b) then "yes" else "no"
let $compare   := if (fn:count((1,2,3)) gt 2) then "many" else "few"

(: 2b. < starting an XML constructor — after :=, return, then, else, (, comma :)
let $xml-after-assign := <element/>
let $xml-in-return :=
  if (true()) then <yes/> else <no/>

(: 3. Doubled-delimiter string escapes — NOT backslash :)
let $double-quote   := "He said ""hello"" to her"
let $single-quote   := 'it''s a fine day'
let $mixed          := "apostrophe ' inside double quotes"
let $entity-ref     := "less-than: &lt; greater-than: &gt; ampersand: &amp;"

(: 4a. XPath axis steps — child::, descendant::, ancestor-or-self:: etc. :)
let $root := <a><b><c/></b></a>
let $children        := $root/child::*
let $self            := $root/self::element()
let $desc            := $root/descendant::*
let $desc-or-self    := $root/descendant-or-self::node()
let $anc-or-self     := $root/child::b/ancestor-or-self::*
let $following-sib   := $root/child::b/following-sibling::*
let $attr-axis       := $root/attribute::*

(: 4b. Namespace-qualified name — single colon, not axis :)
let $ns-call := xdmp:version()
let $fn-call := fn:string-length("test")

(: 4c. :: in axis must NOT be treated as namespace separator :)
let $axis-not-ns := $root/preceding-sibling::*

(: 5. Pragma / extension expression :)
let $pragma-val := (# xdmp:value #) { $a + $b }

(: Numbers: integer, decimal, double :)
let $int-val     := 42
let $decimal-val := 3.14
let $double-val  := 2.5e10
let $neg-double  := 1.0e-3

(: Typeswitch :)
let $typed := typeswitch ($root)
  case element(a) return "element a"
  case text()     return "text node"
  default         return "other"

(: Try-catch :)
let $safe :=
  try {
    xdmp:document-get("/nonexistent.xml")
  } catch ($err) {
    xdmp:log(fn:string($err), "warning"),
    ()
  }

return ($is-less, $compare, $double-quote, $single-quote, $entity-ref,
        $children, $ns-call, $pragma-val, $int-val, $decimal-val,
        $double-val, $typed, $safe)
