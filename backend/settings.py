from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "accident_data.csv"
ARTIFACT_DIR = BASE_DIR / "backend" / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "severity_model.joblib"
METADATA_PATH = ARTIFACT_DIR / "severity_metadata.json"
OPTIONS_PATH = ARTIFACT_DIR / "options.json"
SUMMARY_PATH = ARTIFACT_DIR / "summary.json"
