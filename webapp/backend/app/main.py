from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Path
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
import os
import shutil
import json
from datetime import datetime
import pandas as pd
from pydantic import BaseModel

from .survey_analyzer import SurveyAnalyzer

# Base directory of backend (absolute)
BACKEND_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

app = FastAPI(title="Survey Analysis API", version="1.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Projects with persistence ----
class Project:
    def __init__(self, project_id: str, name: Optional[str] = None):
        self.id = project_id
        # Ensure absolute upload dir independent of current working directory
        self.upload_dir = os.path.join(BACKEND_BASE_DIR, "uploads", "projects", project_id)
        os.makedirs(self.upload_dir, exist_ok=True)
        self.metadata_path = os.path.join(self.upload_dir, "metadata.json")
        self.name = name or f"Project {project_id}"
        self.files = []  # basenames only
        self.merged_file = None  # basename
        self.created_at = datetime.now().isoformat(timespec="seconds")
        self.last_updated_at: Optional[str] = None
        self.last_loaded_at: Optional[str] = None
        self.records_count: Optional[int] = None
        self.analyzer = SurveyAnalyzer()
        self._load_or_init_metadata()

    def _load_or_init_metadata(self):
        if os.path.exists(self.metadata_path):
            try:
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.name = data.get("name", self.name)
                self.files = data.get("files", [])
                self.merged_file = data.get("merged_file")
                self.created_at = data.get("created_at", self.created_at)
                self.last_updated_at = data.get("last_updated_at") or data.get("updated_at")
                self.last_loaded_at = data.get("last_loaded_at")
                self.records_count = data.get("records_count")
            except Exception:
                self._save_metadata()
        else:
            self._save_metadata()
        if not self.last_updated_at:
            self.last_updated_at = self.created_at
        if self.records_count is not None:
            try:
                self.records_count = int(self.records_count)
            except (TypeError, ValueError):
                self.records_count = None

    def _save_metadata(self):
        data = {
            "id": self.id,
            "name": self.name,
            "files": self.files,
            "merged_file": self.merged_file,
            "created_at": self.created_at,
            "last_updated_at": self.last_updated_at,
            "last_loaded_at": self.last_loaded_at,
            "records_count": self.records_count,
        }
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def update_records(self, count: Optional[int], *, mark_loaded: bool = False):
        if count is not None:
            try:
                self.records_count = int(count)
            except (TypeError, ValueError):
                self.records_count = None
        timestamp = datetime.now().isoformat(timespec="seconds")
        self.last_updated_at = timestamp
        if mark_loaded:
            self.last_loaded_at = timestamp
        self._save_metadata()

    def compute_records_from_merged(self, persist: bool = False) -> Optional[int]:
        """Return respondent count by inspecting the merged dataset (excludes header)."""
        if not self.merged_file:
            return self.records_count
        merged_path = os.path.join(self.upload_dir, self.merged_file)
        if not os.path.isfile(merged_path):
            return self.records_count

        try:
            df = pd.read_excel(merged_path)
            count = max(len(df.index), 0)
        except Exception:
            count = None

        if count is None:
            return self.records_count

        if persist and count != self.records_count:
            original_last_updated = self.last_updated_at
            original_last_loaded = self.last_loaded_at
            self.records_count = count
            self._save_metadata()
            # Restore timestamps to avoid altering audit info during read-only operations
            self.last_updated_at = original_last_updated
            self.last_loaded_at = original_last_loaded
        else:
            self.records_count = count

        return self.records_count

class ProjectManager:
    def __init__(self):
        self.projects: Dict[str, Project] = {}
        self._ignored_ids = {"default"}
        root = os.path.join(BACKEND_BASE_DIR, "uploads", "projects")
        if os.path.isdir(root):
            for pid in os.listdir(root):
                pdir = os.path.join(root, pid)
                if os.path.isdir(pdir) and pid not in self._ignored_ids:
                    try:
                        self.projects[pid] = Project(pid)
                    except Exception:
                        pass

    def refresh_from_disk(self):
        """Ensure in-memory projects include any directories present on disk.
        Keeps existing Project instances and adds any missing ones.
        """
        root = os.path.join(BACKEND_BASE_DIR, "uploads", "projects")
        if os.path.isdir(root):
            for pid in os.listdir(root):
                pdir = os.path.join(root, pid)
                if os.path.isdir(pdir) and pid not in self.projects and pid not in self._ignored_ids:
                    try:
                        self.projects[pid] = Project(pid)
                    except Exception:
                        pass

    def create_project(self, name: Optional[str] = None) -> Project:
        from uuid import uuid4
        pid = uuid4().hex[:8]
        while pid in self._ignored_ids or pid in self.projects:
            pid = uuid4().hex[:8]
        proj = Project(pid, name or f"Project {pid}")
        self.projects[pid] = proj
        return proj

    def list_projects(self):
        # Refresh to pick up any projects created outside this process
        self.refresh_from_disk()
        project_list = []
        for p in sorted(self.projects.values(), key=lambda obj: obj.created_at or "", reverse=True):
            if p.id in self._ignored_ids:
                continue
            total_size = 0
            datasets_count = 0
            records_count = p.compute_records_from_merged(persist=True)
            if os.path.isdir(p.upload_dir):
                for root, _, files in os.walk(p.upload_dir):
                    for fname in files:
                        fpath = os.path.join(root, fname)
                        try:
                            total_size += os.path.getsize(fpath)
                        except OSError:
                            continue
                        if fname.lower().startswith("dataset_") and fname.lower().endswith((".xlsx", ".xls")):
                            datasets_count += 1
            project_list.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "upload_dir": p.upload_dir,
                    "files_count": len(p.files),
                    "datasets_count": datasets_count,
                    "merged_file": p.merged_file,
                    "records_count": records_count,
                    "last_loaded_at": p.last_loaded_at,
                    "last_updated_at": p.last_updated_at,
                    "created_at": p.created_at,
                    "total_size_bytes": total_size,
                }
            )
        return project_list

    def get(self, project_id: Optional[str]) -> Project:
        if not project_id:
            raise HTTPException(status_code=400, detail="Project ID required")
        if project_id in self._ignored_ids:
            raise HTTPException(status_code=404, detail="Project not found")
        if project_id not in self.projects:
            raise HTTPException(status_code=404, detail="Project not found")
        return self.projects[project_id]

    def delete(self, project_id: str):
        proj = self.get(project_id)
        if os.path.exists(proj.upload_dir):
            shutil.rmtree(proj.upload_dir)
        del self.projects[project_id]

