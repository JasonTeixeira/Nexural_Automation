"""Nexural Research - NinjaTrader trade export research tools."""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version

__all__ = ["__version__"]

try:
    __version__ = version("nexural-research")
except PackageNotFoundError:  # Source-tree execution before installation.
    __version__ = "2.0.0"
