"""
Home Price Appreciation Prediction Pipeline
=============================================
Trains XGBoost and RandomForest regressors to predict 12-month forward
home price appreciation per ZIP code using Zillow-style monthly ZHVI data.

Performance: operates on wide-format price matrix (26K ZIPs × 313 months)
using vectorized numpy — avoids melt/groupby entirely.
"""

import os
import time
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

warnings.filterwarnings("ignore", category=FutureWarning)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "data.csv")
MODEL_DIR = os.path.join(BASE_DIR, "..", "output")
META_COLS = [
    "RegionID", "SizeRank", "RegionName", "RegionType",
    "StateName", "State", "City", "Metro", "CountyName",
]

FEATURE_COLS = [
    "growth_3m", "growth_6m", "growth_12m",
    "cagr_3y", "volatility_12m", "momentum_accel",
]
TARGET_COL = "fwd_12m_appreciation"


# ---------------------------------------------------------------------------
# 1. DATA LOADING
# ---------------------------------------------------------------------------

def load_data(filepath: str):
    """
    Load wide-format CSV. Returns metadata DataFrame, price matrix (numpy),
    and date array.
    """
    t0 = time.time()
    raw = pd.read_csv(filepath, low_memory=False)

    date_cols = [c for c in raw.columns if c not in META_COLS]
    dates = pd.to_datetime(date_cols)

    meta = raw[META_COLS].copy()
    prices = raw[date_cols].apply(pd.to_numeric, errors="coerce").values  # (n_zips, n_months)

    print(f"[load_data] {prices.shape[0]:,} ZIPs × {prices.shape[1]} months "
          f"({time.time() - t0:.1f}s)")
    return meta, prices, dates


# ---------------------------------------------------------------------------
# 2. FEATURE ENGINEERING  (vectorized over the wide price matrix)
# ---------------------------------------------------------------------------

def engineer_features(prices: np.ndarray, dates: pd.DatetimeIndex):
    """
    Compute features for every (ZIP, month) pair using the wide price matrix.

    Returns:
      features  — (n_zips, n_months, 6) array
      target    — (n_zips, n_months) array of 12-month forward appreciation
    """
    t0 = time.time()
    n_zips, n_months = prices.shape

    with np.errstate(divide="ignore", invalid="ignore"):
        growth_3m = np.full_like(prices, np.nan)
        growth_3m[:, 3:] = prices[:, 3:] / prices[:, :-3] - 1

        growth_6m = np.full_like(prices, np.nan)
        growth_6m[:, 6:] = prices[:, 6:] / prices[:, :-6] - 1

        growth_12m = np.full_like(prices, np.nan)
        growth_12m[:, 12:] = prices[:, 12:] / prices[:, :-12] - 1

        ratio_36 = np.full_like(prices, np.nan)
        ratio_36[:, 36:] = prices[:, 36:] / prices[:, :-36]
        cagr_3y = np.power(ratio_36, 12.0 / 36.0) - 1

        # 12-month rolling volatility of monthly returns
        monthly_ret = np.full_like(prices, np.nan)
        monthly_ret[:, 1:] = prices[:, 1:] / prices[:, :-1] - 1

        volatility_12m = np.full_like(prices, np.nan)
        for t in range(12, n_months):
            volatility_12m[:, t] = np.nanstd(monthly_ret[:, t - 11 : t + 1], axis=1, ddof=1)

        momentum_accel = growth_3m - growth_6m

        # Target: 12-month forward appreciation
        target = np.full_like(prices, np.nan)
        target[:, :-12] = prices[:, 12:] / prices[:, :-12] - 1

    features = np.stack(
        [growth_3m, growth_6m, growth_12m, cagr_3y, volatility_12m, momentum_accel],
        axis=-1,
    )  # (n_zips, n_months, 6)

    print(f"[engineer_features] computed 6 features + target "
          f"({time.time() - t0:.1f}s)")
    return features, target, dates


# ---------------------------------------------------------------------------
# 3. FLATTEN TO TRAINING TABLE
# ---------------------------------------------------------------------------

