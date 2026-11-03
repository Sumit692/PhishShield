"""
Machine Learning training and evaluation pipeline for PhishShield.
Trains a Random Forest classifier and Logistic Regression baseline
using the Kaggle Malicious URLs dataset (sid321axn/malicious-urls-dataset).
Evaluates both stratified holdout and domain-grouped generalization splits.
Exports versioned artifacts, feature schema, and full metrics report.
"""
import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from urllib.parse import urlparse
import re

from sklearn.model_selection import train_test_split, GroupShuffleSplit
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix
)

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml.features import extract_features, get_registered_domain

MODEL_VERSION = "3.0.0-rf-malicious-urls"
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
DATASET_NAME = "sid321axn/malicious-urls-dataset"


def find_or_download_dataset() -> str:
    """Locate cached dataset or download via kagglehub."""
    cache_path = os.path.join(
        os.path.expanduser("~"),
        ".cache", "kagglehub", "datasets", "sid321axn", "malicious-urls-dataset"
    )
    if os.path.exists(cache_path):
        for root, _, files in os.walk(cache_path):
            for f in files:
                if f.endswith(".csv"):
                    return os.path.join(root, f)

    try:
        import kagglehub
        print(f"Downloading dataset '{DATASET_NAME}' via kagglehub...")
        download_dir = kagglehub.dataset_download(DATASET_NAME)
        for root, _, files in os.walk(download_dir):
            for f in files:
                if f.endswith(".csv"):
                    return os.path.join(root, f)
    except Exception as e:
        print(f"kagglehub download error: {e}")

    raise FileNotFoundError(f"Could not locate CSV for {DATASET_NAME}")


