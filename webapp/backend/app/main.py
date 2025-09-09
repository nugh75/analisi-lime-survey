from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict
import os
import shutil
import tempfile
from datetime import datetime
import pandas as pd
from pydantic import BaseModel

from .survey_analyzer import SurveyAnalyzer

app = FastAPI(title="Survey Analysis API", version="1.0.0")

# Configurazione CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Istanza globale dell'analyzer
class Project:
    def __init__(self, project_id: str, name: str):
        self.id = project_id
        self.name = name
        self.upload_dir = os.path.join("uploads", "projects", project_id)
        os.makedirs(self.upload_dir, exist_ok=True)
        self.analyzer = SurveyAnalyzer()

class ProjectManager:
    def __init__(self):
        self.projects: Dict[str, Project] = {}
        # default project for backward compatibility
        self.default_id = "default"
        self.projects[self.default_id] = Project(self.default_id, "Default")

    def create_project(self, name: Optional[str] = None) -> Project:
        from uuid import uuid4
        pid = uuid4().hex[:8]
        proj = Project(pid, name or f"Project {pid}")
        self.projects[pid] = proj
        return proj

    def list_projects(self):
        return [
            {"id": p.id, "name": p.name, "upload_dir": p.upload_dir}
            for p in self.projects.values()
        ]

    def get(self, project_id: Optional[str]) -> Project:
        pid = project_id or self.default_id
        if pid not in self.projects:
            raise HTTPException(status_code=404, detail="Project not found")
        return self.projects[pid]

    def delete(self, project_id: str):
        if project_id == self.default_id:
            raise HTTPException(status_code=400, detail="Cannot delete default project")
        proj = self.get(project_id)
        # remove files
        if os.path.exists(proj.upload_dir):
            shutil.rmtree(proj.upload_dir)
        del self.projects[project_id]

pm = ProjectManager()

@app.get("/")
async def root():
    return {"message": "Survey Analysis API", "version": "1.0.0"}