def build_table(meta: pd.DataFrame, features: np.ndarray, target: np.ndarray,
                dates: pd.DatetimeIndex):
    """
    Flatten (n_zips, n_months, 6) feature tensor into a 2-D training table.
    Drops any row with NaN in features or target.
    """
    t0 = time.time()
    n_zips, n_months, n_feat = features.shape

    zip_idx, month_idx = np.meshgrid(np.arange(n_zips), np.arange(n_months), indexing="ij")
    zip_idx = zip_idx.ravel()
    month_idx = month_idx.ravel()

    X = features.reshape(-1, n_feat)
    y = target.ravel()

    valid = np.isfinite(X).all(axis=1) & np.isfinite(y)
    X = X[valid]
    y = y[valid]
    zip_idx = zip_idx[valid]
    month_idx = month_idx[valid]

    date_arr = dates[month_idx]

    df = pd.DataFrame(X, columns=FEATURE_COLS)
    df[TARGET_COL] = y
    df["date"] = date_arr
    df["_zip_idx"] = zip_idx

    print(f"[build_table] {len(df):,} valid rows from "
          f"{n_zips * n_months:,} total ({time.time() - t0:.1f}s)")
    return df


# ---------------------------------------------------------------------------
# 4. TIME-BASED TRAIN / TEST SPLIT
# ---------------------------------------------------------------------------

def split_temporal(df: pd.DataFrame, cutoff: str = "2018-01-01"):
    cutoff_dt = pd.Timestamp(cutoff)
    train_mask = df["date"] < cutoff_dt
    test_mask = df["date"] >= cutoff_dt

    X_train = df.loc[train_mask, FEATURE_COLS].values
    y_train = df.loc[train_mask, TARGET_COL].values
    X_test = df.loc[test_mask, FEATURE_COLS].values
    y_test = df.loc[test_mask, TARGET_COL].values

    print(f"[split_temporal] train: {X_train.shape[0]:,} rows (< {cutoff}) | "
          f"test: {X_test.shape[0]:,} rows (>= {cutoff})")
    return X_train, X_test, y_train, y_test, df.loc[test_mask].copy()


# ---------------------------------------------------------------------------
# 5. MODEL TRAINING
# ---------------------------------------------------------------------------

def train_xgb(X_train: np.ndarray, y_train: np.ndarray) -> XGBRegressor:
    t0 = time.time()
    model = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.7,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        tree_method="hist",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train, verbose=False)
    print(f"[train_xgb] done ({time.time() - t0:.1f}s)")
    return model


def train_rf(X_train: np.ndarray, y_train: np.ndarray) -> RandomForestRegressor:
    t0 = time.time()
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_leaf=30,
        max_samples=0.3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    print(f"[train_rf] done ({time.time() - t0:.1f}s)")
    return model


# ---------------------------------------------------------------------------
# 6. EVALUATION
# ---------------------------------------------------------------------------

def evaluate_model(model, X_test, y_test, name: str) -> dict:
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)

    print(f"\n{'=' * 50}")
    print(f"  {name} — Test Set Evaluation")
    print(f"{'=' * 50}")
    print(f"  MAE  : {mae:.6f}")
    print(f"  RMSE : {rmse:.6f}")
    print(f"  R²   : {r2:.6f}")
    return {"mae": mae, "rmse": rmse, "r2": r2}


# ---------------------------------------------------------------------------
# 7. FEATURE IMPORTANCE + SHAP
# ---------------------------------------------------------------------------

def show_feature_importance(model, feature_names: list[str], name: str):
    importances = model.feature_importances_
    order = np.argsort(importances)[::-1]

    print(f"\n--- Top Features ({name}) ---")
    for rank, idx in enumerate(order[:10], 1):
        print(f"  {rank:>2}. {feature_names[idx]:<22s}  {importances[idx]:.4f}")


def shap_analysis(model, X_test: np.ndarray, feature_names: list[str], name: str):
    """SHAP summary for tree-based model. Skipped gracefully if shap not installed."""
    try:
        import shap
    except ImportError:
        print(f"[shap_analysis] shap not installed — skipping for {name}")
        return

    t0 = time.time()
    explainer = shap.TreeExplainer(model)
    sample_size = min(500, X_test.shape[0])
    rng = np.random.RandomState(42)
    idx = rng.choice(X_test.shape[0], sample_size, replace=False)
    shap_values = explainer.shap_values(X_test[idx])

    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    order = np.argsort(mean_abs_shap)[::-1]

    print(f"\n--- Mean |SHAP| ({name}, n={sample_size}, {time.time() - t0:.1f}s) ---")
    for rank, i in enumerate(order[:10], 1):
        print(f"  {rank:>2}. {feature_names[i]:<22s}  {mean_abs_shap[i]:.6f}")


