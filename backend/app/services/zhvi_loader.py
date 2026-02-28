from __future__ import annotations

import os
import pandas as pd
import numpy as np
from functools import lru_cache
from app.core.config import ZHVI_CSV_PATH


@lru_cache(maxsize=1)
def _load_dataframe() -> pd.DataFrame:
    path = os.path.normpath(ZHVI_CSV_PATH)
    df = pd.read_csv(path)
    return df


def get_available_zips() -> list[str]:
    df = _load_dataframe()
    return df["RegionName"].astype(str).str.zfill(5).tolist()


def get_zip_series(zip_code: str | int) -> np.ndarray:
    """Return monthly ZHVI values as a numpy array for the given ZIP."""
    df = _load_dataframe()
    zip_str = str(zip_code).zfill(5)
    row = df[df["RegionName"].astype(str).str.zfill(5) == zip_str]

    if row.empty:
        raise ValueError(f"ZIP code {zip_str} not found in ZHVI data")

    date_cols = [c for c in df.columns if c[0:2] in ("19", "20")]
    values = row[date_cols].values.flatten().astype(float)
    values = values[~np.isnan(values)]

    if len(values) < 12:
        raise ValueError(f"Insufficient data for ZIP {zip_str} ({len(values)} months)")

    return values


def compute_monthly_stats(values: np.ndarray) -> tuple[float, float]:
    """Compute mean monthly return and volatility from a price series."""
    returns = np.diff(values) / values[:-1]
    mu = float(np.mean(returns))
    sigma = float(np.std(returns, ddof=1))
    return mu, sigma


def get_zip_median(zip_code: str | int) -> float:
    """Return the latest ZHVI value (proxy for ZIP median)."""
    values = get_zip_series(zip_code)
    return float(values[-1])
