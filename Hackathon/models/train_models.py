import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# Define file paths for datasets (assuming they are downloaded and placed in a 'data' directory)
DIABETES_DATA_PATH = 'data/diabetes.csv'
HYPERTENSION_DATA_PATH = 'data/hypertension.csv'
ANEMIA_DATA_PATH = 'data/anemia.csv'

# Define output paths for trained models
DIABETES_MODEL_PATH = 'models/diabetes_model.pkl'
HYPERTENSION_MODEL_PATH = 'models/hypertension_model.pkl'
ANEMIA_MODEL_PATH = 'models/anemia_model.pkl'

def train_diabetes_model():
    """Trains and saves a Random Forest model for diabetes prediction."""
    # Load the dataset
    df = pd.read_csv(DIABETES_DATA_PATH)

    # Prepare the data
    X = df.drop('Outcome', axis=1)
    y = df['Outcome']

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train the model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate the model
    y_pred = model.predict(X_test)
    print(f"Diabetes model accuracy: {accuracy_score(y_test, y_pred)}")

    # Save the model
    joblib.dump(model, DIABETES_MODEL_PATH)
    print(f"Diabetes model saved to {DIABETES_MODEL_PATH}")

def train_hypertension_model():
    """Trains and saves a Random Forest model for hypertension prediction."""
    # Load the dataset
    df = pd.read_csv(HYPERTENSION_DATA_PATH)

    # Prepare the data (assuming similar structure to diabetes dataset)
    X = df.drop('target', axis=1)
    y = df['target']

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train the model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate the model
    y_pred = model.predict(X_test)
    print(f"Hypertension model accuracy: {accuracy_score(y_test, y_pred)}")

    # Save the model
    joblib.dump(model, HYPERTENSION_MODEL_PATH)
    print(f"Hypertension model saved to {HYPERTENSION_MODEL_PATH}")

def train_anemia_model():
    """Trains and saves a Random Forest model for anemia prediction."""
    # Load the dataset
    df = pd.read_csv(ANEMIA_DATA_PATH)

    # Prepare the data (assuming similar structure to diabetes dataset)
    X = df.drop('Result', axis=1)
    y = df['Result']

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train the model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate the model
    y_pred = model.predict(X_test)
    print(f"Anemia model accuracy: {accuracy_score(y_test, y_pred)}")

    # Save the model
    joblib.dump(model, ANEMIA_MODEL_PATH)
    print(f"Anemia model saved to {ANEMIA_MODEL_PATH}")

if __name__ == '__main__':
    # Realistic dummy data for Diabetes (PIMA inspired)
    diabetes_data = []
    for _ in range(200):
        glucose = 80 + (pd.Series([0, 1]).sample().iloc[0] * 80) + (pd.Series(range(40)).sample().iloc[0])
        outcome = 1 if glucose > 140 else 0
        diabetes_data.append({
            'Pregnancies': pd.Series(range(10)).sample().iloc[0],
            'Glucose': glucose,
            'BloodPressure': 60 + pd.Series(range(40)).sample().iloc[0],
            'SkinThickness': 20 + pd.Series(range(30)).sample().iloc[0],
            'Insulin': 0 + pd.Series(range(200)).sample().iloc[0],
            'BMI': 20 + pd.Series(range(25)).sample().iloc[0],
            'DiabetesPedigreeFunction': 0.1 + (pd.Series(range(100)).sample().iloc[0] / 100),
            'Age': 20 + pd.Series(range(60)).sample().iloc[0],
            'Outcome': outcome
        })
    pd.DataFrame(diabetes_data).to_csv(DIABETES_DATA_PATH, index=False)

    # Realistic dummy data for Hypertension
    htn_data = []
    for _ in range(200):
        trestbps = 100 + (pd.Series([0, 1]).sample().iloc[0] * 40) + (pd.Series(range(20)).sample().iloc[0])
        target = 1 if trestbps > 135 else 0
        htn_data.append({
            'age': 20 + pd.Series(range(60)).sample().iloc[0],
            'sex': pd.Series([0, 1]).sample().iloc[0],
            'cp': pd.Series(range(4)).sample().iloc[0],
            'trestbps': trestbps,
            'chol': 180 + pd.Series(range(100)).sample().iloc[0],
            'fbs': pd.Series([0, 1]).sample().iloc[0],
            'restecg': pd.Series(range(3)).sample().iloc[0],
            'thalach': 100 + pd.Series(range(100)).sample().iloc[0],
            'exang': pd.Series([0, 1]).sample().iloc[0],
            'oldpeak': pd.Series(range(5)).sample().iloc[0] * 0.5,
            'slope': pd.Series(range(3)).sample().iloc[0],
            'ca': pd.Series(range(5)).sample().iloc[0],
            'thal': pd.Series(range(4)).sample().iloc[0],
            'target': target
        })
    pd.DataFrame(htn_data).to_csv(HYPERTENSION_DATA_PATH, index=False)

    # Realistic dummy data for Anemia
    anemia_data = []
    for _ in range(200):
        gender = pd.Series([0, 1]).sample().iloc[0]
        hb = 8 + (pd.Series([0, 1]).sample().iloc[0] * 6) + (pd.Series(range(4)).sample().iloc[0])
        # Threshold: Male (1) < 13, Female (0) < 12
        threshold = 13 if gender == 1 else 12
        result = 1 if hb < threshold else 0
        anemia_data.append({
            'Gender': gender,
            'Hemoglobin': hb,
            'MCH': 25 + pd.Series(range(10)).sample().iloc[0],
            'MCHC': 30 + pd.Series(range(5)).sample().iloc[0],
            'MCV': 80 + pd.Series(range(20)).sample().iloc[0],
            'Result': result
        })
    pd.DataFrame(anemia_data).to_csv(ANEMIA_DATA_PATH, index=False)

    train_diabetes_model()
    train_hypertension_model()
    train_anemia_model()