@app.post("/upload-files")
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload multiple Excel files for analysis
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    uploaded_files = []
    
    try:
        proj = pm.get(None)
        for file in files:
            if not file.filename.endswith(('.xlsx', '.xls')):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not an Excel file")
            
            # Salva il file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{file.filename}"
            file_path = os.path.join(proj.upload_dir, filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            uploaded_files.append(file_path)
        
        return {
            "success": True,
            "message": f"Uploaded {len(uploaded_files)} files",
            "files": [os.path.basename(f) for f in uploaded_files],
            "file_paths": uploaded_files
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading files: {str(e)}")

class MergeFilesRequest(BaseModel):
    file_paths: List[str]

@app.post("/merge-files")
async def merge_files(req: MergeFilesRequest):
    """
    Merge uploaded Excel files
    """
    try:
        proj = pm.get(None)
        # Converti i nomi dei file in percorsi completi
        full_paths = [os.path.join(proj.upload_dir, os.path.basename(path)) for path in req.file_paths]
        
        # Verifica che i file esistano
        missing_files = [path for path in full_paths if not os.path.exists(path)]
        if missing_files:
            raise HTTPException(status_code=404, detail=f"Files not found: {missing_files}")

        # Crea il file merged
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(proj.upload_dir, f"merged_{timestamp}.xlsx")

        result = proj.analyzer.merge_excel_files(full_paths, output_path)

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        result["merged_file"] = os.path.basename(output_path)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error merging files: {str(e)}")

class AnalyzeHeadersRequest(BaseModel):
    file_path: str

@app.post("/analyze-headers")
async def analyze_headers(req: AnalyzeHeadersRequest):
    """
    Analyze headers of the merged file
    """
    try:
        proj = pm.get(None)
        full_path = os.path.join(proj.upload_dir, os.path.basename(req.file_path))
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="File not found")

        result = proj.analyzer.analyze_headers(full_path)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing headers: {str(e)}")

class SelectColumnsRequest(BaseModel):
    file_path: str
    headers_analysis: List[dict]

@app.post("/select-columns")
async def select_columns(req: SelectColumnsRequest):
    """
    Select useful columns and create reduced dataset
    """
    try:
        proj = pm.get(None)
        full_path = os.path.join(proj.upload_dir, os.path.basename(req.file_path))

        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Seleziona colonne utili
        useful_columns = proj.analyzer.select_useful_columns(req.headers_analysis)

        # Carica il dataset originale
        df = pd.read_excel(full_path)

        # Filtra le colonne esistenti
        existing_columns = [c for c in useful_columns if c in df.columns]

        if not existing_columns:
            raise HTTPException(status_code=400, detail="No useful columns found")

        # Crea dataset ridotto
        subset = df[existing_columns]

        # Salva il dataset ridotto
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(proj.upload_dir, f"dataset_{timestamp}.xlsx")
        subset.to_excel(output_path, index=False)

        return {
            "success": True,
            "selected_columns": len(existing_columns),
            "total_questions": len(useful_columns),
            "dataset_file": os.path.basename(output_path),
            "columns": existing_columns,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error selecting columns: {str(e)}")

class LoadDatasetRequest(BaseModel):
    file_path: str

@app.post("/load-dataset")
async def load_dataset(req: LoadDatasetRequest):
    """
    Load dataset and analyze questions
    """
    try:
        proj = pm.get(None)
        full_path = os.path.join(proj.upload_dir, os.path.basename(req.file_path))
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Carica il dataset nell'analyzer
        proj.analyzer.load_data(full_path)

        # Ottieni i gruppi di domande
        groups_data = proj.analyzer.get_question_groups()
        
        return {
            "success": True,
            "message": "Dataset loaded successfully",
            "groups": groups_data["groups"],
            "labels": groups_data["labels"],
            "likert_families": groups_data["likert_families"],
            "total_groups": len(groups_data["groups"])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading dataset: {str(e)}")

@app.get("/question-groups")
async def get_question_groups():
    """
    Get available question groups
    """
    try:
        groups_data = pm.get(None).analyzer.get_question_groups()
        
        if not groups_data["groups"]:
            raise HTTPException(status_code=400, detail="No dataset loaded")
        
        return groups_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting question groups: {str(e)}")

@app.post("/analyze-question")
async def analyze_question(
    group_key: str = Form(...),
    chart_type: str = Form("bar"),
    show_percentages: bool = Form(True),
    include_na: bool = Form(False)
):
    """
    Analyze a specific question group
    """
    try:
        result = pm.get(None).analyzer.analyze_question_group(
            group_key=group_key,
            chart_type=chart_type,
            show_percentages=show_percentages,
            include_na=include_na
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing question: {str(e)}")

@app.get("/chart-types")
async def get_chart_types():
    """
    Get available chart types
    """
    return {
        "chart_types": [
            {"value": "bar", "label": "Barre verticali", "description": "Ideale per confrontare categorie"},
            {"value": "bar_h", "label": "Barre orizzontali", "description": "Migliore per etichette lunghe"},
            {"value": "pie", "label": "Grafico a torta", "description": "Mostra proporzioni del totale"},
            {"value": "likert_bar", "label": "Barre Likert", "description": "Ordinate secondo scala Likert"},
            {"value": "histogram", "label": "Istogramma", "description": "Distribuzione valori numerici"},
            {"value": "gaussian", "label": "Curva gaussiana", "description": "Istogramma + curva normale"}
        ]
    }

@app.delete("/cleanup")
async def cleanup_files():
    """
    Clean up uploaded files (for development/testing)
    """
    try:
        # Reset default project files and analyzer
        proj = pm.get(None)
        if os.path.exists(proj.upload_dir):
            shutil.rmtree(proj.upload_dir)
        os.makedirs(proj.upload_dir, exist_ok=True)
        proj.analyzer = SurveyAnalyzer()
        
        return {"success": True, "message": "Files cleaned up"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning up: {str(e)}")

# ---- Project APIs ----
class CreateProjectRequest(BaseModel):
    name: Optional[str] = None

@app.post("/projects")
async def create_project(req: CreateProjectRequest):
    proj = pm.create_project(req.name)
    return {"id": proj.id, "name": proj.name}

@app.get("/projects")
async def list_projects():
    return {"projects": pm.list_projects()}

@app.delete("/projects/{project_id}")
async def delete_project(project_id: str = Path(...)):
    pm.delete(project_id)
    return {"success": True}

# Project-scoped variants of endpoints

@app.post("/projects/{project_id}/upload-files")
async def upload_files_project(project_id: str, files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    proj = pm.get(project_id)
    uploaded_files = []
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
        full_paths = [os.path.join(proj.upload_dir, os.path.basename(p)) for p in req.file_paths]
        missing = [p for p in full_paths if not os.path.exists(p)]
        if missing:
            raise HTTPException(status_code=404, detail=f"Files not found: {missing}")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(proj.upload_dir, f"merged_{timestamp}.xlsx")
        result = proj.analyzer.merge_excel_files(full_paths, output_path)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        result["merged_file"] = os.path.basename(output_path)
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
        return {
            "success": True,
            "message": "Dataset loaded successfully",
            "groups": groups_data["groups"],
            "labels": groups_data["labels"],
            "likert_families": groups_data["likert_families"],
            "total_groups": len(groups_data["groups"]),
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
async def analyze_question_project(project_id: str,
    group_key: str = Form(...),
    chart_type: str = Form("bar"),
    show_percentages: bool = Form(True),
    include_na: bool = Form(False)):
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
        return result
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
        return {"success": True, "message": "Files cleaned up"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning up: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
