from __future__ import annotations

import argparse
import subprocess

STRATEGY_PREFIXES = (
    "platforms/ninjatrader/Strategies/",
    "platforms/ninjatrader/strategies/",
    "platforms/tradingview/strategies/",
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reject standalone strategy additions in a safety cycle."
    )
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", default="HEAD")
    args = parser.parse_args()
    completed = subprocess.run(
        ["git", "diff", "--diff-filter=A", "--name-only", args.base, args.head],
        capture_output=True,
        text=True,
        check=True,
    )
    additions = [
        path
        for path in completed.stdout.splitlines()
        if path.replace("\\", "/").startswith(STRATEGY_PREFIXES)
    ]
    if additions:
        print("Standalone strategies are frozen during the qualification cycle:")
        print("\n".join(additions))
        return 1
    print("No standalone strategies were added in this qualification cycle.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