pm = ProjectManager()

def _resolve_uploaded_paths(proj: Project, items: List[str]):
    """Resolve provided file identifiers (absolute path, relative path, or basename)
    into existing absolute file paths under the backend context. Returns (resolved, missing_as_proj_paths).
    """
    resolved: List[str] = []
    missing: List[str] = []
    for it in items:
        base = os.path.basename(it)
        candidates = []
        # absolute provided
        if os.path.isabs(it):
            candidates.append(it)
        # relative as provided from caller (relative to backend base)
        if not os.path.isabs(it):
            candidates.append(os.path.join(BACKEND_BASE_DIR, it))
        # project dir + basename
        candidates.append(os.path.join(proj.upload_dir, base))

        found = next((c for c in candidates if os.path.exists(c)), None)
        if found:
            resolved.append(os.path.abspath(found))
        else:
            missing.append(os.path.join(proj.upload_dir, base))
    return resolved, missing

# ---- Models ----
class MergeFilesRequest(BaseModel):
    file_paths: List[str]

class AnalyzeHeadersRequest(BaseModel):
    file_path: str

class SelectColumnsRequest(BaseModel):
    file_path: str
    headers_analysis: List[dict]

class LoadDatasetRequest(BaseModel):
    file_path: str

class CreateProjectRequest(BaseModel):
    name: Optional[str] = None

