import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import xgboost as xgb

df = pd.read_csv("realtime_orderbook.csv")

# Features engineering
df['mid_price_diff'] = df['mid_price'].diff().fillna(0)
df['spread_ratio'] = df['spread'] / df['mid_price']

# Encode 'side' column: buy=1, sell=0
df['side_encoded'] = df['side'].map({'buy': 1, 'sell': 0})

df['actual_slippage'] = df['sim_price'] - df['mid_price']

feature_cols = ['order_size', 'spread', 'volatility', 'mid_price_diff', 'spread_ratio', 'side_encoded']

df = df.dropna(subset=feature_cols + ['actual_slippage'])

X = df[feature_cols]
y = df['actual_slippage']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = xgb.XGBRegressor(random_state=42, n_estimators=100, max_depth=4)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)

print("MSE:", mean_squared_error(y_test, y_pred))
print("R^2:", r2_score(y_test, y_pred))

joblib.dump(model, "slippage_model.pkl")
print("XGBoost model trained and saved!")
