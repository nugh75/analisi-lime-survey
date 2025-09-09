import os
import re
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HEADER_CSV = os.path.join(BASE_DIR, "header_analysis.csv")
MERGED_XLSX = os.path.join(BASE_DIR, "merged_results.xlsx")
KEEP_LIST_TXT = os.path.join(BASE_DIR, "useful_columns.txt")
SUBSET_CSV = os.path.join(BASE_DIR, "dataset_domande.csv")

# Parole chiave che indicano spesso risposte aperte o testo libero
OPEN_TEXT_KEYWORDS = [
    "Specificare", "Quali?", "Quali ", "Scriva", "A quali", "Indichi i corsi",
    "titolo del corso", "ente organizzatore", "tipologia (master", "durata (indicare in ore)",
    "anno di conseguimento", "Altro]"  # spesso è testo libero nelle opzioni Altro
]

# Colonne chiaramente di metadati da escludere sempre
META_EXACT = {
    "ID risposta",
    "Data invio",
    "Ultima pagina",
    "Lingua iniziale",
    "Seme",
    "Data di inizio",
    "Data dell'ultima azione",
    "file_number",
}

# Pattern di esclusione: tempi di compilazione e gruppi
EXCLUDE_PREFIXES = [
    "Tempo totale",
    "Tempo per il gruppo di domande",
    "Tempo per la domanda",
]

# Whitelist esplicita per le opzioni di 1.4 (multi-selezione strutturata)
TITLE_OF_STUDY_WHITELIST = [
    "1.4 Titolo di studio (indichi tutti i titoli posseduti): [diploma]",
    "1.4 Titolo di studio (indichi tutti i titoli posseduti): [laurea]",
    "1.4 Titolo di studio (indichi tutti i titoli posseduti): [corsi di perfezionamento ]",
    "1.4 Titolo di studio (indichi tutti i titoli posseduti): [corsi di specializzazione ]",
    "1.4 Titolo di studio (indichi tutti i titoli posseduti): [master ]",
    "1.4 Titolo di studio (indichi tutti i titoli posseduti): [dottorato ]",
]

# Prefisso per i conteggi 3.17 da conservare anche se numerici
KEEP_PREFIXES = [
    "1.", "2.", "3.", "4.", "5.", "6.", "7.",  # tutte le domande per numero di sezione
]

# Prefissi che vogliamo sicuramente tenere (conteggi 3.17)
KEEP_STRICT_PREFIXES = [
    "3.17 ",
]


def is_open_text(name: str) -> bool:
    name_l = name.lower()
    for k in OPEN_TEXT_KEYWORDS:
        if k.lower() in name_l:
            return True
    return False


def main():
    if not os.path.exists(HEADER_CSV) or not os.path.exists(MERGED_XLSX):
        raise SystemExit("header_analysis.csv o merged_results.xlsx non trovati nella cartella.")

    ha = pd.read_csv(HEADER_CSV)

    # Start: prendi tutte le colonne numerate delle sezioni, poi filtra
    candidates = []
    for _, row in ha.iterrows():
        name = str(row["original_name"]) if "original_name" in ha.columns else str(row.iloc[0])

        # Escludi metadati
        if name in META_EXACT:
            continue
        if any(name.startswith(p) for p in EXCLUDE_PREFIXES):
            continue
        # Escludi la colonna vuota (es. 3.5 ... []) o completamente vuota
        non_null = int(row.get("non_null_count", 0))
        unique_cnt = int(row.get("unique_count_non_null", 0)) if not pd.isna(row.get("unique_count_non_null", 0)) else 0
        if non_null == 0:
            continue
        # Heuristics: escludi testo libero con molte modalità
        if is_open_text(name) and unique_cnt > 20:
            continue
        # Eccezioni: tieni whitelist 1.4 (multi-selezione note)
        if name in TITLE_OF_STUDY_WHITELIST:
            candidates.append(name)
            continue
        # Conserva tutte le domande con prefissi noti
        if any(name.startswith(pref) for pref in KEEP_STRICT_PREFIXES):
            candidates.append(name)
            continue
        if any(name.startswith(pref) for pref in KEEP_PREFIXES):
            # ulteriore filtro: se è open text e molto vario, scarta
            if is_open_text(name) and unique_cnt > 20:
                continue
            candidates.append(name)
            continue

    # Rimuovi duplicati mantenendo l'ordine
    seen = set()
    keep_cols = []
    for c in candidates:
        if c not in seen:
            keep_cols.append(c)
            seen.add(c)

    # Salva la lista
    with open(KEEP_LIST_TXT, "w", encoding="utf-8") as f:
        for c in keep_cols:
            f.write(c + "\n")

    # Crea dataset ridotto
    df = pd.read_excel(MERGED_XLSX)
    # Filtra alle sole colonne presenti
    present_cols = [c for c in keep_cols if c in df.columns]
    subset = df[present_cols].copy()
    subset.to_csv(SUBSET_CSV, index=False)

    print(f"Colonne utili selezionate: {len(present_cols)}")
    print(f"- Salvate in: {KEEP_LIST_TXT}")
    print(f"Dataset ridotto: {SUBSET_CSV} ({len(subset)} righe, {subset.shape[1]} colonne)")


if __name__ == "__main__":
    main()
