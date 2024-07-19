from random import randint
from statistics import mode

def predict_next_number(sequence):
    if not sequence:
        return None
    
    # Method 1: Average method
    average = sum(sequence) / len(sequence)
    
    # Method 2: Mode method
    try:
        most_common = mode(sequence)
    except StatisticsError:
        most_common = None
    
    return average, most_common

# Generate a sequence of 10 random numbers between 1 and 20
sequence = [randint(1, 20) for _ in range(11)]
print(sequence)
sequence = sequence[:-1]
print("Generated sequence:", sequence)

# Predict next number using average and mode methods
average_prediction, mode_prediction = predict_next_number(sequence)
print("Average prediction:", average_prediction)
print("Mode prediction:", mode_prediction)
