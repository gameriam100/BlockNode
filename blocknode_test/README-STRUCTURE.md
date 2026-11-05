# Blockode source structure

The application is organized by feature. Each JavaScript file owns one part of the editor so routine changes can be made in JavaScript without editing CSS.





# AI instructions for analyzing/ changing program

* Only inspect files related to the requested feature.
* Never scan the entire project unless explicitly requested.
* Don't modify CSS when changing JavaScript functionality.
* Don't rewrite unrelated scripts.
* Check only directly connected dependencies when necessary.
* Report which files were changed.
every minute give me the zip with updated json files only.
give me options, and let me ever accept updates or deny them.
* output only updated files/ json and css.



## JavaScript layout

* `js/core/` — shared state, block definitions, and utility functions.
* `js/editor/blocks/model.js` — adding, removing, editing, grouping, and custom coding blocks.
* `js/editor/blocks/canvas.js` — drawing the block workspace.
* `js/editor/blocks/tracks.js` — track rendering and drag/drop behavior.
* `js/editor/blocks/inspector.js` — coding-block property controls and condition editors.
* `js/library/blocks.js` — block-library panel and block palette rendering.
* `js/library/assets.js` — PNG asset import, storage, and asset-library rendering.
* `js/runtime/engine.js` — execution logic for projects.
* `js/runtime/preview.js` — canvas preview, camera, and preview tools.
* `js/scene/` — scene and node creation, selection, tree rendering, and hierarchy.
* `js/ui/` — independent interface features such as inspector, menus, tabs, settings, debug, search, and gutters.
* `js/input/` — keyboard bindings and preview input.
* `js/project/` — saving/loading, undo/redo, and file-drop layout behavior.
* `js/init.js` — startup and session restoration only.

## Where to make common changes

|Change|File|
|-|-|
|Add or change a coding block's default values / behavior data|`core/block-defs.js` and `editor/blocks/model.js`|
|Change how coding blocks look in the workspace|`editor/blocks/canvas.js`|
|Change block property controls|`editor/blocks/inspector.js`|
|Change tracks and track interactions|`editor/blocks/tracks.js`|
|Change the block palette/library|`library/blocks.js`|
|Change PNG asset handling|`library/assets.js`|
|Change how blocks execute|`runtime/engine.js`|
|Change the live preview|`runtime/preview.js`|
|Change a GUI panel or menu|The matching file in `ui/`|
|Change scenes or the scene tree|The matching file in `scene/`|

## Script loading

`dev.html` loads the scripts in dependency order. They intentionally remain classic scripts (not JavaScript modules) because the current application shares functions and state between files and uses inline HTML event handlers. Keep the order in `dev.html` when adding a script: shared core first, feature logic next, startup last. Do not add `type="module"` unless the shared global-state architecture is deliberately migrated.

## Styling

The existing CSS files and their selectors are unchanged. Use JavaScript for behavior, rendering, and GUI structure; use CSS only when a visual style or layout rule itself needs to change.

