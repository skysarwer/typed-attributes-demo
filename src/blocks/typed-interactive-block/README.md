# Typed Interactive Block

> **Note**
> Check the [Interactivity API Reference docs in the Block Editor handbook](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/) to learn more about the Interactivity API.

This block has been created with the `@wordpress/create-block-interactive-template` and the `typescript` variant. It showcases a basic structure of an interactive block that uses the Interactivity API, with specific enhancements to demonstrate the automated type generation for block attributes and full migration to typescript files.

---

## Demo Enhancements & Context

This demo builds upon the standard `@wordpress/create-block` interactive template to showcase the seamless integration of automated attribute type generation. The following modifications were made to highlight the utility's capabilities:

*   **Full TypeScript Integration:** To provide an end-to-end demonstration of type safety, key files have been migrated from JavaScript to TypeScript:
    *   `index.js` has been renamed and refactored to `index.ts`.
    *   `edit.js` has been renamed and refactored to `edit.tsx`.
    *   This ensures the block's core logic benefits fully from TypeScript, demonstrating the problem this utility solves.
*   **Attribute Demonstration for Theme State:** To accurately showcase attribute typing and dynamic behavior, theme state colors have been incorporated:
    *   **`block.json`:** Attributes for light and dark theme background and text colors have been added, defining their types and defaults.
    *   **Inspector Controls (`edit.tsx`):** A dedicated panel in the Block Inspector controls allows users to manage these theme colors, demonstrating type-safe attribute manipulation.
    *   **Editor Preview:** Attributes are passed as CSS variables within the editor preview, offering a live visualization of the dynamic typing. The editor preview is made to mirror the rendered content from `render.php`
    *   **Styling (`style.scss`):** The SCSS file has been updated to use these CSS variables, ensuring dynamic styling based on attribute values.
    *   **Rendering (`render.php`):** Similarly, attributes are passed as CSS variables in the rendered HTML for front-end consistency.