// General project info
export interface ProjectInfo {
  id: string
  name: string
  upload_dir?: string
  files?: string[]
  merged_file?: string | null
  created_at?: string
}

// Upload files (default or project-scoped)
export interface UploadFilesResponse {
  success: boolean
  message: string
  files: string[]
  file_paths: string[]
}

// Merge response
export interface MergeResponse {
  success: boolean
  rows: number
  columns: number
  files_processed: number
  merged_file: string
}

// Header analysis
export interface HeaderAnalysisRow {
  original_name: string
  normalized_name: string
  dtype: string
  row_count: number
  non_null_count: number
  null_count: number
  non_null_pct: number
  unique_count_non_null: number
  sample_values: string
}

export interface HeaderAnalysisResponse {
  headers: HeaderAnalysisRow[]
  total_rows: number
  total_columns: number
}

// Column selection result
export interface ColumnSelectionResponse {
  success: boolean
  selected_columns: number
  total_questions: number
  dataset_file: string
  columns: string[]
}

// Dataset summary after load
export interface DatasetSummary {
  success: boolean
  message: string
  groups: string[]
  labels: Record<string, string>
  likert_families: Record<string, string | null>
  total_groups: number
  total_rows: number
  total_columns: number
}

export interface QuestionGroupsResponse {
  groups: string[]
  labels: Record<string, string>
  likert_families: Record<string, string | null>
}

export interface ChartTypeItem {
  value: string
  label: string
  description: string
}

export interface ChartTypesResponse {
  chart_types: ChartTypeItem[]
}

// Analyze question group
export interface DistributionRow {
  value: string
  count: number
  percentage: number
}

export interface SubquestionStatistics {
  total_responses: number
  missing_values: number
  mean?: number
  median?: number
  std?: number
}

export interface ChartConfig {
  title?: string
  title_main?: string
  title_sub?: string
  labels?: string[]
  values?: number[]
  text_labels?: string[]
  colors?: string[]
  y_label?: string
  x_label?: string
  chart_type?: string
  hole?: number
  // Numeric charts
  numeric_data?: number[]
  bins?: number
  gaussian?: { mean: number; std: number }
}

export interface SubQuestion {
  index: number
  column: string
  statistics?: SubquestionStatistics
  distribution?: DistributionRow[]
  chart?: ChartConfig
  error?: string
}

export interface Stacked100GroupChart {
  chart_type: 'stacked_100'
  title?: string
  x: string[]
  traces: { name: string; values: number[] }[]
  y_label?: string
}

export interface HeatmapCorrGroupChart {
  chart_type: 'heatmap_corr'
  title?: string
  labels: string[]
  matrix: number[][]
}

export interface BoxMultiGroupChart {
  chart_type: 'box_multi'
  title?: string
  traces: { name: string; y: number[]; marker?: { color?: string } }[]
  y_label?: string
}

export type GroupChart = Stacked100GroupChart | HeatmapCorrGroupChart | BoxMultiGroupChart

export interface AnalyzeQuestionResponse {
  group_key: string
  description: string
  chart_type: string
  show_percentages: boolean
  include_na: boolean
  subquestions: SubQuestion[]
  group_chart?: GroupChart
}
