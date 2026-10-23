import hashlib
import io
import tempfile
import unittest
from pathlib import Path
import zipfile
import importlib.util
import json
spec = importlib.util.spec_from_file_location("release_audit", Path(__file__).with_name("audit-release.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
audit = module.audit


class AuditTests(unittest.TestCase):
    def bundle(self, files, corrupt_hash=False):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        file = Path(directory.name) / "candidate.zip"
        with zipfile.ZipFile(file, "w") as archive:
            for name, data in files.items():
                archive.writestr(name, data)
            checksums = "".join(("0" * 64 if corrupt_hash else hashlib.sha256(data).hexdigest()) + "  " + name + "\n" for name, data in files.items())
            archive.writestr("SHA256SUMS.txt", checksums)
        return file

    def test_clean_bundle(self):
        self.assertTrue(audit(self.bundle({"README.md": b"MIT source release"}))["passed"])

    def test_hash_mismatch(self):
        result = audit(self.bundle({"README.md": b"content"}, True))
        self.assertIn("checksum_mismatch", [f["kind"] for f in result["findings"]])

    def test_valid_lockfile(self):
        lock = {"version": "1.0.0", "packages": {"": {"version": "1.0.0"}, "node_modules/example": {"version": "0.4.1", "resolved": "https://registry.npmjs.org/example/-/example-0.4.1.tgz"}}}
        self.assertTrue(audit(self.bundle({"package-lock.json": json.dumps(lock).encode()}))["passed"])

    def test_dependency_version_bump_in_lockfile(self):
        lock = {"version": "1.0.0", "packages": {"": {"version": "1.0.0"}, "node_modules/example": {"version": "1.0.0", "resolved": "https://registry.npmjs.org/example/-/example-0.4.1.tgz"}}}
        result = audit(self.bundle({"package-lock.json": json.dumps(lock).encode()}))
        self.assertIn("inconsistent_lockfile_versions", [f["kind"] for f in result["findings"]])

    def test_root_version_mismatch_in_lockfile(self):
        self.assertFalse(module.lockfile_valid(b'{"version":"1.0.0","packages":{"":{"version":"0.5.0"}}}'))

    def test_token_report_does_not_repeat_token(self):
        token = b"ghp_" + b"a" * 40
        result = audit(self.bundle({"config.txt": token}))
        self.assertFalse(result["passed"])
        self.assertNotIn(token.decode(), str(result))

    def test_nested_private_artifact(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as source:
            source.writestr("source/.vscode/settings.json", "{}")
        result = audit(self.bundle({"source.zip": data.getvalue()}))
        self.assertIn("local_build_or_editor_data", [f["kind"] for f in result["findings"]])

    def test_windows_profile_path(self):
        data = ("C:" + chr(92) + "Users" + chr(92) + "example" + chr(92) + "file").encode()
        result = audit(self.bundle({"settings.json": data}))
        self.assertIn("personal_windows_path", [f["kind"] for f in result["findings"]])

    def test_server_jar_and_escape(self):
        result = audit(self.bundle({"server.jar": b"fixture", "../outside.txt": b"fixture"}))
        kinds = {f["kind"] for f in result["findings"]}
        self.assertTrue({"unsafe_archive_path", "private_or_server_artifact"}.issubset(kinds))


if __name__ == "__main__":
    unittest.main()
