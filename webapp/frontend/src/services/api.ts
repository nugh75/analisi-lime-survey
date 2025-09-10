import axios from 'axios'
import type {
  UploadFilesResponse,
  MergeResponse,
  HeaderAnalysisRow,
  ColumnSelectionResponse,
  DatasetSummary,
  AnalyzeQuestionResponse,
  QuestionGroupsResponse,
  ChartTypesResponse,
  HeaderAnalysisResponse,
} from '../types/api'

// Central API base URL used across the app
// Same-origin path '/api' works in both environments:
//  - Dev: Vite proxy forwards '/api' -> backend (see vite.config.ts)
//  - Prod: Nginx forwards '/api' -> backend (see nginx.conf)
export const API_BASE_URL = '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for large file operations
})

export const apiService = {
  // File management
  uploadFiles: async (files: File[]): Promise<UploadFilesResponse> => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    
    const response = await api.post('/upload-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  mergeFiles: async (file_paths: string[]): Promise<MergeResponse> => {
    const response = await api.post('/merge-files', { file_paths })
    return response.data
  },

  cleanup: async (): Promise<{ message: string }> => {
    const response = await api.post('/cleanup')
    return response.data
  },

  // Data analysis
  analyzeHeaders: async (file_path: string): Promise<HeaderAnalysisResponse> => {
    const response = await api.post('/analyze-headers', { file_path })
    return response.data
  },

  selectColumns: async (file_path: string, headers_analysis: HeaderAnalysisRow[]): Promise<ColumnSelectionResponse> => {
    const response = await api.post('/select-columns', { file_path, headers_analysis })
    return response.data
  },

  loadDataset: async (file_path: string): Promise<DatasetSummary> => {
    const response = await api.post('/load-dataset', { file_path })
    return response.data
  },

  analyzeQuestion: async (form: FormData, projectId?: string): Promise<AnalyzeQuestionResponse> => {
    const url = projectId ? `/projects/${projectId}/analyze-question` : '/analyze-question'
    const response = await api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return response.data
  },

  // Metadata
  getQuestionGroups: async (): Promise<QuestionGroupsResponse> => {
    const response = await api.get('/question-groups')
    return response.data
  },

  getChartTypes: async (): Promise<ChartTypesResponse> => {
    const response = await api.get('/chart-types')
    return response.data
  }
}

export default apiService
