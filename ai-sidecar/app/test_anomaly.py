import json
from anomaly_guard import analyze_expense_patterns

# The user's historical database records
historical_data = [
    {"date": "2026-05-01", "merchant": "Delta", "amount": 350.00, "category": "Travel"},
    {"date": "2026-05-15", "merchant": "Uber", "amount": 25.50, "category": "Local Transport"},
    {"date": "2026-05-16", "merchant": "Uber", "amount": 28.00, "category": "Local Transport"},
    {"date": "2026-05-18", "merchant": "Lyft", "amount": 22.00, "category": "Local Transport"}
]

# The anomaly: A $150 ride when the average is ~$25
new_expense = {
    "date": "2026-05-28", 
    "merchant": "Uber Black", 
    "amount": 150.00, 
    "category": "Local Transport"
}

print("--- RUNNING ANOMALY GUARD ---")
result = analyze_expense_patterns(new_expense, historical_data)
print(json.dumps(result, indent=2))