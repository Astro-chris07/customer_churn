# Define dummy class to allow loading
class UniversalFeatureMapper:
    pass

import sys
import pickle
# Ensure the class is available in __main__ namespace if that's where it was expected
setattr(sys.modules['__main__'], 'UniversalFeatureMapper', UniversalFeatureMapper)

with open('inspection_result.txt', 'w', encoding='utf-8') as log:
    try:
        log.write("Attempting to load model...\n")
        with open('c:/Users/CHRISTEEN/Desktop/customer_churn/universal_churn_model.pkl', 'rb') as f:
            model = pickle.load(f)
        
        log.write(f"Successfully loaded model wrapper: {type(model)}\n")
        log.write("Attributes of the loaded object:\n")
        for attr in dir(model):
            if not attr.startswith('__'):
                val = getattr(model, attr)
                log.write(f" - {attr}: {type(val)}\n")
                if attr in ['model', 'estimator', 'clf']:
                    if hasattr(val, 'feature_names_in_'):
                        log.write(f"   -> Underlying feature names: {val.feature_names_in_}\n")
                    if hasattr(val, 'classes_'):
                         log.write(f"   -> Classes: {val.classes_}\n")

    except Exception as e:
        log.write(f"Error loading model with mock: {e}\n")
