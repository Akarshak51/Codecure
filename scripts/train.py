from __future__ import annotations

"""Train per-assay Random Forest models on the processed Tox21 dataset."""

import argparse
import json
import pickle
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.model import Tox21ModelBundle


DEFAULT_SCORING = {
    "roc_auc": "roc_auc",
    "balanced_accuracy": "balanced_accuracy",
    "f1": "f1",
}


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def load_processed_data(data_dir: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, list[str], list[str]]:
    print(f"Loading processed data from {data_dir}...")
    X_train = np.load(data_dir / "X_train.npy")
    X_test = np.load(data_dir / "X_test.npy")
    y_train = np.load(data_dir / "y_train.npy")
    y_test = np.load(data_dir / "y_test.npy")
    feature_names = load_json(data_dir / "feature_names.json")
    assay_names = load_json(data_dir / "assay_names.json")
    print(f"Training matrix shape: {X_train.shape}")
    print(f"Test matrix shape:     {X_test.shape}")
    return X_train, X_test, y_train, y_test, feature_names, assay_names


def create_model(n_estimators: int, max_depth: int | None, random_state: int) -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        n_jobs=-1,
        random_state=random_state,
    )


def build_assay_estimator(
    y_values: np.ndarray,
    n_estimators: int,
    max_depth: int | None,
    random_state: int,
):
    classes = np.unique(y_values)
    if len(classes) < 2:
        constant_value = int(classes[0]) if len(classes) else 0
        return DummyClassifier(strategy="constant", constant=constant_value)
    return create_model(n_estimators=n_estimators, max_depth=max_depth, random_state=random_state)


def evaluate_assay(model, X_test: np.ndarray, y_test: np.ndarray) -> dict[str, float | int | None]:
    y_pred = model.predict(X_test)
    probability_matrix = np.asarray(model.predict_proba(X_test))
    classes = list(getattr(model, "classes_", []))

    if len(classes) == 1:
        active_probability = np.full(X_test.shape[0], float(classes[0] == 1), dtype=float)
    else:
        active_index = classes.index(1) if 1 in classes else min(1, probability_matrix.shape[1] - 1)
        active_probability = probability_matrix[:, active_index]

    metrics = {
        "samples": int(len(y_test)),
        "positive_rate": round(float(np.mean(y_test)), 6),
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 6),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_test, y_pred)), 6),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 6),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 6),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 6),
        "roc_auc": None,
    }
    if len(np.unique(y_test)) > 1:
        metrics["roc_auc"] = round(float(roc_auc_score(y_test, active_probability)), 6)
    return metrics


def cross_validate_assay(model, X_values: np.ndarray, y_values: np.ndarray, requested_folds: int) -> dict[str, float | int | None]:
    class_counts = np.bincount(y_values.astype(int))
    if len(class_counts) < 2 or class_counts.min() < 2:
        return {
            "cv_folds": 0,
            "cv_roc_auc": None,
            "cv_balanced_accuracy": None,
            "cv_f1": None,
        }

    n_splits = min(requested_folds, int(class_counts.min()))
    if n_splits < 2:
        return {
            "cv_folds": 0,
            "cv_roc_auc": None,
            "cv_balanced_accuracy": None,
            "cv_f1": None,
        }

    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    scores = cross_validate(
        model,
        X_values,
        y_values,
        cv=cv,
        scoring=DEFAULT_SCORING,
        n_jobs=1,
    )
    return {
        "cv_folds": int(n_splits),
        "cv_roc_auc": round(float(np.mean(scores["test_roc_auc"])), 6),
        "cv_balanced_accuracy": round(float(np.mean(scores["test_balanced_accuracy"])), 6),
        "cv_f1": round(float(np.mean(scores["test_f1"])), 6),
    }


def train_models(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    assay_names: list[str],
    n_estimators: int,
    max_depth: int | None,
    cv_folds: int,
) -> tuple[dict[str, object], dict[str, dict[str, float | int | None]]]:
    models: dict[str, object] = {}
    metrics: dict[str, dict[str, float | int | None]] = {}

    for assay_index, assay_name in enumerate(assay_names):
        print(f"\nTraining assay {assay_index + 1}/{len(assay_names)}: {assay_name}")
        train_mask = np.isfinite(y_train[:, assay_index])
        test_mask = np.isfinite(y_test[:, assay_index])
        assay_X_train = X_train[train_mask]
        assay_y_train = y_train[train_mask, assay_index].astype(int)
        assay_X_test = X_test[test_mask]
        assay_y_test = y_test[test_mask, assay_index].astype(int)

        estimator = build_assay_estimator(
            assay_y_train,
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42 + assay_index,
        )
        cv_metrics = cross_validate_assay(estimator, assay_X_train, assay_y_train, requested_folds=cv_folds)
        estimator.fit(assay_X_train, assay_y_train)
        test_metrics = evaluate_assay(estimator, assay_X_test, assay_y_test)

        models[assay_name] = estimator
        metrics[assay_name] = {
            **cv_metrics,
            **test_metrics,
            "train_samples": int(assay_X_train.shape[0]),
            "test_samples": int(assay_X_test.shape[0]),
            "train_positive_rate": round(float(np.mean(assay_y_train)), 6),
        }
        print(json.dumps(metrics[assay_name], indent=2))

    return models, metrics


