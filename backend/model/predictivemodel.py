import os
import pandas as pd
import numpy as np


# -----------------------------
# 1. LOAD ZHVI DATA
# -----------------------------

BASE_DIR = os.path.dirname(__file__)
CSV_PATH = os.path.join(BASE_DIR, "../data/data.csv")

df = pd.read_csv(CSV_PATH)

# -----------------------------
# 2. FILTER TO ONE ZIP
# -----------------------------

TARGET_ZIP = 92617

zip_row = df[df["RegionName"] == TARGET_ZIP]

if zip_row.empty:
    raise ValueError(f"ZIP {TARGET_ZIP} not found in dataset")

price_data = zip_row.iloc[:, 9:]

price_series = price_data.values.flatten()
price_series = price_series.astype(float)

price_series = price_series[~np.isnan(price_series)]

if len(price_series) > 120:
    price_series = price_series[-120:]

# -----------------------------
# 3. COMPUTE MONTHLY RETURNS
# -----------------------------

returns = (price_series[1:] / price_series[:-1]) - 1

mu = np.mean(returns)
sigma = np.std(returns)

print("------ Historical Stats ------")
print(f"Mean Monthly Return: {mu:.6f}")
print(f"Volatility (Std Dev): {sigma:.6f}")


# -----------------------------
# 4. MONTE CARLO SIMULATION
# -----------------------------

def run_simulation(current_price, mu, sigma, years=5, simulations=1000):
    months = years * 12
    final_prices = []

    for _ in range(simulations):
        price = current_price

        for _ in range(months):
            random_return = np.random.normal(mu, sigma)
            price *= (1 + random_return)

        final_prices.append(price)

    return np.array(final_prices)


# -----------------------------
# 5. RUN FORECAST
# -----------------------------

current_price = price_series[-1]

results = run_simulation(
    current_price=current_price,
    mu=mu,
    sigma=sigma,
    years=5,
    simulations=1000
)

# -----------------------------
# 6. OUTPUT METRICS
# -----------------------------

p10 = np.percentile(results, 10)
p50 = np.percentile(results, 50)
p90 = np.percentile(results, 90)

prob_downside = np.mean(results < current_price)

print("\n------ 5 Year Forecast ------")
print(f"Current Price: ${current_price:,.0f}")
print(f"P10 (Low Case): ${p10:,.0f}")
print(f"P50 (Median): ${p50:,.0f}")
print(f"P90 (High Case): ${p90:,.0f}")
print(f"Probability of Downside: {prob_downside * 100:.2f}%")