class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None

# ---- Legacy endpoints requiring explicit project ----
@app.get("/")
async def root():
    return {"message": "Survey Analysis API", "version": "1.1.0"}

@app.post("/upload-files")
async def upload_files(files: List[UploadFile] = File(...)):
    raise HTTPException(status_code=400, detail="Project ID required. Use /projects/{project_id}/upload-files")

@app.post("/merge-files")
async def merge_files(req: MergeFilesRequest):
    raise HTTPException(status_code=400, detail="Project ID required. Use /projects/{project_id}/merge-files")

@app.post("/analyze-headers")
async def analyze_headers(req: AnalyzeHeadersRequest):
    raise HTTPException(status_code=400, detail="Project ID required. Use /projects/{project_id}/analyze-headers")

@app.post("/select-columns")
async def select_columns(req: SelectColumnsRequest):
    raise HTTPException(status_code=400, detail="Project ID required. Use /projects/{project_id}/select-columns")

@app.post("/load-dataset")
async def load_dataset(req: LoadDatasetRequest):
    raise HTTPException(status_code=400, detail="Project ID required. Use /projects/{project_id}/load-dataset")

@app.get("/question-groups")
async def get_question_groups():
    raise HTTPException(status_code=400, detail="Project ID required. Use /projects/{project_id}/question-groups")

@app.post("/analyze-question")
async def analyze_question(
    group_key: str = Form(...),
    chart_type: str = Form("bar"),
    show_percentages: bool = Form(True),
    include_na: bool = Form(False),
):
    raise HTTPException(status_code=400, detail="Project ID required. Use /projects/{project_id}/analyze-question")

@app.get("/chart-types")
async def get_chart_types():
    return {
        "chart_types": [
            {"value": "bar", "label": "Barre verticali", "description": "Ideale per confrontare categorie"},
            {"value": "bar_h", "label": "Barre orizzontali", "description": "Migliore per etichette lunghe"},
            {"value": "pie", "label": "Grafico a torta", "description": "Mostra proporzioni del totale"},
            {"value": "donut", "label": "Grafico a ciambella", "description": "Variazione della torta con foro centrale"},
            {"value": "likert_bar", "label": "Barre Likert", "description": "Ordinate secondo scala Likert"},
            {"value": "histogram", "label": "Istogramma", "description": "Distribuzione valori numerici"},
            {"value": "gaussian", "label": "Curva gaussiana", "description": "Istogramma + curva normale"},
            {"value": "box_likert", "label": "Box plot Likert", "description": "Distribuzione numerica codificata della scala Likert"},
            {"value": "box_multi", "label": "Box plot multiplo (gruppo)", "description": "Più box plot per sotto-domanda (Likert)"},
            {"value": "stacked_100", "label": "Barre impilate 100% (gruppo)", "description": "Confronto tra sotto-domande normalizzato al 100%"},
            {"value": "heatmap_corr", "label": "Heatmap correlazioni (gruppo)", "description": "Matrice di correlazione tra sotto-domande Likert"},
            {"value": "small_multiples", "label": "Small multiples", "description": "Più grafici piccoli per ogni sotto-domanda"},
        ]
    }

@app.delete("/cleanup")
async def cleanup_files():
    raise HTTPException(status_code=400, detail="Project ID required. Use /projects/{project_id}/cleanup")

# ---- Project APIs ----
@app.post("/projects")
async def create_project(req: CreateProjectRequest):
    name = (req.name or "").strip() or None
    proj = pm.create_project(name)
    if name:
        proj.name = name
        proj._save_metadata()
    return {"id": proj.id, "name": proj.name}

@app.get("/projects")
async def list_projects():
    return {"projects": pm.list_projects()}

