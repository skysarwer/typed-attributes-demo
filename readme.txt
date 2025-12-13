=== Gutenberg Typed Attributes Demo ===
Contributors:      Evan Buckiewicz
Tags:              gutenberg, block, typescript, developer-tools, type-safety, build-process, json-schema, dx
Tested up to:      6.7
Stable tag:        0.1.0
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

Demonstrates automated TypeScript interface generation for Gutenberg block attributes from block.json, enhancing type safety and developer experience.

== Description ==

This demonstration block plugin showcases a robust approach to significantly improving the TypeScript developer experience for Gutenberg blocks. It addresses a simple pain point: the manual synchronization of TypeScript interfaces with block attribute definitions found in `block.json`.

This plugin was scaffolded with the `@wordpress-create-block@latest` package with the `@wordpress/create-block-interactive-template` template, and the `typescript` template variant. 

**The Problem:**
Even when scaffolding blocks with the official `@wordpress/create-block` tool using the `typescript` variant (e.g., with the `interactive-template`), the primary block editing component (`edit.js`) and registration file (`index.js`) defaults to plain JavaScript, while `view.ts` utilizes TypeScript. This creates an inconsistent developer experience where type-checking is not fully leveraged for the block's core editing logic. Developers currently face the tedious and error-prone task of manually defining interfaces that mirror their block's `attributes` property in `block.json` and often need to manually convert `edit.js` to `edit.tsx` to apply full TypeScript.

This leads to:
*   Repetitive boilerplate code and fragmented type safety.
*   Potential for discrepancies and "drift" when `block.json` attributes are updated, leading to runtime errors or subtle bugs.
*   A less robust end-to-end type-checking environment, diminishing the primary benefit of TypeScript where it's most needed.
