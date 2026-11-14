# PDF X-Axis Lock

A small Zotero PDF-reader add-on that freezes horizontal page movement while preserving vertical scrolling and native PDF text selection.

**Current release:** 1.0.7  
**Verified environment:** Zotero 10.0.8 on Windows.

## Features

- Adds a Lock X button to the PDF reader toolbar.
- Locks the current horizontal viewing position without repeatedly snapping scrollLeft back.
- Keeps vertical scrolling available.
- Preserves PDF.js native text selection and copy behavior.
- Unlocking removes the temporary clipping wrapper and restores the original horizontal position.

## Install

1. Download the XPI from the dist folder in this repository.
2. In Zotero, open Tools > Plugins.
3. Use the gear menu > Install Plugin From File and select the XPI.
4. Restart Zotero and open a PDF.
5. Adjust zoom and horizontal position first, then click Lock X.

## Compatibility

The manifest targets Zotero 10.0.x. The maintainer verified Zotero 10.0.8 on Windows. Other Zotero versions and operating systems have not yet been verified.

## Implementation

The add-on wraps PDF.js #viewer in a temporary clipping element using overflow-x: clip and overflow-y: visible, translates the viewer by the pre-lock horizontal offset, and resets #viewerContainer.scrollLeft to zero. This removes the horizontal scroll range without scroll-position snap-back. It relies on Zotero/PDF.js internal DOM structure and private reader fields, which may change in future releases.

## Build

Run `python scripts/build_release.py --owner Starshines1` to generate the manifest, XPI, and updates.json in dist/.

## License

No license has been assigned yet. Public visibility on GitHub does not itself grant permission to redistribute modified versions or reuse the code. A license should be selected by the repository owner before describing this project as open source.
