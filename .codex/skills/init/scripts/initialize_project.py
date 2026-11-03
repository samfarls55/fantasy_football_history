#!/usr/bin/env python3
"""Create the deterministic portion of an init project wiki."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parent.parent
ASSETS_ROOT = SKILL_ROOT / "assets"
CORE_ROOT = ASSETS_ROOT / "core"
MODULES_ROOT = ASSETS_ROOT / "modules"
PROJECT_MANIFEST = Path("wiki/_system/init.json")


@dataclass(frozen=True)
class TemplateFile:
    source: Path
    relative: Path

    @property
    def content(self) -> bytes:
        return self.source.read_bytes()

    @property
    def digest(self) -> str:
        return hashlib.sha256(self.content).hexdigest()


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Cannot read manifest {path}: {exc}") from exc


def discover_modules() -> list[str]:
    if not MODULES_ROOT.exists():
        return []
    return sorted(
        path.name
        for path in MODULES_ROOT.iterdir()
        if path.is_dir() and (path / "manifest.json").is_file()
    )


def parse_modules(value: str | None, available: list[str]) -> list[str]:
    requested = [] if not value else [item.strip() for item in value.split(",")]
    requested = sorted({item for item in requested if item})
    unknown = sorted(set(requested) - set(available))
    if unknown:
        raise SystemExit(
            f"Unknown modules: {', '.join(unknown)}. Available: {', '.join(available)}"
        )
    return requested


def template_files(root: Path) -> list[TemplateFile]:
    template_root = root / "template"
    if not template_root.exists():
        return []
    return [
        TemplateFile(path, path.relative_to(template_root))
        for path in sorted(template_root.rglob("*"))
        if path.is_file()
    ]


def existing_manifest(target: Path) -> dict:
    path = target / PROJECT_MANIFEST
    if not path.exists():
        return {}
    return load_json(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Initialize or extend a project wiki without overwriting project files."
    )
    parser.add_argument("target", type=Path, help="Project working directory")
    parser.add_argument("--modules", help="Comma-separated optional modules")
    parser.add_argument(
        "--dry-run", action="store_true", help="Show the plan without writing"
    )
    parser.add_argument(
        "--list-modules", action="store_true", help="List available modules and exit"
    )
    args = parser.parse_args()

    available = discover_modules()
    if args.list_modules:
        print("\n".join(available))
        return 0

    target = args.target.expanduser().resolve()
    if target.exists() and not target.is_dir():
        print(f"Target is not a directory: {target}", file=sys.stderr)
        return 2
    requested = parse_modules(args.modules, available)
    current = existing_manifest(target) if target.exists() else {}
    current_modules = current.get("modules", [])
    enabled_modules = sorted(set(current_modules) | set(requested))
    tracked_files = current.get("managed_files", {})

    core_manifest = load_json(CORE_ROOT / "manifest.json")
    directories = {Path(item) for item in core_manifest.get("directories", [])}
    files = template_files(CORE_ROOT)
    for module in enabled_modules:
        module_root = MODULES_ROOT / module
        module_manifest = load_json(module_root / "manifest.json")
        directories.update(Path(item) for item in module_manifest.get("directories", []))
        files.extend(template_files(module_root))

    by_destination: dict[Path, TemplateFile] = {}
    conflicts: list[str] = []
    for item in files:
        previous = by_destination.get(item.relative)
        if previous and previous.content != item.content:
            conflicts.append(item.relative.as_posix())
        by_destination[item.relative] = item

    create_files: list[TemplateFile] = []
    unchanged: list[TemplateFile] = []
    preserved: list[TemplateFile] = []
    for relative, item in sorted(
        by_destination.items(), key=lambda pair: pair[0].as_posix()
    ):
        destination = target / relative
        if not destination.exists():
            create_files.append(item)
            continue
        if not destination.is_file():
            conflicts.append(relative.as_posix())
            continue
        existing_digest = hashlib.sha256(destination.read_bytes()).hexdigest()
        if existing_digest == item.digest:
            unchanged.append(item)
        elif relative.as_posix() in tracked_files:
            preserved.append(item)
        else:
            conflicts.append(relative.as_posix())

    print(f"Target: {target}")
    print(f"Modules: {', '.join(enabled_modules) if enabled_modules else 'none'}")
    for directory in sorted(directories, key=lambda path: path.as_posix()):
        if not (target / directory).exists():
            print(f"CREATE DIR  {directory.as_posix()}")
    for item in create_files:
        print(f"CREATE FILE {item.relative.as_posix()}")
    for item in preserved:
        print(f"PRESERVE    {item.relative.as_posix()} (project customized)")
    for item in unchanged:
        print(f"UNCHANGED   {item.relative.as_posix()}")
    for relative in sorted(set(conflicts)):
        print(f"CONFLICT    {relative}")

    if conflicts:
        print("No files written. Resolve conflicts before initialization.", file=sys.stderr)
        return 2
    if args.dry_run:
        print("Dry run complete. No files written.")
        return 0

    target.mkdir(parents=True, exist_ok=True)
    for directory in directories:
        (target / directory).mkdir(parents=True, exist_ok=True)
    for item in create_files:
        destination = target / item.relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(item.content)

    managed_files = dict(tracked_files)
    for relative, item in by_destination.items():
        managed_files.setdefault(relative.as_posix(), item.digest)

    manifest_content = {
        "template_version": core_manifest["template_version"],
        "modules": enabled_modules,
        "managed_files": dict(sorted(managed_files.items())),
    }
    manifest_path = target / PROJECT_MANIFEST
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest_content, indent=2) + "\n", encoding="utf-8"
    )
    print(f"WRITE       {PROJECT_MANIFEST.as_posix()}")
    print("Initialization template applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
