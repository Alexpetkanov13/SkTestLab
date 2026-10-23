"""Verify and extract a local release into a newly created test directory."""
import hashlib
import io
from pathlib import Path
import sys
import zipfile

bundle = Path(sys.argv[1]).resolve()
target = Path(sys.argv[2]).resolve()
target.mkdir(parents=True, exist_ok=False)


def extract(archive, destination):
    destination.mkdir(parents=True, exist_ok=True)
    for item in archive.infolist():
        path = (destination / item.filename).resolve()
        if not path.is_relative_to(destination.resolve()):
            raise ValueError("Archive path escapes destination")
        if item.is_dir():
            path.mkdir(parents=True, exist_ok=True)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(archive.read(item))


with zipfile.ZipFile(bundle) as archive:
    for line in archive.read("SHA256SUMS.txt").decode().splitlines():
        digest, name = line.split("  ", 1)
        if hashlib.sha256(archive.read(name)).hexdigest() != digest:
            raise ValueError("Checksum mismatch: " + name)
    extract(archive, target)
    with zipfile.ZipFile(io.BytesIO(archive.read("reward-lab.zip"))) as example:
        if any(".vscode" in Path(name).parts for name in example.namelist()):
            raise ValueError("Portable example contains local editor settings")
        extract(example, target)
    if "--source" in sys.argv[3:]:
        sources = [name for name in archive.namelist() if name.endswith("-source.zip")]
        if len(sources) != 1:
            raise ValueError("Expected exactly one source archive")
        with zipfile.ZipFile(io.BytesIO(archive.read(sources[0]))) as source:
            extract(source, target)
print(target)
