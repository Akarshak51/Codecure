# CodeCure: Tox21 Drug Toxicity Prediction

A machine learning project for screening compounds across the official **Tox21** assay panel. The project now uses the dataset bundle under `data/raw/tox21` end to end, replacing the old toy `toxicity_data.csv` workflow.

## What Changed

- The old 8-descriptor binary dataset flow has been removed from the active pipeline.
- Preprocessing now reads the provided Tox21 train/test files directly.
- Training now fits **12 assay-specific Random Forest models**.
- The API and frontend now work with **Tox21 `compound_id` values** and batch CSV uploads.

## Dataset Summary

The current pipeline uses the provided Tox21 files:

- `12,060` training compounds
- `647` test compounds
- `12` assay endpoints
- `801` dense descriptors
- `843` sparse fingerprint bits retained after filtering at `> 5%` training prevalence
- `1,644` total model features

Assays included:

- `NR.AhR`
- `NR.AR`
- `NR.AR.LBD`
- `NR.Aromatase`
- `NR.ER`
- `NR.ER.LBD`
- `NR.PPAR.gamma`
- `SR.ARE`
- `SR.ATAD5`
- `SR.HSE`
- `SR.MMP`
- `SR.p53`

## Project Structure

```text
codecure-toxicity-prediction/
|-- app/
|-- backend/
|   |-- api_app.py
|   |-- main.py
|   `-- model.py
|-- data/
|   |-- raw/tox21/
|   |-- processed/tox21/
|   `-- sample_template.csv
|-- models/
|-- public/
|-- reports/
|-- scripts/
|   |-- preprocess.py
|   |-- train.py
|   |-- predict.py
|   `-- feature_importance.py
`-- README.md
```

## Stack Model

This stack is fully local and free to run: Next.js frontend, FastAPI backend, scikit-learn training/inference, and local files for data/model storage. There are no paid APIs or hosted dependencies required for normal use.

## Python Setup

Install the backend and ML dependencies:

```bash
python -m pip install -r backend/requirements.txt
```

## Frontend Setup

Install the Next.js dependencies from the project root:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

## ML Pipeline

Run the verified Tox21 pipeline from the project root:

```bash
python scripts/preprocess.py
python scripts/train.py
python scripts/feature_importance.py --output reports
python scripts/predict.py --compound-id NCGC00261776-01 --split test
```

### Outputs

Preprocessing writes:

- `data/processed/tox21/X_train.npy`
- `data/processed/tox21/X_test.npy`
- `data/processed/tox21/y_train.npy`
- `data/processed/tox21/y_test.npy`
- `data/processed/tox21/feature_names.json`
- `data/processed/tox21/compound_metadata.csv`

Training writes:

- `models/random_forest.pkl`
- `models/training_metrics.csv`
- `models/training_metrics.json`
- `models/assay_roc_auc.png`

Feature importance writes:

- `reports/feature_importance_global.csv`
- `reports/feature_importance_per_assay.csv`
- `reports/feature_importance_global.png`
- `reports/feature_importance_heatmap.png`

## Current Training Result

The verified training run completed successfully with these summary values:

- Assays: `12`
- Features: `1,644`
- Trees per assay: `100`
- Max depth: `18`
- Cross-validation: up to `3` folds per assay
- Mean test ROC AUC: `0.81525`

Per-assay metrics are saved in [`models/training_metrics.csv`](models/training_metrics.csv).

## CLI Usage

List sample compounds from the processed test split:

```bash
python scripts/predict.py --list-examples
```

Predict a single compound already present in the dataset:

```bash
python scripts/predict.py --compound-id NCGC00261776-01 --split test
```

Batch predict from a CSV with `compound_id` and optional `split` columns:

```bash
python scripts/predict.py --input data/sample_template.csv --output predictions.csv
```

## API Usage

Start the API from the `backend` directory:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Key endpoints:

- `GET /health`
- `GET /dataset/assays`
- `GET /dataset/examples`
- `POST /predict`
- `POST /predict/batch`
- `GET /model/info`
- `GET /model/feature-importance`

### Single Prediction Request

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "compound_id": "NCGC00261776-01",
    "split": "test",
    "top_assays": 6
  }'
```

### Batch Prediction Request

```bash
curl -X POST "http://localhost:8000/predict/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "compound_ids": ["NCGC00261900-01", "NCGC00260869-01"],
    "split": "test",
    "top_assays": 4
  }'
```

## Frontend Workflow

The `/predict` page now supports:

- single-compound lookup by `compound_id`
- sample compound buttons for quick testing
- batch CSV upload using `public/tox21_sample_template.csv`

## Notes

- The model bundle expects the processed Tox21 arrays to exist under `data/processed/tox21`.
- Batch uploads in the UI currently resolve known Tox21 compound IDs from the processed dataset.
- Predictions are for research support and assay screening, not clinical use.
