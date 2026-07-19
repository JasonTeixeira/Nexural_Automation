from __future__ import annotations

import gzip
import importlib.util
import io
import sys
import tarfile
from pathlib import Path
from types import ModuleType

REPO_ROOT = Path(__file__).resolve().parents[5]
MODULE_PATH = REPO_ROOT / "scripts" / "repo-tools" / "normalize_sdist.py"


def load_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("normalize_sdist", MODULE_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def make_sdist(path: Path, timestamp: int) -> None:
    with path.open("wb") as raw:
        with gzip.GzipFile(
            filename="source.tar", fileobj=raw, mode="wb", mtime=timestamp
        ) as zipped:
            with tarfile.open(fileobj=zipped, mode="w") as archive:
                directory = tarfile.TarInfo("package-1.0")
                directory.type = tarfile.DIRTYPE
                directory.mtime = timestamp
                archive.addfile(directory)
                content = b"deterministic payload\n"
                item = tarfile.TarInfo("package-1.0/module.py")
                item.size = len(content)
                item.mtime = timestamp
                archive.addfile(item, io.BytesIO(content))


def test_normalizer_makes_distinct_build_times_byte_identical(tmp_path: Path) -> None:
    module = load_module()
    first = tmp_path / "first.tar.gz"
    second = tmp_path / "second.tar.gz"
    make_sdist(first, 100)
    make_sdist(second, 200)

    module.normalize_sdist(first, 42)
    module.normalize_sdist(second, 42)

    assert first.read_bytes() == second.read_bytes()
    with tarfile.open(first, "r:gz") as archive:
        assert {member.mtime for member in archive.getmembers()} == {42}
