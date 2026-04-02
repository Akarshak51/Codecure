from __future__ import annotations

"""FastAPI backend for serving Tox21 multi-assay predictions."""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.model import Tox21Predictor, get_predictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    dataset_loaded: bool
    assay_count: int
    version: str


class PredictionInput(BaseModel):
    compound_id: Optional[str] = Field(default=None, description="Existing Tox21 compound ID")
    features: Optional[dict[str, float]] = Field(
        default=None,
        description="Full processed feature map for external predictions",
    )
    split: Literal["auto", "train", "test"] = "auto"
    top_assays: int = Field(default=5, ge=1, le=12)

    @model_validator(mode="after")
    def validate_payload(self):
        if bool(self.compound_id) == bool(self.features):
            raise ValueError("Provide exactly one of compound_id or features")
        return self


class BatchPredictionInput(BaseModel):
    compound_ids: list[str] = Field(..., min_length=1)
    split: Literal["auto", "train", "test"] = "auto"
    top_assays: int = Field(default=5, ge=1, le=12)


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_predictor()
    yield


app = FastAPI(
    title="CodeCure Tox21 Prediction API",
    description="Multi-assay toxicity prediction backed by the official Tox21 train/test bundle.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_predictor() -> Tox21Predictor:
    predictor = get_predictor()
    if not predictor.is_ready:
        raise HTTPException(
            status_code=503,
            detail="The Tox21 model is not ready. Run preprocess.py and train.py first.",
        )
    return predictor


@app.get("/", response_model=HealthResponse)
async def root() -> HealthResponse:
    predictor = get_predictor()
    return HealthResponse(
        status="healthy",
        model_loaded=predictor.model_loaded,
        dataset_loaded=predictor.dataset_loaded,
        assay_count=len(predictor.assay_names),
        version="2.0.0",
    )


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return await root()


@app.get("/dataset/assays")
async def dataset_assays() -> dict[str, Any]:
    predictor = require_predictor()
    return {"assays": predictor.assay_names}


@app.get("/dataset/examples")
async def dataset_examples(count: int = 5) -> dict[str, Any]:
    predictor = require_predictor()
    return {"compound_ids": predictor.get_available_examples(count=count)}


@app.post("/predict")
async def predict(payload: PredictionInput) -> dict[str, Any]:
    predictor = require_predictor()
    try:
        if payload.compound_id:
            return predictor.predict_by_compound_id(
                payload.compound_id,
                split=payload.split,
                top_assays=payload.top_assays,
            )
        return predictor.predict_by_features(
            payload.features or {},
            compound_id=payload.compound_id,
            top_assays=payload.top_assays,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@app.post("/predict/batch")
async def predict_batch(payload: BatchPredictionInput) -> dict[str, Any]:
    predictor = require_predictor()
    try:
        return predictor.predict_batch_from_ids(
            payload.compound_ids,
            split=payload.split,
            top_assays=payload.top_assays,
        )
    except Exception as exc:
        logger.exception("Batch prediction failed")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {exc}") from exc


@app.get("/model/info")
async def model_info() -> dict[str, Any]:
    predictor = get_predictor()
    return predictor.get_model_info()


@app.get("/model/feature-importance")
async def feature_importance(top_n: int = 20) -> dict[str, Any]:
    predictor = get_predictor()
    return predictor.get_feature_importance(top_n=top_n)
