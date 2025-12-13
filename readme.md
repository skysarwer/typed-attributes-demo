# Gutenberg Typed Attributes Demo

**Contributors:** Evan Buckiewicz
**Tags:** gutenberg, block, typescript, developer-tools, type-safety, build-process, json-schema, dx
**Tested up to:** 6.7
**Stable tag:** 0.1.0
**License:** GPL-2.0-or-later
**License URI:** https://www.gnu.org/licenses/gpl-2.0.html

---

## **Gutenberg Typed Attributes: Seamless Type Safety for Block Developers**

Automated TypeScript interface generation for Gutenberg block attributes from `block.json`, eliminating boilerplate and enhancing type safety across the entire block lifecycle.

---

## Description

This demonstration block plugin showcases a robust approach to significantly improving the TypeScript developer experience for Gutenberg blocks. It addresses a critical pain point: the chronic manual synchronization of TypeScript interfaces with block attribute definitions found in `block.json`.

This plugin was scaffolded with `@wordpress/create-block@latest` using the `typescript` variant of the `interactive-template`.

### **The Problem: Fragmented Type Safety & Developer Friction**

Even with official TypeScript scaffolding, the Gutenberg development experience often remains inconsistent. Core editing components (`edit.js`) and block registration (`index.js`) frequently default to plain JavaScript, while only `view.ts` leverages TypeScript. This creates a fragmented type-checking environment where the block's core editing logic often misses out on TypeScript's primary benefits.

Developers currently face:
*   **Manual Boilerplate:** The tedious and error-prone task of manually defining TypeScript interfaces that mirror their block's `attributes` property in `block.json`. This often involves manually converting `edit.js` to `edit.tsx` just to enable type checking where it's most needed.
*   **"Type Drift":** High potential for discrepancies when `block.json` attributes are updated, leading to runtime errors, subtle bugs, and debugging headaches.
*   **Diminished DX:** A less robust, end-to-end type-checking environment, eroding confidence and hindering developer velocity.

### **The Solution: `block.json` as the Single Source of Truth**

This plugin integrates a build-time utility that directly reads the `attributes` definition from `block.json` and automatically generates a precise TypeScript interface (`.d.ts` file). This dynamically created interface can then be consumed directly within your block's `edit.tsx` and `save.tsx` files, providing unparalleled compile-time type safety for `props.attributes`.

### **Key Benefits Illustrated:**
*   **Eliminates Boilerplate:** Drastically reduces the need for manual type declarations, allowing developers to focus on block functionality.
*   **Guaranteed Type Safety:** Catches attribute-related type errors during development, *before they impact users or require debugging at runtime*.
*   **Single Source of Truth:** Establishes `block.json` as the definitive, canonical authority for attribute definitions, ensuring consistency and preventing insidious "type drift."
*   **Enhanced Developer Experience (DX):** Improves IDE autocompletion, refactoring confidence, and overall development velocity, significantly streamlining the creation and maintenance of complex blocks.

---

## Key Features & Intelligent Type Inference

This tool provides intelligent inference for common WordPress Block development patterns:

*   **Precise Union Types for Enums:** Converts `enum` arrays in `block.json` into exact TypeScript union types (e.g., `"option1" | "option2"`), enabling superior autocompletion and compile-time validation of valid choices.
*   **Robust Nullability Handling:** Accurately types attributes with `default: null` as `Type | null`, preventing common runtime `null` vs. `undefined` mismatches.
*   **Deep Inference for Objects and Arrays:** Automatically generates nested interfaces for complex attribute defaults, ensuring comprehensive type safety for deeply structured data.
*   **Sophisticated `source: query` Parsing:**
    *   **Guaranteed Array Types:** Correctly types all `source: "query"` attributes as arrays, even if `type: "object"` is mistakenly declared in `block.json` (although a warning is logged), preventing runtime errors.
    *   **Recursive Query Support:** Flawlessly generates types for highly nested `query` definitions.
*   **Default-Based Requiredness:** Attributes are accurately typed as `Required` if they specify a `default` value, mirroring WordPress's parser behavior.
*   **Seamless Webpack Integration:** Implemented as a performant Webpack plugin, ensuring types are always up-to-date with no additional developer steps or separate watcher processes required. Optimized for efficient rebuilds in large projects.

This plugin serves as a proof-of-concept for a potential core contribution aimed at standardizing and significantly elevating the TypeScript development experience within the broader Gutenberg ecosystem.

---

## Dependencies

This plugin leverages a few key development dependencies to achieve its functionality:

*   **`@wordpress/scripts`**: The foundational dependency that this plugin attempts to extend. Our custom Webpack plugin hooks into this build pipeline.
*   **`json-schema-to-typescript`**: Performs the heavy lifting of transforming the dynamically constructed JSON Schema (derived from `block.json` attributes) into the final, accurate TypeScript interface file.
*   **`glob`**: Used during the initial build to efficiently identify `block.json` files in the `src` directory. In watch mode, its usage is minimized via caching to ensure performance.

---

## Considerations & Limitations

