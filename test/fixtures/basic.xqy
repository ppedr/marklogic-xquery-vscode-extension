xquery version "3.1";

(: Basic FLWOR, function declaration, namespace import :)

import module namespace math = "http://www.w3.org/2005/xpath-functions/math"
  at "math-utils.xqy";

declare namespace local = "http://example.com/local";

declare variable $greeting as xs:string := "Hello, World!";

declare function local:greet(
  $name as xs:string,
  $lang as xs:string?
) as xs:string {
  fn:concat($greeting, " From: ", $name)
};

declare function local:double($n as xs:integer) as xs:integer {
  $n * 2
};

for $item in (1, 2, 3, 4, 5)
let $doubled := local:double($item)
where $doubled gt 4
order by $item ascending
return
  local:greet(fn:string($doubled), ())
