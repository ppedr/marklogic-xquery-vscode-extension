# XQuery + MarkLogic — VSCode Extension

Rich XQuery editing support for Visual Studio Code, with full coverage of the
MarkLogic `1.0-ml` dialect alongside W3C XQuery 3.0/3.1.

---

## Features

| Feature | Details |
|---|---|
| **Syntax highlighting** | Keywords, operators, strings, numbers, variables, XML literals, comments, annotations, pragmas |
| **MarkLogic dialect** | `xquery version "1.0-ml"`, `declare private function`, `xdmp:`/`cts:`/`sem:`/`json:` namespaces |
| **Code completion** | Namespace-triggered (`xdmp:`, `cts:`, `fn:`…), variable scan, keyword and type completions |
| **Hover documentation** | Full signature, parameter table, return type, and "available since" for all built-in functions |
| **Signature help** | Active-parameter highlighting inside function argument lists, triggered on `(` and `,` |
| **Go to Definition** | Ctrl+Click on local functions, variables, and `import module … at "path"` — resolves relative and server-absolute paths |
| **Document Symbols** | Outline panel and breadcrumb navigation for functions, variables, and namespace declarations |
| **Diagnostics / Linting** | Real-time and on-save checks for syntax errors, undeclared variables, unused declarations, deprecated functions, cross-file conflicts, and more |
| **Code snippets** | `xqversion`, `module`, `import`, `fn`, `var`, `flwor`, `if`, `typeswitch`, `try`, `log`, `search`, `eval` |
| **Language configuration** | XQuery block comments `(: :)`, bracket matching, auto-close pairs |

### Supported file extensions

`.xq` · `.xqy` · `.xquery` · `.xqm` · `.xql`

### Supported dialects

| Dialect | Version string |
|---|---|
| W3C XQuery 3.0 | `xquery version "3.0"` |
| W3C XQuery 3.1 | `xquery version "3.1"` |
| MarkLogic extended | `xquery version "1.0-ml"` |

---

## Installation

### From the VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Run `ext install ppfjuni.marklogic-xquery-vscode-extension`

### From a `.vsix` file

1. Download the latest `.vsix` from the [Releases](https://github.com/marklogic-xquery/marklogic-xquery-vscode/releases) page
2. In VS Code open the Command Palette (`Ctrl+Shift+P`)
3. Run **Extensions: Install from VSIX…** and select the downloaded file

### Build from source

```bash
git clone https://github.com/marklogic-xquery/marklogic-xquery-vscode.git
cd marklogic-xquery-vscode
npm install
npm run build
# Then package the extension:
npx vsce package
```

Install the generated `.vsix` via **Extensions: Install from VSIX…** as above.

---

## Usage

Open any `.xqy` (or other supported extension) file — the extension activates automatically.

### Completions

| Trigger | What you get |
|---|---|
| Type `xdmp:` | All `xdmp:` functions with snippet insertion |
| Type `cts:` | All `cts:` search functions |
| Type `fn:` | W3C standard `fn:` functions |
| Type `xs:` | All `xs:` constructor functions |
| Type `$` | Variables declared above the cursor |
| Type `%` | XQuery 3.0 annotation names |
| After `as ` | Built-in types (`xs:string`, `item()`, `node()`…) |

### Snippets

| Prefix | Expands to |
|---|---|
| `xqversion` | `xquery version "1.0-ml";` |
| `module` | Module namespace declaration |
| `import` | Import module statement |
| `fn` | Declare function scaffold |
| `var` | Declare variable |
| `flwor` | Full FLWOR expression |
| `if` | If-then-else |
| `typeswitch` | Typeswitch with cases |
| `try` | Try-catch block |
| `log` | `xdmp:log(…)` |
| `search` | `cts:search(…)` |
| `eval` | `xdmp:eval(…)` |

### Go to Definition

- **Ctrl+Click** (or **F12**) on a local function call → jumps to its `declare function`
- **Ctrl+Click** on a `$variable` → jumps to its `let`, `for`, or `declare variable` binding
- **Ctrl+Click** on a namespace prefix in `import module namespace pfx = … at "path.xqy"` → opens the target file if it exists in the workspace (supports both relative and server-absolute paths)

### Diagnostics

The extension runs a multi-phase linting engine automatically as you type and on save.

**Real-time checks (debounced, 500 ms):**

| Check | What it catches |
|---|---|
| Unclosed comment | Unmatched `(:` / `:)` |
| Unclosed string | Unclosed `"` or `'` (handles doubled-delimiter escapes) |
| Unmatched brackets | Unmatched `{` `}` and `(` `)` |
| Unclosed XML element | Tags opened but never closed |
| Missing semicolon | Declaration or statement missing `;` |
| Invalid version | Version string other than `"1.0"`, `"1.0-ml"`, `"3.0"`, `"3.1"` |
| Variable before declaration | Using `$var` before it is declared |
| Duplicate functions | Same function declared twice in the same file |
| Unused declared variables | `declare variable` never referenced |
| Unused functions | `declare function` never called |
| Unused function parameters | Parameter declared but not used in its function body |
| Empty catch | `catch` block with no error handling |
| Deprecated functions | Calls to deprecated MarkLogic functions |
| Unused namespace declarations | `declare namespace` prefix never used |
| Namespace conflict | Conflicting `declare default function namespace` |
| Missing return type | `declare function` without an explicit return type |
| MarkLogic in standard mode | MarkLogic-specific constructs in a non-`1.0-ml` file |
| Unresolved variables | Reference to an undefined variable |
| Unresolved functions | Call to a function not declared or imported |
| Unresolved XML namespaces | XML element/attribute prefix not declared |

**On-save checks (cross-file):**

| Check | What it catches |
|---|---|
| Cross-file duplicate functions | Function name conflicts across imported modules |
| Cross-file unresolved functions | Calls to functions not found in any imported module |

---

## Scope

This extension covers **language editing only**: syntax highlighting, completions, hover,
signature help, go-to-definition, document symbols, diagnostics, and snippets.

The following are **out of scope** for this extension:

- Database connections and query execution
- Debugging
- Cross-file import resolution without a local `at "..."` path

**Not yet implemented:**

- Code folding (planned)

---

## Contributing

1. Fork the repository
2. `npm install`
3. Open in VS Code and press `F5` to launch the Extension Development Host
4. Make changes, run `npm run compile` to type-check, `npm run build` to bundle
5. Submit a pull request

---

## License

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

This project is a derivative work of the
[marklogic-intellij-plugin](https://github.com/overstory/marklogic-intellij-plugin)
by Grzegorz Ligas and contributors, also licensed under Apache 2.0.

"MarkLogic" is a registered trademark of Progress Software Corporation.
This is an independent community project, not affiliated with or endorsed by Progress Software Corporation.