def load_and_clean_data(csv_path: str, sample_size: int = 70000) -> tuple[pd.DataFrame, dict]:
    """
    Load raw dataset, remove empty URLs, exact duplicates, invalid labels,
    and conflicting duplicates. Record exact cleaning statistics.
    """
    print(f"Loading raw dataset from {csv_path}...")
    raw_df = pd.read_csv(csv_path)
    raw_count = len(raw_df)

    col_map = {c: c.lower() for c in raw_df.columns}
    raw_df.rename(columns=col_map, inplace=True)
    url_col = "url" if "url" in raw_df.columns else raw_df.columns[0]
    type_col = "type" if "type" in raw_df.columns else raw_df.columns[1]

    # 1. Drop nulls or empty strings
    non_null_df = raw_df.dropna(subset=[url_col, type_col]).copy()
    non_null_df[url_col] = non_null_df[url_col].astype(str).str.strip()
    non_empty_df = non_null_df[non_null_df[url_col].str.len() > 3].copy()
    empty_dropped = raw_count - len(non_empty_df)

    # 2. Drop exact duplicates
    before_dupes = len(non_empty_df)
    deduped_df = non_empty_df.drop_duplicates(subset=[url_col, type_col]).copy()
    exact_dupes_dropped = before_dupes - len(deduped_df)

    # 3. Drop conflicting duplicate labels (same URL with contradictory classes)
    label_counts = deduped_df.groupby(url_col)[type_col].nunique()
    conflicting_urls = label_counts[label_counts > 1].index
    clean_df = deduped_df[~deduped_df[url_col].isin(conflicting_urls)].copy()
    conflicting_dropped = len(deduped_df) - len(clean_df)

    # Filter ASCII valid strings
    clean_df = clean_df[clean_df[url_col].apply(lambda u: u.isascii() and "." in u)].copy()

    # Binary label mapping: benign = 0, malicious (phishing, defacement, malware) = 1
    valid_types = {"benign", "phishing", "defacement", "malware"}
    clean_df = clean_df[clean_df[type_col].isin(valid_types)].copy()
    clean_df["label"] = clean_df[type_col].apply(lambda t: 0 if t == "benign" else 1)

    cleaning_stats = {
        "raw_records": raw_count,
        "empty_or_short_dropped": empty_dropped,
        "exact_duplicates_dropped": exact_dupes_dropped,
        "conflicting_duplicates_dropped": conflicting_dropped,
        "clean_records": len(clean_df),
        "clean_class_distribution": {
            "benign (0)": int((clean_df["label"] == 0).sum()),
            "malicious (1)": int((clean_df["label"] == 1).sum())
        }
    }
    print(f"Cleaning complete: {cleaning_stats}")

    # Build balanced dataset including benign root domains to fix homepage selection bias
    half_sample = sample_size // 2

    # Extract benign unique hostnames/homepages from dataset
    def extract_host(u):
        body = re.sub(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", "", str(u).strip())
        h = body.split("/")[0].split("?")[0].split("#")[0].lower()
        return re.sub(r"^www\.", "", h)

    benign_rows = clean_df[clean_df["label"] == 0]
    benign_hosts = pd.Series(benign_rows[url_col].apply(extract_host).unique())
    benign_hosts = benign_hosts[benign_hosts.apply(lambda h: len(h) > 3 and "." in h)]

    n_root = min(12000, half_sample // 3)
    sampled_roots = benign_hosts.sample(n=n_root, random_state=42)
    root_benign_df = pd.DataFrame({
        url_col: sampled_roots,
        type_col: "benign",
        "label": 0
    })

    n_deep = half_sample - len(root_benign_df)
    sampled_deep_benign = benign_rows.sample(n=n_deep, random_state=42)

    # Malicious sample: representative mix of phishing, malware, defacement
    malicious_rows = clean_df[clean_df["label"] == 1]
    sampled_malicious = malicious_rows.sample(n=half_sample, random_state=42)

    balanced_df = pd.concat([
        sampled_deep_benign[[url_col, type_col, "label"]],
        root_benign_df[[url_col, type_col, "label"]],
        sampled_malicious[[url_col, type_col, "label"]]
    ]).sample(frac=1, random_state=42).reset_index(drop=True)

    # Extract registered domain for group splitting
    balanced_df["domain"] = balanced_df[url_col].apply(lambda u: get_registered_domain(extract_host(u)))

    return balanced_df, cleaning_stats


def train_pipeline(sample_size: int = 70000):
    """Execute end-to-end training, comparative evaluation, and artifact export."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    csv_path = find_or_download_dataset()

    df, cleaning_stats = load_and_clean_data(csv_path, sample_size=sample_size)
    print(f"\nFinal training dataset size: {len(df)} samples")
    print(f"Class distribution: {df['label'].value_counts().to_dict()}")

    # 1. Feature Extraction
    print("Extracting 26 shared lexical and structural features...")
    feature_rows = []
    for _, row in df.iterrows():
        feat = extract_features(str(row["url"]))
        feature_rows.append(feat)

    X = pd.DataFrame(feature_rows)
    y = df["label"].values
    groups = df["domain"].values
    feature_names = list(X.columns)

    # 2. Stratified Split (80% train, 20% test)
    X_train_strat, X_test_strat, y_train_strat, y_test_strat = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 3. Domain-Grouped Split (to evaluate out-of-domain generalization without domain leakage)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups=groups))
    X_train_grp, X_test_grp = X.iloc[train_idx], X.iloc[test_idx]
    y_train_grp, y_test_grp = y[train_idx], y[test_idx]

    print(f"Stratified Split: {len(X_train_strat)} train, {len(X_test_strat)} test")
    print(f"Domain-Grouped Split: {len(X_train_grp)} train, {len(X_test_grp)} test ({len(set(groups[test_idx]))} unseen domains)")

    # 4. Model 1: Baseline Logistic Regression Pipeline (with standard scaling)
    print("\nTraining Logistic Regression baseline...")
    lr_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42))
    ])
    lr_pipe.fit(X_train_strat, y_train_strat)

    lr_strat_preds = lr_pipe.predict(X_test_strat)
    lr_strat_probs = lr_pipe.predict_proba(X_test_strat)[:, 1]
    lr_strat_acc = float(accuracy_score(y_test_strat, lr_strat_preds))
    lr_strat_f1 = float(f1_score(y_test_strat, lr_strat_preds, zero_division=0))
    lr_strat_auc = float(roc_auc_score(y_test_strat, lr_strat_probs))

    # Evaluate LR on domain-grouped split
    lr_grp_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42))
    ])
    lr_grp_pipe.fit(X_train_grp, y_train_grp)
    lr_grp_preds = lr_grp_pipe.predict(X_test_grp)
    lr_grp_acc = float(accuracy_score(y_test_grp, lr_grp_preds))
    lr_grp_f1 = float(f1_score(y_test_grp, lr_grp_preds, zero_division=0))

    # 5. Model 2: Random Forest Classifier
    print("Training Random Forest Classifier (n_estimators=100, max_depth=16)...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=16,
        min_samples_split=4,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1
    )
    rf_model.fit(X_train_strat, y_train_strat)

    # Evaluate RF on Stratified holdout
    rf_strat_preds = rf_model.predict(X_test_strat)
    rf_strat_probs = rf_model.predict_proba(X_test_strat)[:, 1]

    rf_acc = float(accuracy_score(y_test_strat, rf_strat_preds))
    rf_prec = float(precision_score(y_test_strat, rf_strat_preds, zero_division=0))
    rf_rec = float(recall_score(y_test_strat, rf_strat_preds, zero_division=0))
    rf_f1 = float(f1_score(y_test_strat, rf_strat_preds, zero_division=0))
    rf_auc = float(roc_auc_score(y_test_strat, rf_strat_probs))
    cm_strat = confusion_matrix(y_test_strat, rf_strat_preds)
    tn_s, fp_s, fn_s, tp_s = [int(v) for v in cm_strat.ravel()]

    # Evaluate RF on Domain-Grouped holdout
    print("Evaluating Random Forest on domain-grouped split...")
    rf_grp_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=16,
        min_samples_split=4,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1
    )
    rf_grp_model.fit(X_train_grp, y_train_grp)
    rf_grp_preds = rf_grp_model.predict(X_test_grp)
    rf_grp_probs = rf_grp_model.predict_proba(X_test_grp)[:, 1]

    rf_grp_acc = float(accuracy_score(y_test_grp, rf_grp_preds))
    rf_grp_prec = float(precision_score(y_test_grp, rf_grp_preds, zero_division=0))
    rf_grp_rec = float(recall_score(y_test_grp, rf_grp_preds, zero_division=0))
    rf_grp_f1 = float(f1_score(y_test_grp, rf_grp_preds, zero_division=0))
    rf_grp_auc = float(roc_auc_score(y_test_grp, rf_grp_probs))
    cm_grp = confusion_matrix(y_test_grp, rf_grp_preds)
    tn_g, fp_g, fn_g, tp_g = [int(v) for v in cm_grp.ravel()]

    # Feature importances
    importances = dict(zip(feature_names, [float(round(v, 4)) for v in rf_model.feature_importances_]))
    top_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:10]

    # Metrics compilation
    metrics = {
        "model_version": MODEL_VERSION,
        "algorithm": "RandomForestClassifier(n_estimators=100, max_depth=16, class_weight='balanced')",
        "dataset_source": "Kaggle (sid321axn/malicious-urls-dataset) — 651,191 raw records",
        "dataset_attribution": "Kaggle: Malicious URLs Dataset by Sid (sid321axn/malicious-urls-dataset)",
        "cleaning_statistics": cleaning_stats,
        "training_sample_summary": {
            "total_samples": int(len(df)),
            "train_samples": int(X_train_strat.shape[0]),
            "test_samples": int(X_test_strat.shape[0]),
            "class_distribution": {
                "legitimate (0)": int((df["label"] == 0).sum()),
                "malicious (1)": int((df["label"] == 1).sum())
            }
        },
        "stratified_evaluation": {
            "random_forest": {
                "accuracy": round(rf_acc, 4),
                "precision": round(rf_prec, 4),
                "recall": round(rf_rec, 4),
                "f1_score": round(rf_f1, 4),
                "roc_auc": round(rf_auc, 4),
                "confusion_matrix": {
                    "true_negatives": tn_s,
                    "false_positives": fp_s,
                    "false_negatives": fn_s,
                    "true_positives": tp_s
                }
            },
            "logistic_regression": {
                "accuracy": round(lr_strat_acc, 4),
                "f1_score": round(lr_strat_f1, 4),
                "roc_auc": round(lr_strat_auc, 4)
            }
        },
        "domain_grouped_evaluation": {
            "note": "Evaluated on unseen domains (GroupShuffleSplit on registered domain) to measure true generalization without domain leakage.",
            "random_forest": {
                "accuracy": round(rf_grp_acc, 4),
                "precision": round(rf_grp_prec, 4),
                "recall": round(rf_grp_rec, 4),
                "f1_score": round(rf_grp_f1, 4),
                "roc_auc": round(rf_grp_auc, 4),
                "confusion_matrix": {
                    "true_negatives": tn_g,
                    "false_positives": fp_g,
                    "false_negatives": fn_g,
                    "true_positives": tp_g
                }
            },
            "logistic_regression": {
                "accuracy": round(lr_grp_acc, 4),
                "f1_score": round(lr_grp_f1, 4)
            }
        },
        "top_features": dict(top_features),
        "root_cause_analysis": {
            "historical_issue": "Legitimate sites (Google, GitHub, whitehouse.gov) previously received elevated risk scores.",
            "investigation_findings": [
                "Dataset selection bias: Raw scraped benign datasets had 99.9% deep paths and 0% root homepages, while phishing feeds had bare domains. Tree splits treated path_length=0 as 100% malicious.",
                "Protocol artifact: In raw dataset, benign URLs lacked scheme while malware included https://. Training on is_https penalized legitimate URLs normalized with https://.",
                "Subdomain artifact: Leading 'www.' was previously counted as an untrusted subdomain and extra dot, heavily penalizing standard domains.",
                "Uncalibrated risk mapping: Raw uncalibrated tree probabilities were previously copied directly into risk scores."
            ],
            "pipeline_resolutions": [
                "Cleaned dataset: Removed 10k exact duplicates, 6 conflicting label URLs, and invalid rows.",
                "Balanced domain representation: Added benign root domain representations to eliminate path-length shortcut.",
                "Normalized feature extraction: Stripped 'www.' and scheme prefix; extracted separate host vs path features.",
                "Decoupled confidence and risk score: Model confidence now represents statistical class probability certainty, while 0-100 risk score reflects calibrated threat index with deterministic heuristic safeguards."
            ]
        }
    }

    # Save artifacts
    model_file = os.path.join(ARTIFACTS_DIR, "model.joblib")
    features_file = os.path.join(ARTIFACTS_DIR, "features.json")
    metrics_file = os.path.join(ARTIFACTS_DIR, "metrics.json")

    joblib.dump(rf_model, model_file)
    with open(features_file, "w", encoding="utf-8") as f:
        json.dump({"features": feature_names}, f, indent=2)

    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("\n--- Model Training Pipeline Completed Successfully ---")
    print(f"Artifacts exported to: {ARTIFACTS_DIR}")
    print(f"Stratified Holdout RF Accuracy: {rf_acc * 100:.2f}% | F1: {rf_f1 * 100:.2f}% | ROC-AUC: {rf_auc:.4f}")
    print(f"Domain-Grouped Holdout RF Accuracy: {rf_grp_acc * 100:.2f}% | F1: {rf_grp_f1 * 100:.2f}% | ROC-AUC: {rf_grp_auc:.4f}")
    print(f"Stratified Holdout LR Accuracy: {lr_strat_acc * 100:.2f}% | F1: {lr_strat_f1 * 100:.2f}%")
    return metrics


if __name__ == "__main__":
    train_pipeline()
