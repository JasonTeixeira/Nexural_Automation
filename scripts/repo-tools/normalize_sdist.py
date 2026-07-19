from __future__ import annotations

import argparse
import copy
import gzip
import io
import os
import tarfile
import tempfile
from pathlib import Path


def normalize_sdist(path: Path, epoch: int) -> None:
    """Rewrite a source tarball with deterministic ordering and metadata."""
    if epoch < 0:
        raise ValueError("SOURCE_DATE_EPOCH must be non-negative")
    with tarfile.open(path, "r:gz") as source:
        members = sorted(source.getmembers(), key=lambda item: item.name)
        payloads = {
            member.name: source.extractfile(member).read()
            for member in members
            if member.isfile()
        }

    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(file_descriptor, "wb") as raw:
            with gzip.GzipFile(
                filename="", mode="wb", fileobj=raw, mtime=epoch
            ) as zipped:
                with tarfile.open(
                    fileobj=zipped, mode="w", format=tarfile.PAX_FORMAT
                ) as target:
                    for member in members:
                        normalized = copy.copy(member)
                        normalized.mtime = epoch
                        normalized.uid = 0
                        normalized.gid = 0
                        normalized.uname = ""
                        normalized.gname = ""
                        normalized.pax_headers = {}
                        if normalized.isfile():
                            target.addfile(
                                normalized, io.BytesIO(payloads[member.name])
                            )
                        else:
                            target.addfile(normalized)
        Path(temporary_name).replace(path)
    except BaseException:
        Path(temporary_name).unlink(missing_ok=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Normalize a Python .tar.gz source distribution reproducibly."
    )
    parser.add_argument("path", type=Path)
    parser.add_argument(
        "--epoch",
        type=int,
        default=int(os.environ.get("SOURCE_DATE_EPOCH", "0")),
    )
    args = parser.parse_args()
    normalize_sdist(args.path, args.epoch)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
