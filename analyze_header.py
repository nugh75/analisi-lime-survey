import os
import re
import sys
import json
import unicodedata
import pandas as pd
from typing import List, Dict

# Percorso del file merge nella stessa cartella dello script
FILENAME = "merged_results.xlsx"


def remove_diacritics(s: str) -> str:
    if not isinstance(s, str):
        s = str(s)
    nfkd_form = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in nfkd_form if not unicodedata.combining(ch))


def normalize_name(s: str) -> str:
    """Normalizza il nome colonna per rilevare duplicati logici.
    - lower
    - strip
    - rimozione diacritici
    - collapse whitespace
    - rimozione caratteri non alfanumerici
    """
    if s is None:
        return ""
    s = str(s)
    s = remove_diacritics(s).lower().strip()
    # normalizza spazi multipli
    s = re.sub(r"\s+", " ", s)
    # rimuovi tutto tranne alfanumerici
    s = re.sub(r"[^0-9a-z]", "", s)
    return s


def main():
    folder = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(folder, FILENAME)

    if not os.path.exists(path):
        print(f"File non trovato: {path}", file=sys.stderr)
        sys.exit(1)

    # Leggi solo l'intestazione rapidamente per lista colonne
    try:
        # Carico tutto per statistiche successive
        df = pd.read_excel(path)
    except Exception as e:
        print(f"Errore leggendo {FILENAME}: {e}", file=sys.stderr)
        sys.exit(1)

    columns = list(df.columns)

    # Costruisci analisi intestazioni
    norm_map: Dict[str, List[str]] = {}
    normalized_list: List[str] = []
    for col in columns:
        n = normalize_name(col)
        normalized_list.append(n)
        norm_map.setdefault(n, []).append(str(col))

    duplicates_groups = {k: v for k, v in norm_map.items() if len(v) > 1 and k != ""}

    # Statistiche per colonna
    analysis_rows = []
    total_rows = len(df)
    for col, norm in zip(columns, normalized_list):
        s = df[col]
        non_null = int(s.notna().sum())
        nulls = int(s.isna().sum())
        non_null_pct = (non_null / total_rows * 100.0) if total_rows > 0 else 0.0
        dtype = str(s.dtype)
        # numero di valori unici non nulli (limitato a evitare costi eccessivi)
        try:
            unique_count = int(s.dropna().nunique())
        except Exception:
            unique_count = -1
        # esempi: primi 3 valori non nulli distinti
        try:
            examples = s.dropna().astype(str).unique().tolist()[:3]
        except Exception:
            examples = []

        analysis_rows.append({
            "original_name": str(col),
            "normalized_name": norm,
            "is_duplicate_normalized": norm in duplicates_groups,
            "dtype": dtype,
            "row_count": total_rows,
            "non_null_count": non_null,
            "null_count": nulls,
            "non_null_pct": round(non_null_pct, 2),
            "unique_count_non_null": unique_count,
            "sample_values": ", ".join(examples),
        })

    analysis_df = pd.DataFrame(analysis_rows)
    analysis_csv = os.path.join(folder, "header_analysis.csv")
    analysis_df.to_csv(analysis_csv, index=False)

    # Copertura per file, se presente colonna file_number
    coverage_csv = None
    if "file_number" in df.columns:
        long_rows = []
        for file_num, g in df.groupby("file_number", dropna=False):
            g_count = len(g)
            for col in columns:
                if col == "file_number":
                    continue
                non_null = int(g[col].notna().sum())
                pct = (non_null / g_count * 100.0) if g_count > 0 else 0.0
                long_rows.append({
                    "file_number": file_num,
                    "column": str(col),
                    "non_null_pct": round(pct, 2),
                    "non_null_count": non_null,
                    "rows_in_file": g_count,
                })
        coverage_df = pd.DataFrame(long_rows)
        coverage_csv = os.path.join(folder, "header_coverage_by_file.csv")
        coverage_df.to_csv(coverage_csv, index=False)

    # Stampa sommario leggibile
    print("Analisi intestazioni completata")
    print(f"- File sorgente: {FILENAME}")
    print(f"- Numero colonne: {len(columns)}")
    if duplicates_groups:
        print(f"- Duplicati (normalizzati) trovati: {len(duplicates_groups)} gruppi")
        for k, v in list(duplicates_groups.items())[:10]:
            print("  *", ", ".join(v))
        if len(duplicates_groups) > 10:
            print("  ...")
    else:
        print("- Nessun duplicato normalizzato tra i nomi colonna")

    print(f"- Report intestazioni: {os.path.basename(analysis_csv)}")
    if coverage_csv:
        print(f"- Copertura per file: {os.path.basename(coverage_csv)}")


if __name__ == "__main__":
    main()