@app.get("/projects/{project_id}")
async def get_project_details(project_id: str = Path(...)):
    proj = pm.get(project_id)
    total_size = 0
    datasets_count = 0
    records_count = proj.compute_records_from_merged(persist=True)
    if os.path.isdir(proj.upload_dir):
        for root, _, files in os.walk(proj.upload_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                try:
                    total_size += os.path.getsize(fpath)
                except OSError:
                    continue
                if fname.lower().startswith("dataset_") and fname.lower().endswith((".xlsx", ".xls")):
                    datasets_count += 1
    return {
        "id": proj.id,
        "name": proj.name,
        "upload_dir": proj.upload_dir,
        "files": proj.files,
        "merged_file": proj.merged_file,
        "created_at": proj.created_at,
        "records_count": records_count,
        "last_updated_at": proj.last_updated_at,
        "last_loaded_at": proj.last_loaded_at,
        "files_count": len(proj.files),
        "datasets_count": datasets_count,
        "total_size_bytes": total_size,
    }

@app.delete("/projects/{project_id}")
async def delete_project(project_id: str = Path(...)):
    pm.delete(project_id)
    return {"success": True}

@app.patch("/projects/{project_id}")
async def update_project(project_id: str, req: UpdateProjectRequest):
    proj = pm.get(project_id)
    updated = False
    if req.name is not None:
        new_name = (req.name or "").strip()
        proj.name = new_name or proj.name
        updated = True
    if updated:
        proj._save_metadata()
    return {
        "id": proj.id,
        "name": proj.name,
        "upload_dir": proj.upload_dir,
        "files": proj.files,
        "merged_file": proj.merged_file,
        "created_at": proj.created_at,
    }

@app.post("/projects/{project_id}/keep-only-merges")
async def keep_only_merges(project_id: str):
    proj = pm.get(project_id)
    if not os.path.isdir(proj.upload_dir):
        return {"success": True, "deleted": 0}
    deleted = 0
    for fname in list(os.listdir(proj.upload_dir)):
        fpath = os.path.join(proj.upload_dir, fname)
        if not os.path.isfile(fpath):
            continue
        # Keep only merged_*.xlsx
        if fname.startswith("merged_") and fname.lower().endswith((".xlsx", ".xls")):
            continue
        # If it is an Excel file, delete it
        if fname.lower().endswith((".xlsx", ".xls")):
            try:
                os.remove(fpath)
                deleted += 1
            except Exception:
                pass
    # Recompute files list: keep only basenames of remaining files
    remaining_files = [f for f in os.listdir(proj.upload_dir) if os.path.isfile(os.path.join(proj.upload_dir, f))]
    proj.files = remaining_files
    proj._save_metadata()
    return {"success": True, "deleted": deleted, "files": proj.files, "merged_file": proj.merged_file}

# Project-scoped variants
@app.post("/projects/{project_id}/upload-files")
async def upload_files_project(project_id: str, files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    proj = pm.get(project_id)
    uploaded_files: List[str] = []
    try:
        for file in files:
            if not file.filename.endswith((".xlsx", ".xls")):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not an Excel file")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{file.filename}"
            file_path = os.path.join(proj.upload_dir, filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_files.append(file_path)
            bname = os.path.basename(file_path)
            if bname not in proj.files:
                proj.files.append(bname)
        proj._save_metadata()
        return {
            "success": True,
            "message": f"Uploaded {len(uploaded_files)} files",
            "files": [os.path.basename(f) for f in uploaded_files],
            "file_paths": uploaded_files,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading files: {str(e)}")

@app.post("/projects/{project_id}/merge-files")
async def merge_files_project(project_id: str, req: MergeFilesRequest):
    proj = pm.get(project_id)
    try:
        full_paths, missing = _resolve_uploaded_paths(proj, req.file_paths)
        if missing:
            raise HTTPException(status_code=404, detail=f"Files not found: {missing}")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(proj.upload_dir, f"merged_{timestamp}.xlsx")
        result = proj.analyzer.merge_excel_files(full_paths, output_path)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        result["merged_file"] = os.path.basename(output_path)
        proj.merged_file = result["merged_file"]
        proj.update_records(result.get("rows"))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error merging files: {str(e)}")

@app.post("/projects/{project_id}/analyze-headers")
async def analyze_headers_project(project_id: str, req: AnalyzeHeadersRequest):
    proj = pm.get(project_id)
    try:
        full_path = os.path.join(proj.upload_dir, os.path.basename(req.file_path))
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="File not found")
        return proj.analyzer.analyze_headers(full_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing headers: {str(e)}")

@app.post("/projects/{project_id}/select-columns")
async def select_columns_project(project_id: str, req: SelectColumnsRequest):
    proj = pm.get(project_id)
    try:
        full_path = os.path.join(proj.upload_dir, os.path.basename(req.file_path))
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="File not found")
        useful_columns = proj.analyzer.select_useful_columns(req.headers_analysis)
        df = pd.read_excel(full_path)
        existing_columns = [c for c in useful_columns if c in df.columns]
        if not existing_columns:
            raise HTTPException(status_code=400, detail="No useful columns found")
        subset = df[existing_columns]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(proj.upload_dir, f"dataset_{timestamp}.xlsx")
        subset.to_excel(output_path, index=False)
        proj.update_records(len(subset))
        return {
            "success": True,
            "selected_columns": len(existing_columns),
            "total_questions": len(useful_columns),
            "dataset_file": os.path.basename(output_path),
            "columns": existing_columns,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error selecting columns: {str(e)}")

@app.post("/projects/{project_id}/load-dataset")
async def load_dataset_project(project_id: str, req: LoadDatasetRequest):
    proj = pm.get(project_id)
    try:
        full_path = os.path.join(proj.upload_dir, os.path.basename(req.file_path))
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="File not found")
        proj.analyzer.load_data(full_path)
        groups_data = proj.analyzer.get_question_groups()
        data_rows = len(proj.analyzer.data) if getattr(proj.analyzer, 'data', None) is not None else 0
        data_columns = len(proj.analyzer.data.columns) if getattr(proj.analyzer, 'data', None) is not None else 0
        proj.update_records(data_rows, mark_loaded=True)
        return {
            "success": True,
            "message": "Dataset loaded successfully",
            "groups": groups_data["groups"],
            "labels": groups_data["labels"],
            "likert_families": groups_data["likert_families"],
            "total_groups": len(groups_data["groups"]),
            "total_rows": data_rows,
            "total_columns": data_columns,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading dataset: {str(e)}")

@app.get("/projects/{project_id}/question-groups")
async def get_question_groups_project(project_id: str):
    proj = pm.get(project_id)
    try:
        groups_data = proj.analyzer.get_question_groups()
        if not groups_data["groups"]:
            raise HTTPException(status_code=400, detail="No dataset loaded")
        return groups_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting question groups: {str(e)}")

@app.post("/projects/{project_id}/analyze-question")
async def analyze_question_project(
    project_id: str,
    group_key: str = Form(...),
    chart_type: str = Form("bar"),
    show_percentages: bool = Form(True),
    include_na: bool = Form(False),
):
    proj = pm.get(project_id)
    try:
        result = proj.analyzer.analyze_question_group(
            group_key=group_key,
            chart_type=chart_type,
            show_percentages=show_percentages,
            include_na=include_na,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return jsonable_encoder(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing question: {str(e)}")

@app.delete("/projects/{project_id}/cleanup")
async def cleanup_files_project(project_id: str):
    proj = pm.get(project_id)
    try:
        if os.path.exists(proj.upload_dir):
            shutil.rmtree(proj.upload_dir)
        os.makedirs(proj.upload_dir, exist_ok=True)
        proj.analyzer = SurveyAnalyzer()
        proj.files = []
        proj.merged_file = None
        proj.records_count = None
        proj.last_loaded_at = None
        proj.last_updated_at = datetime.now().isoformat(timespec="seconds")
        proj._save_metadata()
        return {"success": True, "message": "Files cleaned up"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning up: {str(e)}")
