import pandas as pd
import joblib
from sklearn.base import BaseEstimator, TransformerMixin
import os

# ==============================
# 1. Custom Transformer
# ==============================
class UniversalFeatureMapper(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = X.copy()
        U = pd.DataFrame(index=X.index)

        # Numeric helper
        def pick_numeric(cols):
            for c in cols:
                if c in X.columns:
                    return pd.to_numeric(X[c], errors="coerce")
            return pd.Series(0, index=X.index)

        # Categorical helper
        def pick_categorical(cols):
            for c in cols:
                if c in X.columns:
                    return X[c].astype(str).str.strip().replace("", "unknown").fillna("unknown")
            return pd.Series("unknown", index=X.index)

        # Map features
        U["tenure_months"] = pick_numeric(["tenure", "tenure_months", "months_active"])
        U["avg_monthly_spend"] = pick_numeric(["monthlycharges", "monthly_charges", "avg_monthly_spend", "monthly_fee"])
        U["usage_intensity"] = pick_numeric(["totalcharges", "data_usage", "usage_score"])
        U["support_interactions"] = pick_numeric(["support_calls", "complaints", "tickets"])
        U["engagement_score"] = pick_numeric(["engagement", "activity_score", "sessions"])

        U["contract_type"] = pick_categorical(["contract", "contract_type", "plan"])
        U["payment_issues"] = pick_categorical(["payment_issues", "late_payment", "billing_problem"])

        U.fillna(0, inplace=True)
        return U

# ==============================
# 2. Model Loader
# ==============================
import sys
# Hack: Inject class into __main__ so pickle can find it if it was saved from a script/notebook as __main__
setattr(sys.modules['__main__'], 'UniversalFeatureMapper', UniversalFeatureMapper)

# Hack: Monkeypatch sklearn for backward compatibility
try:
    import sklearn.compose._column_transformer
    if not hasattr(sklearn.compose._column_transformer, '_RemainderColsList'):
        class _RemainderColsList(list):
             def __repr__(self):
                 return "remainder"
        sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList
    print("Patched sklearn._RemainderColsList")
except Exception as e:
    print(f"Failed to patch sklearn: {e}")

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "universal_churn_model.pkl")
_model = None

def get_model():
    global _model
    if _model is None:
        try:
            _model = joblib.load(MODEL_PATH)
            print("Model loaded successfully")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise e
    return _model

def predict(df: pd.DataFrame):
     # Normalize column names
    df.columns = df.columns.str.lower().str.replace(" ", "_")
    
    # Remove targets if present
    df = df.drop(columns=["churn", "churned", "exited"], errors="ignore")
    
    model = get_model()
    
    # Predict
    # The pipeline likely includes the mapper, but if the model in pkl is JUST the estimator, we need to apply mapper first.
    # However, the user code suggests `model.predict_proba(data)` works directly on the raw dataframe?
    # Wait, the user code has the mapper *defined* but then later does `model = joblib.load(...)` and then `model.predict_proba(data)`.
    # This implies the `UniversalFeatureMapper` is INSIDE the pipeline stored in the pickle.
    # So we just pass the raw dataframe to predict_proba.
    
    probabilities = model.predict_proba(df)[:, 1]
    
    # Threshold
    threshold = 0.30
    predictions = (probabilities >= threshold).astype(int)
    
    return probabilities, predictions
