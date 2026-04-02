from __future__ import annotations

"""Run Tox21 predictions from compound IDs or feature tables."""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.model import Tox21Predictor


def flatten_prediction(prediction: dict) -> dict:
    row = {
        "compound_id": prediction.get("compound_id"),
        "split": prediction.get("split"),
        "highest_risk_assay": prediction["summary"].get("highest_risk_assay"),
        "predicted_active_count": prediction["summary"].get("predicted_active_count"),
        "mean_active_probability": prediction["summary"].get("mean_active_probability"),
    }
    for assay_prediction in prediction["predictions"]:
        assay_key = assay_prediction["assay"].replace(".", "_")
        row[f"{assay_key}_predicted_active"] = int(assay_prediction["predicted_active"])
        row[f"{assay_key}_probability_active"] = assay_prediction["probability_active"]
        row[f"{assay_key}_known_label"] = assay_prediction["known_label"]
    return row


def print_prediction(prediction: dict, top_assays: int) -> None:
    print("=" * 72)
    print(f"Compound ID: {prediction.get('compound_id')}")
    print(f"Split:       {prediction.get('split')}")
    print(f"Top assay:   {prediction['summary'].get('highest_risk_assay')}")
    print(f"Active calls: {prediction['summary'].get('predicted_active_count')} / {len(prediction['predictions'])}")
    print(f"Mean active probability: {prediction['summary'].get('mean_active_probability'):.4f}")
    print("\nHighest-risk assays:")
    for assay_prediction in prediction["predictions"][:top_assays]:
        known_label = assay_prediction["known_label"]
        known_label_text = "NA" if known_label is None else str(known_label)
        print(
            f"  {assay_prediction['assay']:15s} "
            f"p(active)={assay_prediction['probability_active']:.4f} "
            f"predicted_active={int(assay_prediction['predicted_active'])} "
            f"known_label={known_label_text}"
        )
    print("=" * 72)


def predict_from_table(
    predictor: Tox21Predictor,
    table: pd.DataFrame,
    default_split: str,
    top_assays: int,
) -> list[dict]:
    normalized_columns = {column.lower().strip(): column for column in table.columns}
    if "compound_id" in normalized_columns:
        compound_column = normalized_columns["compound_id"]
        split_column = normalized_columns.get("split")
        results = []
        for _, row in table.iterrows():
            compound_id = str(row[compound_column]).strip()
            row_split = default_split if split_column is None else str(row[split_column]).strip() or default_split
            results.append(
                predictor.predict_by_compound_id(compound_id, split=row_split, top_assays=top_assays)
            )
        return results

    missing = [feature for feature in predictor.feature_names if feature not in table.columns]
    if missing:
        preview = ", ".join(missing[:10])
        suffix = "..." if len(missing) > 10 else ""
        raise ValueError(
            "Input CSV must contain either a 'compound_id' column or the full processed feature set. "
            f"Missing features: {preview}{suffix}"
        )

    results = []
    for row_index, (_, row) in enumerate(table.iterrows(), start=1):
        feature_map = {feature: float(row[feature]) for feature in predictor.feature_names}
        results.append(
            predictor.predict_by_features(
                feature_map,
                compound_id=f"row_{row_index}",
                top_assays=top_assays,
            )
        )
    return results


def save_results(predictions: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() == ".json":
        with open(output_path, "w", encoding="utf-8") as handle:
            json.dump(predictions, handle, indent=2)
        print(f"Saved JSON results to {output_path}")
        return

    flat_rows = [flatten_prediction(prediction) for prediction in predictions]
    pd.DataFrame(flat_rows).to_csv(output_path, index=False)
    print(f"Saved CSV results to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict Tox21 assay activity")
    parser.add_argument(
        "--model-path",
        type=Path,
        default=Path("models/random_forest.pkl"),
        help="Path to the trained Tox21 model bundle",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data/processed/tox21"),
        help="Directory containing processed Tox21 arrays",
    )
    parser.add_argument(
        "--compound-id",
        type=str,
        help="Predict an existing Tox21 compound by ID",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="auto",
        choices=["auto", "train", "test"],
        help="Which processed split to search when using compound IDs",
    )
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        help="CSV file containing either a compound_id column or the full processed feature table",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Optional path where flattened predictions should be written",
    )
    parser.add_argument(
        "--top-assays",
        type=int,
        default=5,
        help="How many of the highest-risk assays to print in the terminal summary",
    )
    parser.add_argument(
        "--list-examples",
        action="store_true",
        help="Print a few example compound IDs from the processed test split",
    )
    args = parser.parse_args()

    predictor = Tox21Predictor(model_path=args.model_path, data_dir=args.data_dir)
    if not predictor.is_ready:
        raise RuntimeError(
            "The Tox21 predictor is not ready. Run preprocess.py and train.py first."
        )

    if args.list_examples:
        print("Example compound IDs:")
        for compound_id in predictor.get_available_examples(count=10):
            print(f"  {compound_id}")
        return

    predictions: list[dict]
    if args.input:
        input_table = pd.read_csv(args.input)
        predictions = predict_from_table(
            predictor,
            input_table,
            default_split=args.split,
            top_assays=args.top_assays,
        )
    elif args.compound_id:
        predictions = [
            predictor.predict_by_compound_id(
                args.compound_id,
                split=args.split,
                top_assays=args.top_assays,
            )
        ]
    else:
        examples = predictor.get_available_examples(count=1)
        if not examples:
            raise RuntimeError("No example compounds are available in the processed dataset")
        predictions = [
            predictor.predict_by_compound_id(
                examples[0],
                split="test",
                top_assays=args.top_assays,
            )
        ]

    for prediction in predictions:
        print_prediction(prediction, top_assays=args.top_assays)

    if args.output:
        save_results(predictions, args.output)


if __name__ == "__main__":
    main()
