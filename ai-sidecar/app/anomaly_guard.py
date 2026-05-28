import statistics

def analyze_expense_patterns(new_expense, historical_data):
    # 1. Isolate the relevant historical category
    category = new_expense.get("category")
    category_amounts = [
        item["amount"] for item in historical_data 
        if item.get("category") == category
    ]

    # 2. Baseline checks
    if len(category_amounts) < 2:
        return {
            "is_anomaly": False,
            "risk_level": "LOW",
            "reason": f"Not enough historical data for {category} to establish a baseline."
        }

    # 3. The Math (Mean and Standard Deviation)
    mean_amount = statistics.mean(category_amounts)
    std_dev = statistics.stdev(category_amounts) if len(category_amounts) > 1 else 0

    new_amount = new_expense.get("amount")

    # 4. Anomaly Threshold (Flagging anything > 2 standard deviations from the mean)
    threshold = mean_amount + (2 * std_dev)

    if new_amount > threshold:
        return {
            "is_anomaly": True,
            "risk_level": "HIGH",
            "reason": f"Amount ${new_amount:.2f} significantly exceeds the historical {category} average of ${mean_amount:.2f}."
        }
    
    return {
        "is_anomaly": False,
        "risk_level": "LOW",
        "reason": "Expense falls within normal statistical variance."
    }