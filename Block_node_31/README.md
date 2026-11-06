**What AI needs to do to update program?**
Figure out which specific parts to update using this read me.
Scan for those files.
Update and read only those files.
Keep parts modular
Give a download for the updated json and css files at the end (with folder categories there in).

Every minute stop, and give me the updated files. Supply options for what to update next.





Blockode
├── State     – scenes, selection, node helpers
├── Blocks    – BLOCKS, customBlocks, getDef, …
├── UI        – setView, toggle panels, toast, …
├── Art       – ART (pixel editor)
├── Audio     – AUDIO (sfx / music)
├── Runtime   – toggle / stop
├── Project   – save / load / undo
├── Input     – INPUT
└── on/off/emit – tiny event bus

blockode.exe / Blockode.bat  ← App runners/builders
main.go                      ← Starts server, opens Edge window
server.go                    ← Local HTTP server (Endpoints: /api/projects, /api/project-files, /api/assets)
web/dev.html                 ← Main HTML entry point (classic scripts, no modules)
web/src/js/
├── core/                    ← App namespace, shared state, block definitions, and utils
├── editor/blocks/           ← Block model, canvas workspace, tracks, and inspector controls
├── library/                 ← Block palette and asset management
├── runtime/                 ← Game execution engine and canvas preview
├── scene/                   ← Scene model and tree view
├── ui/                      ← Panels, menus, settings, debug, search, and gutters
├── input/                   ← Keyboard bindings and preview input handling
├── project/                 ← Project storage, saving/loading, undo/redo, and disk APIs
├── art/                     ← Self-contained pixel-art editor (ART)
├── audio/                   ← Self-contained audio engine (AUDIO)
└── init.js                  ← Startup, session restoration, and event binding
data/                        ← Application settings and per-project folders (.json files \& assets/)

