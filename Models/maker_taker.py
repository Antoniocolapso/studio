import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.utils import resample
import xgboost as xgb
import matplotlib
# Load data
df = pd.read_csv("realtime_orderbook.csv")

# Basic sanity check
print(df.columns)

# Create new features
df['mid_price_diff'] = df['mid_price'].diff().fillna(0)  # momentum: price change between ticks

# Sum of top 5 bids and asks if you have them, else approximate by order_size * 5 (dummy)
# Here assuming you have only top 1 ask and bid sizes, so:
df['sum_asks'] = df['order_size'] * 5
df['sum_bids'] = df['order_size'] * 5

# Create spread ratio (spread / mid_price) - normalized spread
df['spread_ratio'] = df['spread'] / df['mid_price']

# Drop rows with missing labels or NaNs
df = df.dropna(subset=['is_taker', 'spread', 'order_size', 'volatility', 'mid_price_diff', 'spread_ratio'])

# Balance classes if imbalanced
print("Class distribution before balancing:")
print(df['is_taker'].value_counts())

df_majority = df[df.is_taker == 0]
df_minority = df[df.is_taker == 1]

if len(df_minority) < len(df_majority):
    df_minority_upsampled = resample(df_minority,
                                     replace=True,
                                     n_samples=len(df_majority),
                                     random_state=42)
    df_balanced = pd.concat([df_majority, df_minority_upsampled])
else:
    df_balanced = df

print("Class distribution after balancing:")
print(df_balanced['is_taker'].value_counts())

# Features and target
feature_cols = ["spread", "order_size", "volatility", "mid_price_diff", "spread_ratio", "sum_asks", "sum_bids"]
X = df_balanced[feature_cols]
y = df_balanced["is_taker"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Train XGBoost classifier
model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)
model.fit(X_train, y_train)

# Predict and evaluate
y_pred = model.predict(X_test)

# Save model to file
model.save_model("maker_taker_xgb_model.json")
print("Model saved to maker_taker_xgb_model.json")



print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# Feature importances
import matplotlib.pyplot as plt
xgb.plot_importance(model, importance_type='gain')
plt.show()



# import xgboost as xgb

# # Load model from file
# loaded_model = xgb.XGBClassifier()
# loaded_model.load_model("maker_taker_xgb_model.json")

# # Now you can use loaded_model.predict(...) as usual
