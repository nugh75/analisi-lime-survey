export interface UploadResponse {
  uploaded_files: string[]
  message: string
}

export interface MergeResponse {
  merged_file: string
  message: string
}

export interface HeaderAnalysis {
  total_columns: number
  rows: number
  files_analyzed: number
  headers: string[]
}

export interface ColumnSelection {
  useful_columns: string[]
  total_selected: number
}

export interface Dataset {
  shape: [number, number]
  columns: string[]
  data: any[]
  info: any
}

export interface AnalysisResult {
  statistics: {
    mean?: number
    std?: number
    median?: number
    count?: number
    min?: number
    max?: number
  }
  charts: {
    [key: string]: {
      data: any[]
      layout: any
    }
  }
  question_group: string
}

export interface QuestionGroupsResponse {
  groups: string[]
}

export interface ChartTypesResponse {
  chart_types: string[]
}
