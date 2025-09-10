import os
import re
import pandas as pd
import numpy as np
import unicodedata
import plotly.express as px
import plotly.graph_objects as go
from collections import Counter
import textwrap
try:
    import scipy.stats as stats
except ImportError:
    stats = None
from typing import List, Dict, Any, Optional

class SurveyAnalyzer:
    """
    Classe principale per l'analisi dei questionari basata sul notebook
    """
    
    def __init__(self):
        self.data = None
        self.question_groups = {}
        self.group_labels = {}
        self._group_families = {}
        self.likert_summary = None
        
        # Configurazioni dal notebook
        self.OPEN_TEXT_KEYWORDS = [
            'Specificare', 'Quali?', 'Quali ', 'Scriva', 'A quali', 'Indichi i corsi',
            'titolo del corso', 'ente organizzatore', 'tipologia (master', 'durata (indicare in ore)',
            'anno di conseguimento', 'Altro]'
        ]
        
        self.META_EXACT = {
            'ID risposta', 'Data invio', 'Ultima pagina', 'Lingua iniziale', 'Seme',
            'Data di inizio', 'Data dellultima azione', 'file_number'
        }
        
        self.EXCLUDE_PREFIXES = ['Tempo totale', 'Tempo per il gruppo di domande', 'Tempo per la domanda']
        
        self.KEEP_PREFIXES = ['1.', '2.', '3.', '4.', '5.', '6.', '7.']
        
        self.TITLE_OF_STUDY_WHITELIST = [
            '1.4 Titolo di studio (indichi tutti i titoli posseduti): [diploma]',
            '1.4 Titolo di studio (indichi tutti i titoli posseduti): [laurea]',
            '1.4 Titolo di studio (indichi tutti i titoli posseduti): [corsi di perfezionamento ]',
            '1.4 Titolo di studio (indichi tutti i titoli posseduti): [corsi di specializzazione ]',
            '1.4 Titolo di studio (indichi tutti i titoli posseduti): [master ]',
            '1.4 Titolo di studio (indichi tutti i titoli posseduti): [dottorato ]',
        ]
        
        self.LIKERT_FAMILIES = {
            'intensita': {
                'order': ['Per nulla', 'Poco', 'Abbastanza', 'Molto', 'Moltissimo'],
                'tokens': {
                    'per nulla': 'Per nulla', 'per niente': 'Per nulla', 'niente affatto': 'Per nulla',
                    'poco': 'Poco',
                    'abbastanza': 'Abbastanza', 'sufficientemente': 'Abbastanza', 'mediamente': 'Abbastanza',
                    'molto': 'Molto', 'tanto': 'Molto',
                    'moltissimo': 'Moltissimo', 'estremamente': 'Moltissimo'
                }
            },
            'accordo': {
                'order': ["Per nulla d'accordo", "In disaccordo", 'Neutrale', "D'accordo", "Molto d'accordo"],
                'tokens': {
                    "per nulla d'accordo": "Per nulla d'accordo", 'fortemente in disaccordo': "Per nulla d'accordo",
                    'in disaccordo': 'In disaccordo',
                    'neutrale': 'Neutrale', "ne d'accordo ne in disaccordo": 'Neutrale', 'indifferente': 'Neutrale',
                    "d'accordo": "D'accordo",
                    "molto d'accordo": "Molto d'accordo", "completamente d'accordo": "Molto d'accordo"
                }
            },
            'frequenza': {
                'order': ['Mai', 'Raramente', 'A volte', 'Spesso', 'Sempre'],
                'tokens': {
                    'mai': 'Mai',
                    'raramente': 'Raramente', 'poco spesso': 'Raramente',
                    'a volte': 'A volte', 'talvolta': 'A volte', 'occasionalmente': 'A volte',
                    'spesso': 'Spesso', 'frequentemente': 'Spesso',
                    'sempre': 'Sempre', 'quasi sempre': 'Sempre'
                }
            },
            'qualita': {
                'order': ['Insufficiente', 'Sufficiente', 'Buona', 'Ottima'],
                'tokens': {
                    'insufficiente': 'Insufficiente', 'scarsa': 'Insufficiente', 'pessima': 'Insufficiente',
                    'sufficiente': 'Sufficiente', 'discreta': 'Sufficiente',
                    'buona': 'Buona',
                    'ottima': 'Ottima', 'eccellente': 'Ottima'
                }
            }
        }
    
    def remove_diacritics(self, s: str) -> str:
        """Rimuove diacritici dai caratteri"""
        nfkd = unicodedata.normalize('NFKD', str(s))
        return ''.join(ch for ch in nfkd if not unicodedata.combining(ch))
    
    def normalize_name(self, s: str) -> str:
        """Normalizza i nomi delle colonne"""
        s = str(s)
        s = self.remove_diacritics(s).lower().strip()
        s = re.sub(r'\s+', ' ', s)
        s = re.sub(r'[^0-9a-z]', '', s)
        return s
    
    def strip_accents(self, s: str) -> str:
        """Rimuove accenti dal testo"""
        if s is None:
            return ''
        s = str(s)
        nfkd = unicodedata.normalize('NFKD', s)
        return ''.join(ch for ch in nfkd if not unicodedata.combining(ch))
    
    def norm_txt(self, s: str) -> str:
        """Normalizza il testo per confronti"""
        s = self.strip_accents(s).lower().strip()
        s = re.sub(r'\s+', ' ', s)
        return s
    
    def merge_excel_files(self, file_paths: List[str], output_path: str) -> Dict[str, Any]:
        """
        Unisce più file Excel in un unico dataset
        """
        pattern = re.compile(r"results-survey(\d+)\.xlsx")
        dfs = []
        
        for file_path in file_paths:
            filename = os.path.basename(file_path)
            m = pattern.match(filename)
            
            try:
                df = pd.read_excel(file_path)
                if m:
                    df["file_number"] = m.group(1)
                else:
                    # Se non segue il pattern, usa un numero sequenziale
                    df["file_number"] = str(len(dfs) + 1)
                dfs.append(df)
            except Exception as e:
                print(f"Errore nel leggere {file_path}: {e}")
                continue
        
        if not dfs:
            return {"error": "Nessun file valido trovato"}
        
        merged = pd.concat(dfs, ignore_index=True)
        merged.to_excel(output_path, index=False)
        
        return {
            "success": True,
            "rows": len(merged),
            "columns": len(merged.columns),
            "files_processed": len(dfs)
        }
    
    def analyze_headers(self, file_path: str) -> Dict[str, Any]:
        """
        Analizza le intestazioni del dataset
        """
        df = pd.read_excel(file_path)
        rows = []
        
        for c in df.columns:
            s = df[c]
            rows.append({
                'original_name': c,
                'normalized_name': self.normalize_name(c),
                'dtype': str(s.dtype),
                'row_count': len(df),
                'non_null_count': int(s.notna().sum()),
                'null_count': int(s.isna().sum()),
                'non_null_pct': round(100 * s.notna().mean(), 2),
                'unique_count_non_null': int(s.dropna().nunique()) if s.notna().any() else 0,
                'sample_values': ', '.join(s.dropna().astype(str).unique()[:3])
            })
        
        return {"headers": rows, "total_rows": len(df), "total_columns": len(df.columns)}
    
    def is_open_text(self, name: str) -> bool:
        """Verifica se una colonna è testo aperto"""
        nl = name.lower()
        return any(k.lower() in nl for k in self.OPEN_TEXT_KEYWORDS)
    
    def select_useful_columns(self, headers_analysis: List[Dict]) -> List[str]:
        """
        Seleziona le colonne utili per l'analisi
        """
        candidates = []
        
        for row in headers_analysis:
            name = str(row['original_name'])
            
            if name in self.META_EXACT or any(name.startswith(p) for p in self.EXCLUDE_PREFIXES):
                continue
            
            non_null = int(row.get('non_null_count', 0))
            unique_cnt = int(row.get('unique_count_non_null', 0)) if pd.notna(row.get('unique_count_non_null', 0)) else 0
            
            if non_null == 0:
                continue
            
            if self.is_open_text(name) and unique_cnt > 20:
                continue
            
            if name in self.TITLE_OF_STUDY_WHITELIST:
                candidates.append(name)
                continue
            
            if any(name.startswith(p) for p in self.KEEP_PREFIXES):
                if self.is_open_text(name) and unique_cnt > 20:
                    continue
                candidates.append(name)
        
        # Rimuovi duplicati mantenendo l'ordine
        keep = []
        seen = set()
        for c in candidates:
            if c not in seen:
                keep.append(c)
                seen.add(c)
        
        return keep
    
    def load_data(self, file_path: str):
        """Carica il dataset"""
        self.data = pd.read_excel(file_path)
        self._analyze_questions()
    
    def clean_question_text(self, col: str) -> str:
        """Pulisce il testo della domanda"""
        s = str(col)
        s = re.sub(r'^\d+\.\d+\s*', '', s).strip()
        s = re.sub(r'\s*\[[^\]]+\]\s*$', '', s).strip()
        s = s.rstrip(':').strip()
        return s

    def split_title_parts(self, col: str) -> tuple[str, str]:
        """Split title into main (outside [..]) and sub (inside [...]) parts.
        - Remove leading numeric prefix like '1.1 '
        - Main: text with bracketed segments removed, trimmed and without trailing ':'
        - Sub: first bracketed content if present, else empty string
        Returns (main, sub)
        """
        s = str(col)
        s_wo_num = re.sub(r'^\d+\.\d+\s*', '', s).strip()
        # capture bracket contents
        m = re.search(r'\[([^\]]+)\]', s_wo_num)
        sub = m.group(1).strip() if m else ''
        # remove all bracketed parts from main
        main = re.sub(r'\s*\[[^\]]+\]\s*', ' ', s_wo_num).strip()
        main = main.rstrip(':').strip()
        return main, sub
    
    def first_non_na(self, series: pd.Series):
        """Trova il primo valore non nullo"""
        for v in series:
            if pd.notna(v) and str(v).strip() != '':
                return v
        return None
    
    def guess_family_from_first_row(self, cols: List[str]) -> Optional[str]:
        """Rileva la famiglia Likert"""
        fam_counts = {}
        for c in cols:
            v = self.first_non_na(self.data[c])
            if v is None:
                continue
            nv = self.norm_txt(str(v))
            matched_family = None
            for fam, cfg in self.LIKERT_FAMILIES.items():
                for token in cfg['tokens'].keys():
                    if token in nv:
                        matched_family = fam
                        break
                if matched_family:
                    break
            if matched_family:
                fam_counts[matched_family] = fam_counts.get(matched_family, 0) + 1
        return max(fam_counts, key=fam_counts.get) if fam_counts else None
    
    def _analyze_questions(self):
        """Analizza e raggruppa le domande"""
        if self.data is None:
            return
        
        # Raggruppa colonne per prefisso numerico
        num_pat = re.compile(r'^(\d+\.\d+)(?:[\s\S]*)$')
        self.question_groups = {}
        
        for col in self.data.columns:
            m = num_pat.match(col)
            if m:
                key = m.group(1)
                self.question_groups.setdefault(key, []).append(col)
        
        # Crea etichette leggibili
        self.group_labels = {}
        for key, cols in self.question_groups.items():
            texts = [self.clean_question_text(c) for c in cols if c]
            self.group_labels[key] = max(set(texts), key=lambda t: (texts.count(t), len(t))) if texts else key
        
        # Rileva famiglie Likert
        self._group_families = {g: self.guess_family_from_first_row(cols) for g, cols in self.question_groups.items()}
        
        # Crea riassunto Likert
        likert_data = []
        for g in sorted(self.question_groups.keys(), key=lambda k: (int(k.split('.')[0]), int(k.split('.')[1]))):
            likert_data.append({
                'group': g,
                'label': self.group_labels.get(g, g),
                'family': self._group_families[g] if self._group_families[g] else 'non-likert',
                'n_cols': len(self.question_groups[g])
            })
        
        self.likert_summary = pd.DataFrame(likert_data)
    
    def get_question_groups(self) -> Dict[str, Any]:
        """Restituisce i gruppi di domande"""
        if not self.question_groups:
            return {"groups": [], "labels": {}}
        
        return {
            "groups": list(self.question_groups.keys()),
            "labels": self.group_labels,
            "likert_families": self._group_families
        }
    
    def wrap_title(self, title: str, max_chars: int = 140) -> str:
        """Fa andare a capo i titoli lunghi"""
        if len(title) <= max_chars:
            return title
        wrapped = textwrap.fill(title, width=max_chars)
        return wrapped.replace('\n', '<br>')
    
    def analyze_question_group(self, group_key: str, chart_type: str = 'bar', 
                             show_percentages: bool = True, include_na: bool = False) -> Dict[str, Any]:
        """
        Analizza un gruppo di domande e genera grafici
        """
        try:
            if self.data is None:
                return {"error": "Nessun dataset caricato"}
            
            if group_key not in self.question_groups:
                return {"error": f"Gruppo {group_key} non trovato"}
            
            cols = self.question_groups[group_key]
            results = {
                "group_key": group_key,
                "description": self.group_labels.get(group_key, group_key),
                "chart_type": chart_type,
                "show_percentages": show_percentages,
                "include_na": include_na,
                "subquestions": []
            }
            
            colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
                     '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
                     '#6C5CE7', '#A29BFE', '#FD79A8', '#E17055', '#00B894']
            
            # For small multiples, render subquestion charts as bars
            effective_chart_type_for_sub = 'bar' if chart_type == 'small_multiples' else chart_type

            # Cache per-subquestion counts and numeric data for potential group-level charts
            per_sub_counts = []  # list of (column, Counter, total)
            per_sub_numeric = {}  # column -> list numeric values (for likert only)

            for i, col in enumerate(cols, 1):
                # Prendi i dati della colonna
                series = self.data[col]
                original_count = len(series)
                
                if not include_na:
                    series = series.dropna()
                
                if len(series) == 0:
                    results["subquestions"].append({
                        "index": i,
                        "column": col,
                        "error": "Nessun dato disponibile"
                    })
                    continue
                
                # Conta i valori
                counts = Counter(series)
                total = sum(counts.values())
                
                # Statistiche descrittive
                stats_data = {
                    "total_responses": total,
                    "missing_values": original_count - total if not include_na else 0
                }
                
                # Calcola statistiche numeriche per Likert
                likert_family = self._group_families.get(group_key)
                if likert_family and likert_family in self.LIKERT_FAMILIES:
                    order = self.LIKERT_FAMILIES[likert_family]['order']
                    numeric_values = []
                    for val in series:
                        try:
                            idx = order.index(val)
                            numeric_values.append(idx + 1)
                        except ValueError:
                            continue
                    if numeric_values:
                        per_sub_numeric[col] = numeric_values
                    
                    if numeric_values:
                        stats_data.update({
                            "mean": round(np.mean(numeric_values), 2),
                            "median": round(np.median(numeric_values), 1),
                            "std": round(np.std(numeric_values, ddof=1), 2) if len(numeric_values) > 1 else 0
                        })
                
                # Distribuzione dei valori
                distribution = []
                for value, count in counts.most_common():
                    pct = round(100 * count / total, 1) if total > 0 else 0
                    distribution.append({
                        "value": str(value),
                        "count": count,
                        "percentage": pct
                    })
                
                # Memo for group-level charts
                per_sub_counts.append((col, counts, total))

                # Genera grafico per sotto-domanda
                chart_data = self._generate_chart_data(counts, col, effective_chart_type_for_sub, show_percentages, colors, group_key, numeric_data=per_sub_numeric.get(col))
                
                results["subquestions"].append({
                    "index": i,
                    "column": col,
                    "statistics": stats_data,
                    "distribution": distribution,
                    "chart": chart_data
                })
            
            # Group-level charts (stacked_100, heatmap_corr, box_multi)
            if chart_type in ("stacked_100", "heatmap_corr", "box_multi"):
                group_chart = {"chart_type": chart_type}
                # Names for subquestions
                sub_names = [self.wrap_title(c, max_chars=80) for c, _, _ in per_sub_counts]
                # Category labels
                all_labels = []
                likert_family = self._group_families.get(group_key)
                if chart_type == "stacked_100":
                    if likert_family and likert_family in self.LIKERT_FAMILIES:
                        all_labels = [str(l) for l in self.LIKERT_FAMILIES[likert_family]['order']]
                    else:
                        label_set = []
                        seen = set()
                        for _, cnts, _ in per_sub_counts:
                            for l in cnts.keys():
                                s = str(l)
                                if s not in seen:
                                    seen.add(s)
                                    label_set.append(s)
                        all_labels = label_set
                    # Build traces per category across subquestions
                    traces = []
                    for lab in all_labels:
                        vals = []
                        for _, cnts, total in per_sub_counts:
                            v = cnts.get(lab, 0)
                            pct = round(100 * v / total, 2) if total > 0 else 0
                            vals.append(pct)
                        traces.append({"name": lab, "values": vals})
                    group_chart.update({
                        "title": f"Distribuzione 100% - {self.group_labels.get(group_key, group_key)}",
                        "x": sub_names,
                        "traces": traces,
                        "y_label": "Percentuale (%)"
                    })
                elif chart_type == "heatmap_corr":
                    # Build numeric dataframe if possible
                    if likert_family and likert_family in self.LIKERT_FAMILIES:
                        order = self.LIKERT_FAMILIES[likert_family]['order']
                        # Map each subquestion series to numeric aligned by index
                        df_map = {}
                        for c in cols:
                            s = self.data[c]
                            vals = []
                            for v in s:
                                if pd.isna(v):
                                    vals.append(np.nan)
                                else:
                                    try:
                                        idx = order.index(v)
                                        vals.append(idx + 1)
                                    except ValueError:
                                        vals.append(np.nan)
                            df_map[self.wrap_title(c, max_chars=40)] = vals
                        df = pd.DataFrame(df_map)
                        if not df.empty:
                            corr = df.corr().fillna(0)
                            group_chart.update({
                                "labels": list(corr.columns),
                                "matrix": corr.values.tolist(),
                                "title": f"Correlazioni - {self.group_labels.get(group_key, group_key)}"
                            })
                elif chart_type == "box_multi":
                    # Build multiple box plots across subquestions (Likert only)
                    if likert_family and likert_family in self.LIKERT_FAMILIES and per_sub_numeric:
                        traces = []
                        for idx, c in enumerate(cols):
                            y = per_sub_numeric.get(c)
                            if not y:
                                continue
                            # Title parts for better legend naming
                            main, sub = self.split_title_parts(c)
                            name = self.wrap_title(main, max_chars=60) if main else self.wrap_title(c, max_chars=60)
                            traces.append({
                                "name": name,
                                "y": y,
                                "marker": {"color": colors[idx % len(colors)]},
                            })
                        if traces:
                            group_chart.update({
                                "title": f"Box plot multiplo - {self.group_labels.get(group_key, group_key)}",
                                "traces": traces,
                                "y_label": "Punteggio Likert"
                            })
                results["group_chart"] = group_chart

            return results
        except Exception as e:
            return {"error": f"Analyzer error: {str(e)}"}
    
    def _generate_chart_data(self, counts: Counter, col: str, chart_type: str, 
                           show_percentages: bool, colors: List[str], group_key: str, numeric_data: Optional[List[float]] = None) -> Dict[str, Any]:
        """Genera i dati per il grafico"""
        labels = list(counts.keys())
        values = list(counts.values())
        total = sum(values)
        
        if total == 0 and chart_type not in ("histogram", "gaussian", "box_likert"):
            return {"error": "Nessun dato per il grafico"}
        
        # Calcola valori per i grafici
        percentages = [round(100 * v / total, 1) for v in values] if total > 0 else []
        text_labels = [f"{v} ({p}%)" for v, p in zip(values, percentages)] if total > 0 else []
        
        display_values = percentages if show_percentages else values
        y_label = 'Percentuale (%)' if show_percentages else 'Conteggio'
        
        # Titles: split into main and sub (from square brackets)
        main_title, sub_title = self.split_title_parts(col)
        wrapped_title = self.wrap_title(main_title or col)
        
        # Configurazione base del grafico
        chart_config = {
            "title": wrapped_title,
            "title_main": wrapped_title,
            "title_sub": sub_title,
            "labels": [str(l) for l in labels],
            "values": display_values,
            "text_labels": text_labels,
            "colors": colors[:len(labels)],
            "y_label": y_label,
            "chart_type": chart_type
        }
        
        # Configurazioni specifiche per tipo
        if chart_type == 'donut':
            chart_config.update({
                "hole": 0.5
            })

        if chart_type == 'likert_bar':
            likert_family = self._group_families.get(group_key)
            if likert_family and likert_family in self.LIKERT_FAMILIES:
                order = self.LIKERT_FAMILIES[likert_family]['order']
                ordered_labels = [l for l in order if l in labels]
                ordered_values = [counts[l] for l in ordered_labels]
                ordered_display = [round(100 * v / total, 1) for v in ordered_values] if show_percentages else ordered_values
                ordered_text = [f"{v} ({round(100 * v / total, 1)}%)" for v in ordered_values]
                
                chart_config.update({
                    "labels": ordered_labels,
                    "values": ordered_display,
                    "text_labels": ordered_text,
                    "ordered": True
                })
        
        elif chart_type in ['histogram', 'gaussian', 'box_likert']:
            likert_family = self._group_families.get(group_key)
            if likert_family and likert_family in self.LIKERT_FAMILIES:
                order = self.LIKERT_FAMILIES[likert_family]['order']
                # If numeric_data not provided, derive from counts (expanded)
                if numeric_data is None:
                    numeric_data = []
                    for val in counts.keys():
                        try:
                            idx = order.index(val)
                            numeric_data.extend([idx + 1] * counts[val])
                        except ValueError:
                            continue
                
                if numeric_data:
                    chart_config.update({
                        "numeric_data": numeric_data,
                        "bins": len(order),
                        "x_label": "Valore Likert"
                    })
                    
                    if chart_type == 'gaussian' and len(numeric_data) > 1:
                        mean_val = float(np.mean(numeric_data))
                        std_val = float(np.std(numeric_data))
                        chart_config.update({
                            "gaussian": {
                                "mean": mean_val,
                                "std": std_val
                            }
                        })
                    
                    if chart_type == 'box_likert':
                        # For box plot, we just need numeric_data; frontend will render box
                        chart_config.update({
                            "y_label": "Punteggio Likert"
                        })
        
        return chart_config
