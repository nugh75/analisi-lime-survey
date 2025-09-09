import axios from 'axios'
import type {
  UploadResponse,
  MergeResponse,
  HeaderAnalysis,
  ColumnSelection,
  Dataset,
  AnalysisResult,
  QuestionGroupsResponse,
  ChartTypesResponse
} from '../types/api'

const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for large file operations
})

export const apiService = {
  // File management
  uploadFiles: async (files: File[]): Promise<UploadResponse> => {
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

  mergeFiles: async (): Promise<MergeResponse> => {
    const response = await api.post('/merge-files')
    return response.data
  },

  cleanup: async (): Promise<{ message: string }> => {
    const response = await api.post('/cleanup')
    return response.data
  },

  // Data analysis
  analyzeHeaders: async (): Promise<HeaderAnalysis> => {
    const response = await api.post('/analyze-headers')
    return response.data
  },

  selectColumns: async (): Promise<ColumnSelection> => {
    const response = await api.post('/select-columns')
    return response.data
  },

  loadDataset: async (columns: string[]): Promise<Dataset> => {
    const response = await api.post('/load-dataset', { columns })
    return response.data
  },

  analyzeQuestion: async (questionGroup: string, chartTypes: string[]): Promise<AnalysisResult> => {
    const response = await api.post('/analyze-question', {
      question_group: questionGroup,
      chart_types: chartTypes
    })
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
