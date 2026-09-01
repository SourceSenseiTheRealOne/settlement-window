from __future__ import annotations

import re
import sys
from pathlib import Path

WORKFLOW = Path(".github/workflows/pages.yml")
EXPECTED_ACTIONS = [
    "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
    "actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b",
    "actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa",
    "actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e",
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    require(WORKFLOW.exists(), f"Missing workflow: {WORKFLOW}")
    text = WORKFLOW.read_text(encoding="utf-8")
    require("pull_request_target" not in text, "pull_request_target is forbidden")
    require(not re.search(r"secrets(?:\.|\[)", text, re.IGNORECASE), "secret expressions are forbidden")
    lowered = text.lower()
    forbidden_inputs = (".env", "dotenv", "github.token", "gh_token", "github_token")
    require(
        not any(value in lowered for value in forbidden_inputs),
        "dotenv or explicit token injection is forbidden",
    )
    require("contents: read" in text, "workflow must declare contents: read")
    require("pages: write" in text, "deployment job must declare pages: write")
    require("id-token: write" in text, "deployment job must declare id-token: write")
    require("persist-credentials: false" in text, "checkout credentials must not persist")
    require("development" in text and "workflow_dispatch" in text, "workflow trigger scope is incomplete")
    require("path: showcase" in text, "only the static showcase may be uploaded")
    discovered = re.findall(r"uses:\s*([^\s#]+)", text)
    require(discovered == EXPECTED_ACTIONS, f"unexpected action references: {discovered}")
    for action in discovered:
        ref = action.rsplit("@", 1)[1]
        require(bool(re.fullmatch(r"[0-9a-f]{40}", ref)), f"mutable action reference: {action}")
    print("Pages workflow policy: PASS")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as error:
        print(f"Pages workflow policy: FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