# ---------------------------------------------------------------------------
# 8. ZIP CODE RANKINGS
# ---------------------------------------------------------------------------

def rank_zip_codes(model, meta: pd.DataFrame, features: np.ndarray,
                   dates: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Score every ZIP at the most recent month with valid features.
    Returns ranked DataFrame.
    """
    for t in range(len(dates) - 1, -1, -1):
        feat_slice = features[:, t, :]  # (n_zips, 6)
        valid = np.isfinite(feat_slice).all(axis=1)
        if valid.sum() > 100:
            break

    X_latest = feat_slice[valid]
    preds = model.predict(X_latest)

    rankings = meta.loc[valid].copy()
    rankings["predicted_12m_appreciation"] = preds
    rankings = (
        rankings[["RegionName", "City", "StateName", "Metro",
                  "predicted_12m_appreciation"]]
        .sort_values("predicted_12m_appreciation", ascending=False)
        .reset_index(drop=True)
    )
    rankings.index += 1
    rankings.index.name = "rank"

    print(f"\n[rank_zip_codes] Scored {len(rankings):,} ZIPs "
          f"as of {dates[t].strftime('%Y-%m-%d')}")
    return rankings


# ---------------------------------------------------------------------------
# 9. MAIN ORCHESTRATION
# ---------------------------------------------------------------------------

def main():
    t_start = time.time()
    os.makedirs(MODEL_DIR, exist_ok=True)

    # --- load ---
    meta, prices, dates = load_data(DATA_PATH)

    # --- features ---
    features, target, dates = engineer_features(prices, dates)

    # --- flatten to table ---
    df = build_table(meta, features, target, dates)

    # --- split ---
    X_train, X_test, y_train, y_test, test_df = split_temporal(df)

    # --- subsample training data if huge (keeps memory manageable) ---
    MAX_TRAIN = 500_000
    if X_train.shape[0] > MAX_TRAIN:
        rng = np.random.RandomState(42)
        idx = rng.choice(X_train.shape[0], MAX_TRAIN, replace=False)
        X_train_s, y_train_s = X_train[idx], y_train[idx]
        print(f"[subsample] training on {MAX_TRAIN:,} / {X_train.shape[0]:,} rows")
    else:
        X_train_s, y_train_s = X_train, y_train

    # --- train ---
    print("\nTraining XGBoost …")
    xgb_model = train_xgb(X_train_s, y_train_s)

    print("Training RandomForest …")
    rf_model = train_rf(X_train_s, y_train_s)

    # --- evaluate ---
    xgb_metrics = evaluate_model(xgb_model, X_test, y_test, "XGBoost")
    rf_metrics = evaluate_model(rf_model, X_test, y_test, "RandomForest")

    # --- pick best ---
    best_name, best_model = (
        ("XGBoost", xgb_model) if xgb_metrics["r2"] >= rf_metrics["r2"]
        else ("RandomForest", rf_model)
    )
    print(f"\n★ Best model by R²: {best_name}")

    # --- feature importance ---
    show_feature_importance(xgb_model, FEATURE_COLS, "XGBoost")
    show_feature_importance(rf_model, FEATURE_COLS, "RandomForest")
    shap_analysis(xgb_model, X_test, FEATURE_COLS, "XGBoost")

    # --- save models ---
    xgb_path = os.path.join(MODEL_DIR, "xgb_model.joblib")
    rf_path = os.path.join(MODEL_DIR, "rf_model.joblib")
    joblib.dump(xgb_model, xgb_path)
    joblib.dump(rf_model, rf_path)
    print(f"\n[saved] {xgb_path}")
    print(f"[saved] {rf_path}")

    # --- ZIP rankings (using best model) ---
    rankings = rank_zip_codes(best_model, meta, features, dates)
    rankings_path = os.path.join(MODEL_DIR, "zip_rankings.csv")
    rankings.to_csv(rankings_path)
    print(f"[saved] {rankings_path}")

    print(f"\n{'=' * 50}")
    print("  Top 25 ZIPs by Predicted 12-Month Appreciation")
    print(f"{'=' * 50}")
    print(rankings.head(25).to_string())

    print(f"\n{'=' * 50}")
    print("  Bottom 10 ZIPs")
    print(f"{'=' * 50}")
    print(rankings.tail(10).to_string())

    print(f"\n✓ Pipeline complete in {time.time() - t_start:.1f}s")


if __name__ == "__main__":
    main()
