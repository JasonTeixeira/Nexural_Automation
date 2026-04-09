from __future__ import annotations

import logging
import os
import sys

from rich.console import Console
from rich.logging import RichHandler


def setup_logging(level: str | None = None) -> None:
    """Configure structured logging for the application."""
    log_level = (level or os.environ.get("NEXURAL_LOG_LEVEL", "INFO")).upper()

    # Rich handler for terminal (development)
    rich_handler = RichHandler(
        console=Console(stderr=True),
        show_time=True,
        show_path=False,
        markup=True,
    )
    rich_handler.setLevel(log_level)

    # Standard handler for production (JSON-like structured output)
    stream_handler = logging.StreamHandler(sys.stderr)
    stream_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    )

    # Use rich in TTY, plain in non-TTY (Docker, CI)
    handler = rich_handler if sys.stderr.isatty() else stream_handler

    logging.basicConfig(
        level=log_level,
        handlers=[handler],
        force=True,
    )


# Initialize on import
setup_logging()

# Module-level logger for quick access (backward compat)
_logger = logging.getLogger("nexural_research")

console = Console()


def info(msg: str) -> None:
    _logger.info(msg)


def warn(msg: str) -> None:
    _logger.warning(msg)


def error(msg: str) -> None:
    _logger.error(msg)
