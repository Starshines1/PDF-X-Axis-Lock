# Changelog

## 1.0.7 — 2026-11-14

- Replaced scroll-position snap-back with a clipping wrapper around PDF.js #viewer.
- Preserved the currently visible horizontal page position using a translate transform.
- Removed the horizontal scroll range while preserving vertical scroll height.
- Kept native PDF.js text selection and copying intact in the maintainer's Zotero 10.0.8 test.
- Added validation and rollback if the horizontal clipping layout cannot be applied.
- Restored the original viewer transform and horizontal position when unlocking.
