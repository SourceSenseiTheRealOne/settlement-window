from __future__ import annotations

import importlib.util
import tempfile
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("verify-pages-workflow.py")
spec = importlib.util.spec_from_file_location("pages_policy", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("Could not load Pages policy module.")
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)

baseline = Path(".github/workflows/pages.yml").read_text(encoding="utf-8")
mutations = {
    "pull_request_target": baseline.replace("workflow_dispatch:", "pull_request_target:\n  workflow_dispatch:"),
    "secret expression": baseline + "\nenv:\n  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n",
    "mutable action": baseline.replace(
        "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
        "actions/checkout@v4",
    ),
    "duplicate action": baseline + "\n# injected\n# uses: actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
    "dotenv access": baseline.replace(
        "- name: Configure GitHub Pages",
        "- name: Read dotenv\n        run: cat .env\n\n      - name: Configure GitHub Pages",
    ),
}

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    baseline_path = root / "baseline.yml"
    baseline_path.write_text(baseline, encoding="utf-8")
    policy.WORKFLOW = baseline_path
    policy.main()

    for name, content in mutations.items():
        fixture = root / f"{name.replace(' ', '-')}.yml"
        fixture.write_text(content, encoding="utf-8")
        policy.WORKFLOW = fixture
        try:
            policy.main()
        except AssertionError:
            continue
        raise AssertionError(f"Policy accepted unsafe fixture: {name}")

print("Pages workflow adversarial policy tests: PASS")
