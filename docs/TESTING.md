# Manual test checklist

Tested by the maintainer on Windows with Zotero 10.0.8.

- [x] renderToolbar listener registers.
- [x] PDF reader toolbar button is visible and clickable.
- [x] Lock preserves the visual horizontal position.
- [x] viewerContainer.scrollLeft becomes 0 after locking.
- [x] viewerContainer.scrollWidth equals clientWidth after locking.
- [x] viewerContainer.scrollHeight remains unchanged in the manual test.
- [x] Native text selection returns selected PDF text.
- [x] Vertical scrolling remains functional.
- [x] No horizontal snap-back/jitter in the user's test.
- [x] Packaged 1.0.7 XPI installed and lock/unlock exercised on the maintainer's current Zotero profile.
- [ ] Verify installation and lock/unlock on a clean Zotero profile.
- [ ] Test with other PDF page sizes, zoom modes, and multi-page continuous scroll.
- [ ] Test on macOS and Linux.
- [ ] Test compatibility with future Zotero 10.x releases.

Completed checks are user-reported/manual runtime checks, not an automated CI test suite.
