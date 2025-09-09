# Survey Analyzer Web Application

Un'applicazione web completa per l'analisi di questionari e sondaggi con frontend React/Vite e backend FastAPI/Python.

## Caratteristiche

- ✅ **Upload multipli di file Excel** (.xlsx, .xls)
- ✅ **Merge automatico** dei dataset
- ✅ **Analisi intelligente degli header** 
- ✅ **Selezione automatica colonne utili**
- ✅ **6 tipologie di grafici** (horizontal_bar, pie, donut, stacked_bar, grouped_bar, box_plot)
- ✅ **Statistiche avanzate** (media, deviazione standard, mediana, etc.)
- ✅ **Interfaccia moderna** con React + TypeScript + Tailwind CSS
- ✅ **API RESTful** con FastAPI e documentazione automatica
- ✅ **Containerizzazione Docker** per deployment facile

## Struttura del Progetto

```
webapp/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── main.py         # API endpoints
│   │   └── survey_analyzer.py  # Core analysis logic
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile         # Backend container
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   └── types/         # TypeScript definitions
│   ├── package.json       # Node dependencies
│   └── Dockerfile         # Frontend container
├── docker-compose.yml      # Multi-container orchestration
├── start-dev.sh           # Development setup script
└── start-docker.sh        # Docker production script
```

## Avvio Rapido

### Opzione 1: Development Mode

```bash
# Clona e naviga nella directory
cd webapp

# Avvia l'ambiente di sviluppo
./start-dev.sh
```

Questo avvierà:
- Backend FastAPI su `http://localhost:8000`
- Frontend React su `http://localhost:5173`
- Documentazione API su `http://localhost:8000/docs`

### Opzione 2: Docker Production

```bash
# Avvia con Docker
./start-docker.sh
```

Questo avvierà:
- Frontend su `http://localhost:3000`
- Backend API su `http://localhost:8000`

## Utilizzo

### 1. Upload dei File
- Trascina file Excel (.xlsx, .xls) nell'area di upload
- Clicca "Merge Files" per unire i dataset

### 2. Analisi Dataset
- Vai al Dashboard per analizzare gli header
- Seleziona le colonne utili automaticamente
- Carica il dataset per l'analisi

### 3. Visualizzazione Risultati
- Scegli un gruppo di domande
- Seleziona il tipo di grafico
- Visualizza statistiche e grafici interattivi

## API Endpoints

### File Management
- `POST /upload-files` - Upload di file Excel
- `POST /merge-files` - Merge dei file caricati
- `POST /cleanup` - Pulizia file temporanei

### Data Analysis
- `POST /analyze-headers` - Analisi header del dataset
- `POST /select-columns` - Selezione colonne utili
- `POST /load-dataset` - Caricamento dataset per analisi
- `POST /analyze-question` - Analisi gruppi di domande

### Metadata
- `GET /question-groups` - Lista gruppi di domande
- `GET /chart-types` - Tipologie di grafici disponibili

## Tecnologie Utilizzate

### Backend
- **FastAPI** - Framework web Python moderno
- **Pandas** - Manipolazione e analisi dati
- **Plotly** - Generazione grafici interattivi
- **SciPy** - Calcoli statistici avanzati
- **Python-multipart** - Gestione upload file

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool veloce
- **Tailwind CSS** - Styling utility-first
- **React Router** - Navigation
- **React Dropzone** - File upload
- **Axios** - HTTP client
- **Plotly.js** - Visualizzazione grafici

### Infrastructure
- **Docker** - Containerizzazione
- **Docker Compose** - Orchestrazione multi-container
- **Nginx** - Web server per produzione

## Development

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Docker Build
```bash
# Build singoli container
docker build -t survey-backend ./backend
docker build -t survey-frontend ./frontend

# Build con Docker Compose
docker-compose build
```

## Configurazione

### Environment Variables
- `VITE_API_URL` - URL del backend (default: http://localhost:8000)
- `PYTHONPATH` - Path Python per il backend

### CORS Configuration
Il backend è configurato per accettare richieste da:
- `http://localhost:3000` (produzione)
- `http://localhost:5173` (sviluppo)

## Troubleshooting

### Porte Occupate
Se le porte 8000 o 3000 sono occupate:
```bash
# Trova e termina processi
lsof -i :8000
lsof -i :3000
kill -9 <PID>
```

### Docker Issues
```bash
# Reset completo Docker
docker-compose down
docker system prune -a
docker-compose up --build
```

### Log Debugging
```bash
# Logs Docker
docker-compose logs -f

# Logs singoli servizi
docker-compose logs backend
docker-compose logs frontend
```

## Features Future

- [ ] Autenticazione utenti
- [ ] Export risultati in PDF/Excel
- [ ] Salvataggio configurazioni analisi
- [ ] Dashboard analytics avanzato
- [ ] Confronto tra dataset multipli
- [ ] Integrazione database persistente

## Supporto

Per problemi o richieste di funzionalità, consulta la documentazione API completa su `http://localhost:8000/docs` quando l'applicazione è in esecuzione.