def save_metrics(metrics: dict[str, dict[str, float | int | None]], output_dir: Path) -> pd.DataFrame:
    metrics_df = pd.DataFrame.from_dict(metrics, orient="index").reset_index(names="assay")
    metrics_df.to_csv(output_dir / "training_metrics.csv", index=False)
    with open(output_dir / "training_metrics.json", "w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
    return metrics_df


def plot_metrics(metrics_df: pd.DataFrame, output_dir: Path) -> None:
    plot_df = metrics_df.copy()
    plot_df["roc_auc"] = plot_df["roc_auc"].fillna(0.0)
    plot_df = plot_df.sort_values("roc_auc", ascending=False)

    fig, ax = plt.subplots(figsize=(12, 6))
    ax.bar(plot_df["assay"], plot_df["roc_auc"], color="#0d9488")
    ax.set_title("Tox21 ROC AUC by Assay")
    ax.set_ylabel("ROC AUC")
    ax.set_ylim(0, 1)
    ax.tick_params(axis="x", rotation=45)
    plt.tight_layout()
    plt.savefig(output_dir / "assay_roc_auc.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def save_model_bundle(
    models: dict[str, object],
    feature_names: list[str],
    assay_names: list[str],
    metrics: dict[str, dict[str, float | int | None]],
    output_dir: Path,
    training_summary: dict[str, int | float | None],
) -> Path:
    bundle = Tox21ModelBundle(
        models=models,
        feature_names=feature_names,
        assay_names=assay_names,
        metrics=metrics,
        training_summary=training_summary,
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "random_forest.pkl"
    with open(model_path, "wb") as handle:
        pickle.dump(bundle, handle)
    return model_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Train per-assay Tox21 Random Forest models")
    parser.add_argument(
        "--data",
        "-d",
        type=Path,
        default=Path("data/processed/tox21"),
        help="Directory containing processed Tox21 arrays",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("models"),
        help="Directory where trained artifacts should be written",
    )
    parser.add_argument(
        "--n-estimators",
        type=int,
        default=100,
        help="Number of trees to train per assay",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=18,
        help="Maximum tree depth. Use 0 for no limit.",
    )
    parser.add_argument(
        "--cv-folds",
        type=int,
        default=3,
        help="Maximum number of stratified CV folds per assay",
    )
    args = parser.parse_args()

    print("=" * 72)
    print("CodeCure Tox21 Model Training")
    print("=" * 72)

    max_depth = None if args.max_depth == 0 else args.max_depth
    X_train, X_test, y_train, y_test, feature_names, assay_names = load_processed_data(args.data)
    models, metrics = train_models(
        X_train=X_train,
        y_train=y_train,
        X_test=X_test,
        y_test=y_test,
        assay_names=assay_names,
        n_estimators=args.n_estimators,
        max_depth=max_depth,
        cv_folds=args.cv_folds,
    )

    args.output.mkdir(parents=True, exist_ok=True)
    metrics_df = save_metrics(metrics, args.output)
    plot_metrics(metrics_df, args.output)

    mean_roc_auc = metrics_df["roc_auc"].dropna().mean()
    training_summary = {
        "assay_count": len(assay_names),
        "feature_count": len(feature_names),
        "train_samples": int(X_train.shape[0]),
        "test_samples": int(X_test.shape[0]),
        "n_estimators": args.n_estimators,
        "max_depth": max_depth,
        "cv_folds": args.cv_folds,
        "mean_roc_auc": None if pd.isna(mean_roc_auc) else round(float(mean_roc_auc), 6),
    }
    model_path = save_model_bundle(
        models=models,
        feature_names=feature_names,
        assay_names=assay_names,
        metrics=metrics,
        output_dir=args.output,
        training_summary=training_summary,
    )

    print("\nTraining summary:")
    print(json.dumps(training_summary, indent=2))
    print(f"Model bundle saved to {model_path}")
    print(f"Metrics saved to {args.output / 'training_metrics.csv'}")
    print("=" * 72)


if __name__ == "__main__":
    main()
