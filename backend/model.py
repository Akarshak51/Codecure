from __future__ import annotations

"""Utilities for loading, querying, and serving Tox21 multi-assay models."""

import json
import logging
import pickle
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "random_forest.pkl"
DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "processed" / "tox21"


class Tox21ModelBundle:
    """Serializable container for the per-assay Random Forest models."""

    def __init__(
        self,
        models: Dict[str, Any],
        feature_names: list[str],
        assay_names: list[str],
        metrics: Optional[Dict[str, Dict[str, float]]] = None,
        training_summary: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.models = models
        self.feature_names = feature_names
        self.assay_names = assay_names
        self.metrics = metrics or {}
        self.training_summary = training_summary or {}

    def predict_proba(self, features: np.ndarray) -> Dict[str, np.ndarray]:
        """Return inactive/active probabilities for each assay."""
        X = np.asarray(features, dtype=np.float32)
        if X.ndim == 1:
            X = X.reshape(1, -1)

        expected_width = len(self.feature_names)
        if X.shape[1] != expected_width:
            raise ValueError(
                f"Expected {expected_width} features, received {X.shape[1]}"
            )

        probabilities: Dict[str, np.ndarray] = {}
        for assay in self.assay_names:
            model = self.models[assay]
            raw = np.asarray(model.predict_proba(X), dtype=np.float32)
            classes = list(getattr(model, "classes_", []))

            if raw.ndim == 1:
                raw = raw.reshape(-1, 1)

            if len(classes) == 1:
                only_class = int(classes[0]) if classes else 0
                if only_class == 1:
                    inactive = np.zeros(raw.shape[0], dtype=np.float32)
                    active = np.ones(raw.shape[0], dtype=np.float32)
                else:
                    inactive = np.ones(raw.shape[0], dtype=np.float32)
                    active = np.zeros(raw.shape[0], dtype=np.float32)
            else:
                inactive_index = classes.index(0) if 0 in classes else 0
                active_index = classes.index(1) if 1 in classes else min(1, raw.shape[1] - 1)
                inactive = raw[:, inactive_index]
                active = raw[:, active_index]

            probabilities[assay] = np.column_stack([inactive, active]).astype(np.float32)

        return probabilities

    def get_top_features(self, assay: str, top_n: int = 5) -> list[dict[str, float | str]]:
        """Return the top global feature importances for a specific assay."""
        model = self.models.get(assay)
        if model is None or not hasattr(model, "feature_importances_"):
            return []

        importances = np.asarray(model.feature_importances_, dtype=float)
        order = np.argsort(importances)[::-1][:top_n]
        return [
            {
                "feature": self.feature_names[index],
                "importance": round(float(importances[index]), 6),
            }
            for index in order
        ]

    def get_global_feature_importance(self, top_n: int = 20) -> list[dict[str, float | str]]:
        """Average feature importance across assays."""
        all_importances = []
        for assay in self.assay_names:
            model = self.models.get(assay)
            if model is not None and hasattr(model, "feature_importances_"):
                all_importances.append(np.asarray(model.feature_importances_, dtype=float))

        if not all_importances:
            return []

        mean_importance = np.mean(np.vstack(all_importances), axis=0)
        order = np.argsort(mean_importance)[::-1][:top_n]
        return [
            {
                "feature": self.feature_names[index],
                "importance": round(float(mean_importance[index]), 6),
            }
            for index in order
        ]


class Tox21Predictor:
    """Runtime helper for loading the trained bundle and processed Tox21 lookup data."""

    def __init__(
        self,
        model_path: Optional[Path] = None,
        data_dir: Optional[Path] = None,
    ) -> None:
        self.model_path = Path(model_path or DEFAULT_MODEL_PATH)
        self.data_dir = Path(data_dir or DEFAULT_DATA_DIR)
        self.bundle: Optional[Tox21ModelBundle] = None
        self.feature_names: list[str] = []
        self.assay_names: list[str] = []
        self.metadata = pd.DataFrame()
        self.train_ids: np.ndarray | None = None
        self.test_ids: np.ndarray | None = None
        self.X_train: np.ndarray | None = None
        self.X_test: np.ndarray | None = None
        self.y_train: np.ndarray | None = None
        self.y_test: np.ndarray | None = None
        self.lookup_by_split: dict[str, dict[str, int]] = {"train": {}, "test": {}}
        self._load()

    @property
    def model_loaded(self) -> bool:
        return self.bundle is not None

    @property
    def dataset_loaded(self) -> bool:
        return (
            self.X_train is not None
            and self.X_test is not None
            and len(self.feature_names) > 0
            and len(self.assay_names) > 0
        )

    @property
    def is_ready(self) -> bool:
        return self.model_loaded and self.dataset_loaded

    def _load(self) -> None:
        self._load_bundle()
        self._load_processed_data()

    def _load_bundle(self) -> None:
        if not self.model_path.exists():
            logger.warning("Model file not found: %s", self.model_path)
            return

        try:
            with open(self.model_path, "rb") as handle:
                bundle = pickle.load(handle)
            if not isinstance(bundle, Tox21ModelBundle):
                raise TypeError(
                    f"Unexpected model artifact type: {type(bundle).__name__}"
                )
            self.bundle = bundle
            self.feature_names = bundle.feature_names
            self.assay_names = bundle.assay_names
            logger.info("Loaded model bundle from %s", self.model_path)
        except Exception as exc:
            logger.exception("Failed to load model bundle from %s", self.model_path)
            raise RuntimeError(f"Could not load Tox21 model bundle: {exc}") from exc

    def _load_processed_data(self) -> None:
        if not self.data_dir.exists():
            logger.warning("Processed data directory not found: %s", self.data_dir)
            return

        try:
            if not self.feature_names:
                self.feature_names = self._read_json(self.data_dir / "feature_names.json")
            if not self.assay_names:
                self.assay_names = self._read_json(self.data_dir / "assay_names.json")

            self.train_ids = np.load(self.data_dir / "train_ids.npy", mmap_mode="r")
            self.test_ids = np.load(self.data_dir / "test_ids.npy", mmap_mode="r")
            self.X_train = np.load(self.data_dir / "X_train.npy", mmap_mode="r")
            self.X_test = np.load(self.data_dir / "X_test.npy", mmap_mode="r")
            self.y_train = np.load(self.data_dir / "y_train.npy", mmap_mode="r")
            self.y_test = np.load(self.data_dir / "y_test.npy", mmap_mode="r")

            metadata_path = self.data_dir / "compound_metadata.csv"
            if metadata_path.exists():
                self.metadata = pd.read_csv(metadata_path).set_index("compound_id")
            else:
                self.metadata = pd.DataFrame()

            self.lookup_by_split["train"] = {
                str(compound_id).upper(): index
                for index, compound_id in enumerate(np.asarray(self.train_ids))
            }
            self.lookup_by_split["test"] = {
                str(compound_id).upper(): index
                for index, compound_id in enumerate(np.asarray(self.test_ids))
            }
            logger.info("Loaded processed Tox21 lookup data from %s", self.data_dir)
        except Exception as exc:
            logger.exception("Failed to load processed data from %s", self.data_dir)
            raise RuntimeError(f"Could not load processed Tox21 data: {exc}") from exc

    @staticmethod
    def _read_json(path: Path) -> list[str]:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    @staticmethod
    def _to_python_value(value: Any) -> Any:
        if pd.isna(value):
            return None
        if isinstance(value, (np.integer, np.floating)):
            return value.item()
        return value

    def _resolve_compound(self, compound_id: str, split: str = "auto") -> tuple[str, int]:
        key = compound_id.strip().upper()
        if split == "auto":
            if key in self.lookup_by_split["test"]:
                return "test", self.lookup_by_split["test"][key]
            if key in self.lookup_by_split["train"]:
                return "train", self.lookup_by_split["train"][key]
        else:
            normalized_split = split.lower()
            if normalized_split not in self.lookup_by_split:
                raise ValueError("Split must be one of: auto, train, test")
            if key in self.lookup_by_split[normalized_split]:
                return normalized_split, self.lookup_by_split[normalized_split][key]

        raise KeyError(f"Compound ID not found in processed Tox21 data: {compound_id}")

    def _get_lookup_row(self, compound_id: str, split: str) -> tuple[np.ndarray, np.ndarray | None, dict[str, Any]]:
        resolved_split, index = self._resolve_compound(compound_id, split)
        if resolved_split == "train":
            assert self.X_train is not None and self.y_train is not None and self.train_ids is not None
            features = np.asarray(self.X_train[index], dtype=np.float32)
            labels = np.asarray(self.y_train[index], dtype=np.float32)
            resolved_id = str(np.asarray(self.train_ids)[index])
        else:
            assert self.X_test is not None and self.y_test is not None and self.test_ids is not None
            features = np.asarray(self.X_test[index], dtype=np.float32)
            labels = np.asarray(self.y_test[index], dtype=np.float32)
            resolved_id = str(np.asarray(self.test_ids)[index])

        metadata: dict[str, Any] = {
            "compound_id": resolved_id,
            "split": resolved_split,
        }
        if not self.metadata.empty and resolved_id in self.metadata.index:
            metadata.update(
                {
                    column: self._to_python_value(value)
                    for column, value in self.metadata.loc[resolved_id].to_dict().items()
                }
            )

        return features, labels, metadata

    def _format_prediction(
        self,
        features: np.ndarray,
        metadata: Optional[dict[str, Any]] = None,
        known_labels: Optional[np.ndarray] = None,
        top_assays: int = 5,
    ) -> dict[str, Any]:
        if self.bundle is None:
            raise RuntimeError("Tox21 model bundle is not loaded")

        probability_map = self.bundle.predict_proba(features)
        predictions = []
        for assay_index, assay in enumerate(self.assay_names):
            inactive_probability, active_probability = probability_map[assay][0]
            known_label = None
            if known_labels is not None:
                label_value = float(known_labels[assay_index])
                if not np.isnan(label_value):
                    known_label = int(label_value)

            predictions.append(
                {
                    "assay": assay,
                    "predicted_active": bool(active_probability >= 0.5),
                    "probability_active": round(float(active_probability), 6),
                    "probability_inactive": round(float(inactive_probability), 6),
                    "known_label": known_label,
                    "top_features": self.bundle.get_top_features(assay, top_n=3),
                    "metrics": self.bundle.metrics.get(assay, {}),
                }
            )

        predictions.sort(key=lambda item: item["probability_active"], reverse=True)
        active_count = sum(1 for item in predictions if item["predicted_active"])
        summary = {
            "predicted_active_count": active_count,
            "predicted_inactive_count": len(predictions) - active_count,
            "highest_risk_assay": predictions[0]["assay"] if predictions else None,
            "mean_active_probability": round(
                float(np.mean([item["probability_active"] for item in predictions])),
                6,
            ),
            "top_assays": predictions[:top_assays],
        }

        payload = {
            "compound_id": metadata.get("compound_id") if metadata else None,
            "split": metadata.get("split") if metadata else None,
            "summary": summary,
            "predictions": predictions,
            "metadata": metadata or {},
        }
        return payload

    def predict_by_compound_id(
        self,
        compound_id: str,
        split: str = "auto",
        top_assays: int = 5,
    ) -> dict[str, Any]:
        if not self.dataset_loaded:
            raise RuntimeError("Processed Tox21 lookup data is not loaded")
        features, labels, metadata = self._get_lookup_row(compound_id, split)
        return self._format_prediction(features, metadata=metadata, known_labels=labels, top_assays=top_assays)

    def predict_by_features(
        self,
        feature_map: Dict[str, float],
        compound_id: Optional[str] = None,
        top_assays: int = 5,
    ) -> dict[str, Any]:
        missing = [name for name in self.feature_names if name not in feature_map]
        if missing:
            preview = ", ".join(missing[:10])
            suffix = "..." if len(missing) > 10 else ""
            raise ValueError(f"Missing required feature columns: {preview}{suffix}")

        features = np.asarray(
            [feature_map[name] for name in self.feature_names],
            dtype=np.float32,
        )
        metadata = {}
        if compound_id:
            metadata["compound_id"] = compound_id
            metadata["split"] = "external"
        return self._format_prediction(features, metadata=metadata, known_labels=None, top_assays=top_assays)

    def predict_batch_from_ids(
        self,
        compound_ids: list[str],
        split: str = "auto",
        top_assays: int = 5,
    ) -> dict[str, Any]:
        predictions = []
        unresolved = []
        for compound_id in compound_ids:
            try:
                predictions.append(
                    self.predict_by_compound_id(compound_id, split=split, top_assays=top_assays)
                )
            except KeyError:
                unresolved.append(compound_id)

        return {
            "predictions": predictions,
            "total_compounds": len(compound_ids),
            "resolved_compounds": len(predictions),
            "unresolved_compounds": unresolved,
        }

    def get_available_examples(self, count: int = 5) -> list[str]:
        if self.test_ids is None:
            return []
        return [str(value) for value in np.asarray(self.test_ids[:count])]

    def get_model_info(self) -> dict[str, Any]:
        return {
            "model_type": "Per-assay Random Forest ensemble" if self.bundle else None,
            "model_loaded": self.model_loaded,
            "dataset_loaded": self.dataset_loaded,
            "feature_count": len(self.feature_names),
            "assay_count": len(self.assay_names),
            "assays": self.assay_names,
            "example_compounds": self.get_available_examples(),
            "training_summary": self.bundle.training_summary if self.bundle else {},
        }

    def get_feature_importance(self, top_n: int = 20) -> dict[str, Any]:
        if self.bundle is None:
            return {"global": [], "per_assay": {}}

        return {
            "global": self.bundle.get_global_feature_importance(top_n=top_n),
            "per_assay": {
                assay: self.bundle.get_top_features(assay, top_n=top_n)
                for assay in self.assay_names
            },
        }


_predictor: Optional[Tox21Predictor] = None


def get_predictor() -> Tox21Predictor:
    """Return a singleton predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = Tox21Predictor()
    return _predictor
