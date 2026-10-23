"""Check publication boundaries without printing matched secrets or private paths."""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import zipfile

PATTERNS = {
    "github_token": re.compile(rb"gh[pousr]_[A-Za-z0-9]{30,}"),
    "github_pat": re.compile(rb"github_pat_[A-Za-z0-9_]{40,}"),
    "slack_token": re.compile(rb"xox[baprs]-[A-Za-z0-9-]{25,}"),
    "private_key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "personal_windows_path": re.compile(rb"[A-Za-z]:[/\\]+Users[/\\]+(?!Public(?:[/\\]|\b))[A-Za-z0-9_. -]+[/\\]+", re.I),
}
BLOCKED = {".git", ".vscode", ".vscode-test", "node_modules", "coverage", "__pycache__"}


def lockfile_valid(content):
    """Registry tarball versions must agree with their locked metadata."""
    try:
        lock = json.loads(content)
        packages = lock["packages"]
        if lock["version"] != packages[""]["version"]:
            return False
        for package in packages.values():
            resolved = package.get("resolved", "")
            match = re.search(r"/-/[^/]+-(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)\.tgz$", resolved)
            if resolved.startswith("https://registry.npmjs.org/") and match and package.get("version") != match[1]:
                return False
        return True
    except (KeyError, TypeError, ValueError, AttributeError):
        return False


def audit(bundle):
    findings = []
    count = 0

    def scan(data, label, depth=0):
        nonlocal count
        if depth > 3:
            findings.append({"file": label, "kind": "excessive_archive_nesting"})
            return
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if archive.testzip() is not None:
                findings.append({"file": label, "kind": "corrupt_archive"})
            for entry in archive.infolist():
                if entry.is_dir():
                    continue
                count += 1
                name = entry.filename.replace("\\", "/")
                full = label + "!" + name
                parts = PurePosixPath(name).parts
                if name.startswith("/") or ".." in parts or re.match(r"^[A-Za-z]:", name):
                    findings.append({"file": full, "kind": "unsafe_archive_path"})
                if any(part in BLOCKED for part in parts):
                    findings.append({"file": full, "kind": "local_build_or_editor_data"})
                if re.search(r"(?:^|/)(?:\.env(?:\.[^/]*)?|id_rsa|id_ed25519)$", name, re.I) or name.lower().endswith((".pem", ".pfx", ".p12", ".jar")):
                    findings.append({"file": full, "kind": "private_or_server_artifact"})
                content = archive.read(entry)
                if parts[-1] == "package-lock.json" and not lockfile_valid(content):
                    findings.append({"file": full, "kind": "inconsistent_lockfile_versions"})
                if name.endswith((".zip", ".vsix")):
                    scan(content, full, depth + 1)
                else:
                    for kind, pattern in PATTERNS.items():
                        if pattern.search(content):
                            findings.append({"file": full, "kind": kind})

    data = bundle.read_bytes()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for line in archive.read("SHA256SUMS.txt").decode().splitlines():
            expected, name = line.split("  ", 1)
            if hashlib.sha256(archive.read(name)).hexdigest() != expected:
                findings.append({"file": name, "kind": "checksum_mismatch"})
    scan(data, bundle.name)
    return {"bundle": bundle.name, "sha256": hashlib.sha256(data).hexdigest(), "entriesChecked": count, "findings": findings, "passed": not findings}


if __name__ == "__main__":
    result = audit(Path(sys.argv[1]).resolve())
    output = json.dumps(result, indent=2)
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(output + "\n", encoding="utf-8")
    print(output)
    sys.exit(0 if result["passed"] else 1)
