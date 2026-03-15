xquery version "1.0-ml";

(: XML literals with embedded XQuery expressions and attributes :)

declare variable $title as xs:string := "My Document";
declare variable $items as xs:string* := ("alpha", "beta", "gamma");

(: Simple element constructor :)
let $simple := <title>{$title}</title>

(: Element with static and dynamic attributes :)
let $with-attrs :=
  <document type="report" version="1.0" count="{fn:count($items)}">
    <header>{$title}</header>
    <items>
      {
        for $item in $items
        let $upper := fn:upper-case($item)
        return <item name="{$item}" upper="{$upper}">{$upper}</item>
      }
    </items>
  </document>

(: Nested XML constructors with embedded expressions :)
let $nested :=
  <root>
    <child>
      <grandchild attr="static">{fn:string-length($title)}</grandchild>
    </child>
  </root>

(: Self-closing element :)
let $empty := <br/>

return ($simple, $with-attrs, $nested, $empty)
