"""Prepare a local, reviewable skUnity download. Does not publish anything."""
import hashlib
import json
from pathlib import Path
import re
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent


def main():
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8-sig"))
    version = package["version"]
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?", version):
        raise ValueError("Invalid release version")
    if package["license"] != "MIT":
        raise ValueError("Review the selected license before packaging")
    vsix = ROOT / f"sktestlab-win32-x64-{version}.vsix"
    with zipfile.ZipFile(vsix) as archive:
        manifest = json.loads(archive.read("extension/package.json"))
        identity = ET.fromstring(archive.read("extension.vsixmanifest")).find(".//{*}Identity")
        if identity is None or identity.get("TargetPlatform") != "win32-x64":
            raise ValueError("Release scope requires a Windows x64 VSIX")
        if manifest["version"] != version or manifest["license"] != "MIT":
            raise ValueError("VSIX metadata does not match the release")
        if archive.read("extension/LICENSE.txt") != (ROOT / "LICENSE.txt").read_bytes():
            raise ValueError("VSIX license is stale; rebuild the package")
        if any(name.endswith(".jar") or ".vscode-test/" in name for name in archive.namelist()):
            raise ValueError("Server artifacts must not be distributed")

    output = ROOT / "release" / version
    output.mkdir(parents=True, exist_ok=True)
    source = output / f"sktestlab-{version}-source.zip"
    roots = ["src", "test", "scripts", "assets", "schemas", "examples", "docs", ".github"]
    files = [p for name in roots for p in (ROOT / name).rglob("*") if p.is_file()]
    files += [ROOT / name for name in ["package.json", "package-lock.json", "tsconfig.json", "esbuild.mjs", "eslint.config.mjs", "vitest.config.mts", ".vscode-test.mjs", ".vscode-project-test.mjs", ".vscodeignore", ".prettierignore", ".gitignore", ".gitattributes", "LICENSE.txt", "README.md", "CHANGELOG.md", "SECURITY.md", "CONTRIBUTING.md"] if (ROOT / name).is_file()]
    with zipfile.ZipFile(source, "w", zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(set(files)):
            # Local editor paths and EULA settings belong to their owner only.
            if ".vscode" in file.relative_to(ROOT).parts or "__pycache__" in file.parts:
                continue
            archive.write(file, "sktestlab-source/" + file.relative_to(ROOT).as_posix())

    example = output / "reward-lab.zip"
    with zipfile.ZipFile(example, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in ["reward.sk", "offline.sktest.json", "runtime.sktest.json", "README.md"]:
            archive.write(ROOT / "examples/reward-lab" / name, "reward-lab/" + name)
        archive.write(ROOT / "LICENSE.txt", "reward-lab/LICENSE.txt")

    contents = {vsix.name: vsix.read_bytes(), source.name: source.read_bytes(), example.name: example.read_bytes()}
    for target, origin in [("LICENSE.txt", "LICENSE.txt"), ("INSTALL.md", "docs/install.md"), ("SKUNITY-LISTING.md", "docs/skunity-listing.md"), ("RELEASE-CHECKLIST.md", "docs/release-1.0.md"), ("TESTING-GUIDE.md", "docs/testing-guide.md"), ("SKUNITY-DESCRIPTION.bbcode", "docs/skunity-description.bbcode")]:
        contents[target] = (ROOT / origin).read_bytes()
    checksums = "".join(hashlib.sha256(data).hexdigest() + "  " + name + "\n" for name, data in sorted(contents.items()))
    contents["SHA256SUMS.txt"] = checksums.encode()
    target = output / f"sktestlab-{version}-download.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(contents.items()):
            archive.writestr(name, data)
    # Read back the delivered archive, not just staging files.
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise ValueError("Delivered ZIP is corrupt")
        for line in archive.read("SHA256SUMS.txt").decode().splitlines():
            digest, name = line.split("  ", 1)
            if hashlib.sha256(archive.read(name)).hexdigest() != digest:
                raise ValueError("Delivered checksum mismatch: " + name)
    (output / "SHA256SUMS.txt").write_text(checksums + hashlib.sha256(target.read_bytes()).hexdigest() + "  " + target.name + "\n", encoding="utf-8")
    kit = output / f"sktestlab-{version}-skunity-kit.zip"
    kit_contents = {target.name: target.read_bytes()}
    for name, origin in [("PUBLISH.md", "docs/skunity-upload.md"), ("SKUNITY-LISTING.md", "docs/skunity-listing.md"), ("SKUNITY-DESCRIPTION.bbcode", "docs/skunity-description.bbcode"), ("icon.png", "assets/icon.png"), ("dashboard-dark.png", "docs/images/dashboard-dark.png"), ("dashboard-white.png", "docs/images/dashboard-white.png")]:
        kit_contents[name] = (ROOT / origin).read_bytes()
    kit_checksums = "".join(hashlib.sha256(data).hexdigest() + "  " + name + "\n" for name, data in sorted(kit_contents.items()))
    kit_contents["SHA256SUMS.txt"] = kit_checksums.encode()
    with zipfile.ZipFile(kit, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(kit_contents.items()):
            archive.writestr(name, data)
    with zipfile.ZipFile(kit) as archive:
        if archive.testzip() is not None:
            raise ValueError("Publishing kit ZIP is corrupt")
        for line in kit_checksums.splitlines():
            digest, name = line.split("  ", 1)
            if hashlib.sha256(archive.read(name)).hexdigest() != digest:
                raise ValueError("Publishing kit checksum mismatch: " + name)
    with (output / "SHA256SUMS.txt").open("a", encoding="utf-8") as manifest:
        manifest.write(hashlib.sha256(kit.read_bytes()).hexdigest() + "  " + kit.name + "\n")
    print(f"Prepared and verified {target}")
    print(f"Publishing kit: {kit}")
    print("Local bundle only. Publication and skUnity submission are separate actions; verify final release evidence first.")


if __name__ == "__main__":
    main()
