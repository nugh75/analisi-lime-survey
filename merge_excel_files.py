import os
import re
import pandas as pd

# Directory containing the Excel files
folder = os.path.dirname(os.path.abspath(__file__))

# Regex to extract the numeric part from the filename
pattern = re.compile(r'results-survey(\d+)\.xlsx')

# List to hold DataFrames
dfs = []

for filename in os.listdir(folder):
    match = pattern.match(filename)
    if match:
        number = match.group(1)
        filepath = os.path.join(folder, filename)
        df = pd.read_excel(filepath)
        df['file_number'] = number
        dfs.append(df)

if dfs:
    merged_df = pd.concat(dfs, ignore_index=True)
    merged_df.to_excel('merged_results.xlsx', index=False)
    print('File unito salvato come merged_results.xlsx')
else:
    print('Nessun file Excel trovato.')
