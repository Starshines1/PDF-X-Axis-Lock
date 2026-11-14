#!/usr/bin/env python3
"""Build the XPI and Zotero update manifest for this GitHub repository."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = "1.0.7"
PLUGIN_ID = "pdf-x-axis-lock@chatgpt.local"

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--owner", required=True, help="GitHub username or organization")
    parser.add_argument("--repo", default="PDF-X-Axis-Lock")
    args = parser.parse_args()

    repo_url = f"https://github.com/{args.owner}/{args.repo}"
    raw_base = f"https://raw.githubusercontent.com/{args.owner}/{args.repo}/main"
    manifest = json.loads((ROOT / "manifest.template.json").read_text(encoding="utf-8"))
    manifest["homepage_url"] = repo_url
    manifest["applications"]["zotero"]["update_url"] = f"{raw_base}/dist/updates.json"

    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    (dist / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    xpi = dist / f"PDF-X-Axis-Lock-{VERSION}.xpi"
    with zipfile.ZipFile(xpi, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(dist / "manifest.json", "manifest.json")
        zf.write(ROOT / "bootstrap.js", "bootstrap.js")

    digest = hashlib.sha256(xpi.read_bytes()).hexdigest()
    updates = {"addons": {PLUGIN_ID: {"updates": [{"version": VERSION, "update_link": f"{raw_base}/dist/{xpi.name}", "update_hash": f"sha256:{digest}", "applications": {"zotero": {"strict_min_version": "10.0.0", "strict_max_version": "10.0.*"}}}]}}}
    (dist / "updates.json").write_text(json.dumps(updates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built: {xpi}")
    print(f"SHA-256: {digest}")

if __name__ == "__main__":
    main()
