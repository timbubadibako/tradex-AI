# Implementation Plan: Advanced BTC/IDR AI Model (CNN-LSTM-Attention)

## Phase 1: Environment & Data Loading
- Check/Install necessary libraries: `tensorflow`, `pandas`, `numpy`, `ta`, `matplotlib`, `sklearn`.
- Load `btc_idr_1h_5years.csv`.
- Handle missing values and basic data cleaning.

## Phase 2: Feature Engineering (Indonesian Documentation)
- Calculate technical indicators:
    - Momentum: RSI, Stochastic (%K, %D).
    - Trend: MACD, MACD Signal.
    - Volatility: Bollinger Bands, ATR.
    - Volume: OBV.
- Document each indicator's purpose in Indonesian.

## Phase 3: Preprocessing
- Scaling using `MinMaxScaler`.
- Windowing (Sequence Length = 60).
- Time-based Split (80/10/10).
- Reshaping for CNN/LSTM input.

## Phase 4: Model Architecture (The "Advanced" Part)
- Define a custom Attention Layer or use a simplified version.
- Build Sequential/Functional model:
    - Conv1D -> MaxPooling1D.
    - LSTM (return_sequences=True).
    - Attention Layer.
    - GlobalAveragePooling1D or Flatten.
    - Dense -> Dropout -> Dense (Output).
- Add Indonesian comments explaining why these layers are used.

## Phase 5: Training & Tuning Guide
- Compile with Adam optimizer.
- Add EarlyStopping callback.
- Create a Markdown cell in the notebook listing "Parameter yang bisa diubah" (Hyperparameters):
    - `learning_rate`
    - `batch_size`
    - `sequence_length`
    - `filters` in Conv1D
    - `units` in LSTM
    - `dropout_rate`

## Phase 6: Evaluation & Visualization
- Predict on test set.
- Inverse transform predictions.
- Calculate metrics (MAE, RMSE, MAPE).
- Plot results (Real vs Predicted).

## Phase 7: Final Review
- Ensure Indonesian documentation is clear and professional.
- Save as `AI_Trading_Advanced_V2.ipynb`.
