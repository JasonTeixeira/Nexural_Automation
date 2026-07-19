"""Allowlisted plugin discovery and registry for Academy extension points."""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from importlib import metadata
from typing import Any, Callable

PLUGIN_KINDS = frozenset({"lessons", "importers", "gates", "bridges", "reports"})


@dataclass(frozen=True)
class Plugin:
    kind: str
    name: str
    factory: Callable[..., Any]
    version: str
    metadata: dict[str, Any]


@dataclass(frozen=True)
class PluginDiscoveryReport:
    """Serializable result of an explicit, fail-closed discovery pass."""

    loaded: tuple[str, ...]
    rejected: tuple[str, ...]
    errors: tuple[str, ...]

    def to_dict(self) -> dict[str, list[str]]:
        return {
            "loaded": list(self.loaded),
            "rejected": list(self.rejected),
            "errors": list(self.errors),
        }


class PluginRegistry:
    def __init__(self) -> None:
        self._plugins: dict[tuple[str, str], Plugin] = {}

    def register(
        self,
        kind: str,
        name: str,
        factory: Callable[..., Any],
        *,
        version: str = "0.1.0",
        metadata: dict[str, Any] | None = None,
    ) -> Plugin:
        if kind not in PLUGIN_KINDS:
            raise ValueError(f"Unsupported plugin kind: {kind}")
        key = (kind, name)
        if key in self._plugins:
            raise ValueError(f"Plugin already registered: {kind}/{name}")
        plugin = Plugin(kind, name, factory, version, metadata or {})
        self._plugins[key] = plugin
        return plugin

    def get(self, kind: str, name: str) -> Plugin:
        try:
            return self._plugins[(kind, name)]
        except KeyError as exc:
            raise KeyError(f"Unknown plugin: {kind}/{name}") from exc

    def list(self, kind: str | None = None) -> tuple[Plugin, ...]:
        if kind is not None and kind not in PLUGIN_KINDS:
            raise ValueError(f"Unsupported plugin kind: {kind}")
        return tuple(
            plugin
            for key, plugin in sorted(self._plugins.items())
            if kind is None or key[0] == kind
        )

    def discover(
        self,
        allowed_distributions: Iterable[str],
        *,
        group: str = "nexural.academy",
    ) -> PluginDiscoveryReport:
        """Load entry points only from explicitly allowlisted installed distributions.

        Entry-point names must use ``<kind>.<name>``. Importing an entry point executes package
        import code, so callers must opt in with an exact distribution allowlist. The hosted API
        deliberately does not call this method.
        """

        allowed = {_normalise_distribution(name) for name in allowed_distributions if name}
        loaded: list[str] = []
        rejected: list[str] = []
        errors: list[str] = []

        for entry_point in metadata.entry_points(group=group):
            distribution = getattr(entry_point, "dist", None)
            distribution_name = (
                distribution.metadata.get("Name", "") if distribution is not None else ""
            )
            identity = f"{distribution_name or 'unknown'}:{entry_point.name}"
            if _normalise_distribution(distribution_name) not in allowed:
                rejected.append(identity)
                continue

            try:
                kind, name = entry_point.name.split(".", 1)
                if kind not in PLUGIN_KINDS or not name:
                    raise ValueError("entry-point name must be <supported-kind>.<name>")
                factory = entry_point.load()
                if not callable(factory):
                    raise TypeError("entry point must resolve to a callable factory")
                version = distribution.version if distribution is not None else "unknown"
                self.register(
                    kind,
                    name,
                    factory,
                    version=version,
                    metadata={"distribution": distribution_name, "entry_point": entry_point.value},
                )
                loaded.append(identity)
            except (AttributeError, ImportError, TypeError, ValueError) as exc:
                errors.append(f"{identity}: {exc}")

        return PluginDiscoveryReport(
            tuple(sorted(loaded)),
            tuple(sorted(rejected)),
            tuple(sorted(errors)),
        )


def _normalise_distribution(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()