This utility makes intelligent inferences based on the existing `block.json` schema and WordPress runtime behavior. It has limitations based on the capabilities of the `block.json` API:

*   **Inferring Required/Optional Status:** Due to the inherent flexibility of the `block.json` schema, this utility infers an attribute's TypeScript required/optional status based on specific heuristics:
    *   **Root Attributes:** An attribute is considered `Required` if it has an explicit `default` value or if its `role` is defined as `'content'`. Otherwise, it is typed as `Optional` (`?`).
    *   **`source: query` Attributes:** Attributes nested within a `source: query` definition are considered `Required` only if they specify an explicit `default` value, as the WordPress parser will substitute this default if content extraction fails. Otherwise, they are typed as `Optional` (`?`).
*   **Inferring Nested Object and Array Schemas:** For `type: "object"` (non-query) and `type: "array"` (non-query) attributes, `block.json` does not provide a formal JSON Schema for their nested properties or items. This utility overcomes this limitation by recursively inferring the schema from the `default` value. Providing a representative `default` value is highly recommended for optimal type inference.
*   **Context Typing:** This utility specifically focuses on `attributes`. Typing `usesContext` values (e.g., `postId`, `queryId`) is outside the scope of this tool and should be typed manually if needed.
*   **Block Metadata Typing (`block-metadata.d.ts`):** This demo includes a manually maintained `block-metadata.d.ts` file (`/src/types/block-metadata.d.ts`) to type the `block.json` import itself. This is essential for full configuration type safety.

---

## Installation

This plugin is primarily a developer tool and demo. It requires a Node.js environment for its build-time utility.

1.  **Clone or Download:** Obtain the plugin files and place them into your WordPress `wp-content/plugins/` directory (e.g., `wp-content/plugins/gutenberg-typed-attributes-demo`).
2.  **Navigate & Install Dependencies:** Open your terminal, navigate to the plugin's root directory:
    ```bash
    cd wp-content/plugins/gutenberg-typed-attributes-demo
    ```
    Then, install the required development dependencies:
    ```bash
    npm install
    ```
    This will install `json-schema-to-typescript`, `glob`, and `@wordpress/scripts`.
3.  **Generate Types & Build:** Execute the build command. This command will first run the custom utility to generate the TypeScript attribute interface, then compile the block assets:
    ```bash
    npm run build
    ```
4.  **Activate Plugin:** Activate the 'Gutenberg Typed Attributes Demo' plugin through the 'Plugins' screen in your WordPress admin.
5.  **Insert Block:** In the WordPress Block Editor, search for 'Typed Attributes Demo' to insert the block. Observe its functionality, and if developing locally, note the enhanced type-safety, autocompletion, and error flagging in your IDE.

---

## Technical Overview & How It Works

### What specific problem does this utility address for TypeScript developers?

This utility bridges the inherent disconnect between the static JSON schema in `block.json` and the dynamic, type-checked nature of TypeScript components. It solves the issue of manual attribute interface creation and the resulting potential for inconsistencies and runtime errors that plague current Gutenberg TypeScript workflows.

### How does the automatic TypeScript interface generation process function?

The process is seamlessly integrated into the block's build pipeline via a custom Webpack plugin:

1.  **Webpack Hook:** During compilation (`beforeCompile`) or when `block.json` files are modified in watch mode (`watchRun`), the plugin triggers a custom Node.js utility.
2.  **`block.json` Parsing:** The utility script intelligently reads the `attributes` property from all detected `block.json` files.
3.  **JSON Schema Conversion:** These attribute definitions are dynamically transformed into a valid, optimized JSON Schema object, incorporating smart inferences for nullability, enums, and nested structures.
4.  **TypeScript Compilation:** This refined JSON Schema is then fed into the `json-schema-to-typescript` library, which generates a `.d.ts` (declaration) file containing a precise TypeScript interface (e.g., `BlockAttributes`).
5.  **Type Consumption:** This generated interface is then available for immediate import and use within the block's `edit.tsx` and `save.tsx` files, providing compile-time assurance of attribute types without any manual effort.

### What would be required to implement this utility in my own custom block?

To integrate this automated typing into your own Gutenberg block project, you would need:

1.  A block scaffolded with TypeScript support (e.g., using `@wordpress/create-block --template @wordpress/create-block-interactive-template`).
2.  The `json-schema-to-typescript` and `glob` libraries installed as `devDependencies`.
3.  The custom Node.js script (akin to the `generate-block-attributes.js` in this demo) adapted to your project's structure.
4.  The custom Webpack plugin (similar to the one in this demo's `webpack.config.js`) integrated into your project's Webpack configuration.

### Is this plugin intended as a potential core WordPress contribution?

Yes, absolutely. This demo serves as a proof-of-concept for a proposed enhancement to the WordPress core development tooling, specifically `@wordpress/scripts` or `@wordpress/create-block`. The ultimate goal is to standardize and significantly improve the developer experience for all TypeScript-enabled Gutenberg blocks by offering native, automated, and intelligent attribute type generation.