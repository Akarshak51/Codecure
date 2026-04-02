from __future__ import annotations

"""Preprocess the provided Tox21 bundle into model-ready numpy arrays."""

import argparse
import gzip
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import io
from sklearn.impute import SimpleImputer

ASSAY_NAMES = [
    "NR.AhR",
    "NR.AR",
    "NR.AR.LBD",
    "NR.Aromatase",
    "NR.ER",
    "NR.ER.LBD",
    "NR.PPAR.gamma",
    "SR.ARE",
    "SR.ATAD5",
    "SR.HSE",
    "SR.MMP",
    "SR.p53",
]


def load_dense_frame(path: Path) -> pd.DataFrame:
    print(f"Loading dense features from {path}...")
    return pd.read_csv(path, index_col=0, compression="infer")


def load_label_frame(path: Path) -> pd.DataFrame:
    print(f"Loading labels from {path}...")
    return pd.read_csv(path, index_col=0, compression="infer", na_values=["NA"])


def load_sparse_names(path: Path) -> list[str]:
    print(f"Loading sparse feature names from {path}...")
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip()]


def load_row_names(path: Path) -> list[str]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip()]


def load_sparse_matrix(path: Path):
    print(f"Loading sparse matrix from {path}...")
    return io.mmread(path).tocsr().astype(np.float32)


def validate_alignment(
    dense: pd.DataFrame,
    labels: pd.DataFrame,
    sparse_row_names: list[str],
    split_name: str,
) -> None:
    dense_ids = dense.index.tolist()
    label_ids = labels.index.tolist()
    if dense_ids != label_ids:
        raise ValueError(f"Dense features and labels are misaligned for {split_name}")
    if dense_ids != sparse_row_names:
        raise ValueError(f"Sparse matrix rows are misaligned for {split_name}")


def write_json(path: Path, payload: object) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def preprocess_tox21(raw_dir: Path, output_dir: Path, sparse_threshold: float) -> dict[str, int | float]:
    train_dense = load_dense_frame(raw_dir / "tox21_dense_train.csv.gz")
    test_dense = load_dense_frame(raw_dir / "tox21_dense_test.csv.gz")
    train_labels = load_label_frame(raw_dir / "tox21_labels_train.csv.gz")
    test_labels = load_label_frame(raw_dir / "tox21_labels_test.csv.gz")

    train_sparse_row_names = load_row_names(raw_dir / "tox21_sparse_rownames_train.txt.gz")
    test_sparse_row_names = load_row_names(raw_dir / "tox21_sparse_rownames_test.txt.gz")
    sparse_feature_names = load_sparse_names(raw_dir / "tox21_sparse_colnames.txt.gz")
    train_sparse = load_sparse_matrix(raw_dir / "tox21_sparse_train.mtx.gz")
    test_sparse = load_sparse_matrix(raw_dir / "tox21_sparse_test.mtx.gz")

    validate_alignment(train_dense, train_labels, train_sparse_row_names, "train")
    validate_alignment(test_dense, test_labels, test_sparse_row_names, "test")

    compound_metadata = pd.read_csv(raw_dir / "tox21_compoundData.csv")
    compound_metadata = compound_metadata.rename(columns={"ID": "compound_id", "set": "dataset_split"})
    compound_metadata = compound_metadata.set_index("compound_id")

    dense_feature_names = train_dense.columns.tolist()
    imputer = SimpleImputer(strategy="median")
    X_train_dense = imputer.fit_transform(train_dense).astype(np.float32)
    X_test_dense = imputer.transform(test_dense).astype(np.float32)

    sparse_presence = train_sparse.getnnz(axis=0) / train_sparse.shape[0]
    sparse_mask = np.asarray(sparse_presence > sparse_threshold).ravel()
    selected_sparse_names = [
        name for name, keep in zip(sparse_feature_names, sparse_mask.tolist()) if keep
    ]

    X_train_sparse = train_sparse[:, sparse_mask].toarray().astype(np.float32)
    X_test_sparse = test_sparse[:, sparse_mask].toarray().astype(np.float32)

    X_train = np.hstack([X_train_dense, X_train_sparse]).astype(np.float32)
    X_test = np.hstack([X_test_dense, X_test_sparse]).astype(np.float32)
    y_train = train_labels[ASSAY_NAMES].to_numpy(dtype=np.float32)
    y_test = test_labels[ASSAY_NAMES].to_numpy(dtype=np.float32)

    feature_names = dense_feature_names + selected_sparse_names

    output_dir.mkdir(parents=True, exist_ok=True)
    np.save(output_dir / "X_train.npy", X_train)
    np.save(output_dir / "X_test.npy", X_test)
    np.save(output_dir / "y_train.npy", y_train)
    np.save(output_dir / "y_test.npy", y_test)
    np.save(output_dir / "train_ids.npy", train_dense.index.to_numpy(dtype=str))
    np.save(output_dir / "test_ids.npy", test_dense.index.to_numpy(dtype=str))

    train_metadata = compound_metadata.reindex(train_dense.index).copy()
    train_metadata["processed_split"] = "train"
    test_metadata = compound_metadata.reindex(test_dense.index).copy()
    test_metadata["processed_split"] = "test"
    combined_metadata = pd.concat([train_metadata, test_metadata])
    combined_metadata.index.name = "compound_id"
    combined_metadata.to_csv(output_dir / "compound_metadata.csv")

    train_labels.to_csv(output_dir / "train_labels.csv")
    test_labels.to_csv(output_dir / "test_labels.csv")

    write_json(output_dir / "feature_names.json", feature_names)
    write_json(output_dir / "dense_feature_names.json", dense_feature_names)
    write_json(output_dir / "selected_sparse_feature_names.json", selected_sparse_names)
    write_json(output_dir / "assay_names.json", ASSAY_NAMES)

    summary = {
        "train_samples": int(X_train.shape[0]),
        "test_samples": int(X_test.shape[0]),
        "dense_feature_count": int(len(dense_feature_names)),
        "selected_sparse_feature_count": int(len(selected_sparse_names)),
        "total_feature_count": int(len(feature_names)),
        "assay_count": int(len(ASSAY_NAMES)),
        "sparse_threshold": float(sparse_threshold),
    }
    write_json(output_dir / "dataset_summary.json", summary)

    print("Preprocessing complete.")
    print(json.dumps(summary, indent=2))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Preprocess the provided Tox21 dataset")
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=Path("data/raw/tox21"),
        help="Path to the raw Tox21 directory",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("data/processed/tox21"),
        help="Directory where processed arrays should be written",
    )
    parser.add_argument(
        "--sparse-threshold",
        type=float,
        default=0.05,
        help="Keep sparse fingerprint columns present in more than this fraction of training compounds",
    )
    args = parser.parse_args()

    print("=" * 72)
    print("CodeCure Tox21 Preprocessing")
    print("=" * 72)
    preprocess_tox21(args.input, args.output, args.sparse_threshold)
    print("=" * 72)


if __name__ == "__main__":
    main()
