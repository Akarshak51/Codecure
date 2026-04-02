from __future__ import annotations

"""Summarize feature importance for the trained Tox21 model bundle."""

import argparse
import json
import pickle
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.model import Tox21ModelBundle


def load_bundle(model_path: Path) -> Tox21ModelBundle:
    with open(model_path, "rb") as handle:
        bundle = pickle.load(handle)
    if not isinstance(bundle, Tox21ModelBundle):
        raise TypeError(f"Unexpected model artifact type: {type(bundle).__name__}")
    return bundle


def to_frame(items: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(items)


def plot_global_importance(global_df: pd.DataFrame, output_dir: Path) -> None:
    if global_df.empty:
        return
    fig, ax = plt.subplots(figsize=(12, 7))
    ax.barh(global_df["feature"][::-1], global_df["importance"][::-1], color="#0d9488")
    ax.set_title("Average Feature Importance Across Tox21 Assays")
    ax.set_xlabel("Mean importance")
    plt.tight_layout()
    plt.savefig(output_dir / "feature_importance_global.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def plot_per_assay(per_assay_df: pd.DataFrame, output_dir: Path) -> None:
    if per_assay_df.empty:
        return
    pivot = per_assay_df.pivot(index="feature", columns="assay", values="importance").fillna(0.0)
    top_features = pivot.mean(axis=1).sort_values(ascending=False).head(15).index
    trimmed = pivot.loc[top_features]

    fig, ax = plt.subplots(figsize=(12, 8))
    image = ax.imshow(trimmed.values, aspect="auto", cmap="viridis")
    ax.set_xticks(range(len(trimmed.columns)))
    ax.set_xticklabels(trimmed.columns, rotation=45, ha="right")
    ax.set_yticks(range(len(trimmed.index)))
    ax.set_yticklabels(trimmed.index)
    ax.set_title("Top Tox21 Features Across Assays")
    fig.colorbar(image, ax=ax, label="Importance")
    plt.tight_layout()
    plt.savefig(output_dir / "feature_importance_heatmap.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarize Tox21 feature importance")
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("models/random_forest.pkl"),
        help="Path to the trained Tox21 model bundle",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("reports"),
        help="Directory where reports and plots should be written",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=20,
        help="How many top features to keep in the summaries",
    )
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    bundle = load_bundle(args.model)

    global_df = to_frame(bundle.get_global_feature_importance(top_n=args.top_n))
    if not global_df.empty:
        global_df.to_csv(args.output / "feature_importance_global.csv", index=False)

    per_assay_rows = []
    for assay in bundle.assay_names:
        for item in bundle.get_top_features(assay, top_n=args.top_n):
            per_assay_rows.append({"assay": assay, **item})
    per_assay_df = pd.DataFrame(per_assay_rows)
    if not per_assay_df.empty:
        per_assay_df.to_csv(args.output / "feature_importance_per_assay.csv", index=False)

    plot_global_importance(global_df, args.output)
    plot_per_assay(per_assay_df, args.output)

    report = {
        "model_summary": bundle.training_summary,
        "global_top_features": global_df.to_dict(orient="records"),
        "per_assay_top_features": {
            assay: per_assay_df.loc[per_assay_df["assay"] == assay, ["feature", "importance"]].to_dict(orient="records")
            for assay in bundle.assay_names
        },
    }
    with open(args.output / "feature_importance_report.json", "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print("Feature importance summary complete.")
    print(f"Global summary saved to {args.output / 'feature_importance_global.csv'}")
    print(f"Per-assay summary saved to {args.output / 'feature_importance_per_assay.csv'}")


if __name__ == "__main__":
    main()
