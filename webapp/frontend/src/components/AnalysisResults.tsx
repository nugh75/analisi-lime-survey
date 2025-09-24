import { Fragment, useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Download, Filter, ChevronLeft, ChevronRight, ChevronDown, FileText } from 'lucide-react'
import Plot from 'react-plotly.js'
import axios from 'axios'
import { API_BASE_URL } from '../services/api'
import { useProject } from '../context/ProjectContext'
import { useMode } from '../context/ModeContext'
import {
  extractQuestionNumber,
  getSubquestionTexts,
  sanitizeQuestionText,
  summarizeSubquestionResponses,
  type ResponseCategorySummary,
} from '../utils/questions'
import type { Data, Layout } from 'plotly.js'
import type {
  AnalyzeQuestionResponse,
  ChartTypeItem,
  QuestionGroupsResponse,
  DatasetSummary,
  SubQuestion,
  ChartTypesResponse,
} from '../types/api'

// Simple color palette for multi-trace charts
const PlotlyColors = [
  '#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A',
  '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52',
  '#2E86AB', '#A23B72', '#0B8457', '#EE6C4D', '#3D5A80',
]

const RESPONSE_TYPE_LABEL: Record<ResponseCategorySummary['type'], string> = {
  yes_no: 'Sì / No',
  yes_partial: 'Sì / In parte',
  likert: 'Scala Likert',
  other: '',
}

const canUseHistory = (() => {
  if (typeof window === 'undefined') return true
  try {
    const history = window.history
    return !!history && typeof history.replaceState === 'function'
  } catch (err) {
    console.warn('History API not available, skipping URL sync.', err)
    return false
  }
})()

interface AnalysisResultsProps {
  dataset: DatasetSummary | null
}

export default function AnalysisResults({ dataset = null }: AnalysisResultsProps) {
  const [questionGroups, setQuestionGroups] = useState<string[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [chartType, setChartType] = useState<string>('bar')
  const [chartTypes, setChartTypes] = useState<ChartTypeItem[]>([])
  const [analysisResult, setAnalysisResult] = useState<AnalyzeQuestionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>({})
  const [likertFamilies, setLikertFamilies] = useState<Record<string, string | null>>({})
  const [selectedSubIdx, setSelectedSubIdx] = useState<number>(0)
  const [showPercentages, setShowPercentages] = useState<boolean>(true)
  const { projectId, projectName, setProject } = useProject()
  const { mode } = useMode()
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const location = useLocation()
  const navigate = useNavigate()
  const [historyEnabled, setHistoryEnabled] = useState<boolean>(canUseHistory)
  const [expandedSubRows, setExpandedSubRows] = useState<Set<number>>(new Set())

  const baseQuestionText = useMemo(() => {
    if (analysisResult?.subquestions?.length) {
      const first = getSubquestionTexts(analysisResult.subquestions[0])
      if (first.base) return first.base
    }
    if (selectedGroup && groupLabels[selectedGroup]) {
      return sanitizeQuestionText(groupLabels[selectedGroup])
    }
    return ''
  }, [analysisResult, groupLabels, selectedGroup])

  const selectedSubTexts = useMemo(() => {
    if (!analysisResult?.subquestions?.length) return { base: '', detail: '', combined: '' }
    const safeIdx = Math.min(selectedSubIdx, analysisResult.subquestions.length - 1)
    return getSubquestionTexts(analysisResult.subquestions[safeIdx])
  }, [analysisResult, selectedSubIdx])

  const responseSummaries = useMemo(() => {
    if (!analysisResult?.subquestions?.length) return []
    return analysisResult.subquestions.map((sq) => summarizeSubquestionResponses(sq))
  }, [analysisResult])

  const selectedResponseSummary = useMemo<ResponseCategorySummary | null>(() => {
    if (!analysisResult?.subquestions?.length) return null
    const safeIdx = Math.min(selectedSubIdx, analysisResult.subquestions.length - 1)
    return responseSummaries[safeIdx] ?? summarizeSubquestionResponses(analysisResult.subquestions[safeIdx])
  }, [analysisResult, responseSummaries, selectedSubIdx])

  const selectedSubYesCount = selectedResponseSummary?.hasYes ? selectedResponseSummary.yesCount : null
  const selectedSubPartialCount = selectedResponseSummary?.hasPartial ? selectedResponseSummary.partialCount : null
  const selectedSubNoCount = selectedResponseSummary?.hasNo ? selectedResponseSummary.noCount : null

  const hasYesColumn = useMemo(
    () => responseSummaries.some((summary) => summary.hasYes),
    [responseSummaries],
  )
  const hasPartialColumn = useMemo(
    () => responseSummaries.some((summary) => summary.hasPartial),
    [responseSummaries],
  )
  const hasNoColumn = useMemo(
    () => responseSummaries.some((summary) => summary.hasNo),
    [responseSummaries],
  )

  const showInlineStatsColumns = useMemo(() => {
    if (!analysisResult?.subquestions?.length) return false
    return analysisResult.subquestions.some((sq) => {
      const hasDistribution = Array.isArray(sq.distribution) && sq.distribution.length > 0
      const stats = sq.statistics
      const hasStatsValues = Boolean(
        stats && (
          typeof stats.mean === 'number' ||
          typeof stats.median === 'number' ||
          typeof stats.std === 'number'
        ),
      )
      return !hasDistribution && hasStatsValues
    })
  }, [analysisResult])

  const detailColSpan = useMemo(() => {
    const baseColumns = 3 // #, Dettagli, Domanda
    const yesColumn = hasYesColumn ? 1 : 0
    const partialColumn = hasPartialColumn ? 1 : 0
    const noColumn = hasNoColumn ? 1 : 0
    const responseColumns = 2 // Conteggio, Mancanti
    const statsColumns = showInlineStatsColumns ? 3 : 0
    return baseColumns + yesColumn + partialColumn + noColumn + responseColumns + statsColumns
  }, [hasNoColumn, hasPartialColumn, hasYesColumn, showInlineStatsColumns])

  const groupSummary = useMemo(() => {
    if (!analysisResult?.subquestions?.length) return null

    let totalResponsesSum = 0
    let missingSum = 0
    let distributionCount = 0

    analysisResult.subquestions.forEach((sq) => {
      if (typeof sq.statistics?.total_responses === 'number' && Number.isFinite(sq.statistics.total_responses)) {
        totalResponsesSum += sq.statistics.total_responses
      }
      if (typeof sq.statistics?.missing_values === 'number' && Number.isFinite(sq.statistics.missing_values)) {
        missingSum += sq.statistics.missing_values
      }
      if (Array.isArray(sq.distribution) && sq.distribution.length > 0) {
        distributionCount += 1
      }
    })

    const totalRows = analysisResult.subquestions.length
    const denominator = totalResponsesSum + missingSum
    const missingRate = denominator > 0 ? (missingSum / denominator) * 100 : null

    return {
      totalRows,
      totalResponsesSum,
      missingSum,
      distributionCount,
      onlyStatsCount: totalRows - distributionCount,
      missingRate,
    }
  }, [analysisResult])

  useEffect(() => {
    setExpandedSubRows(new Set())
  }, [analysisResult, selectedGroup])

  const toggleSubDistribution = (index: number) => {
    setExpandedSubRows(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (dataset) {
      loadQuestionGroups()
      loadChartTypes()
    }
  }, [dataset])

  // Reset analysis state on project change
  useEffect(() => {
    setAnalysisResult(null)
    setQuestionGroups([])
    setSelectedGroup('')
    setSelectedSubIdx(0)
  }, [projectId])

  // In view mode, auto-analyze when dataset and selectedGroup are ready
  useEffect(() => {
    if (mode === 'view' && dataset && selectedGroup) {
      analyzeQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dataset, selectedGroup])

  // Re-run analysis when toggling percentages if a group is selected
  useEffect(() => {
    if (dataset && selectedGroup) {
      analyzeQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPercentages])

  // Re-run analysis when chart type changes
  useEffect(() => {
    if (dataset && selectedGroup) {
      analyzeQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType])

  // Load projects for inline selector (useful in View mode)
  useEffect(() => {
    const loadProjects = async () => {
      try {
  const res = await axios.get(`${API_BASE_URL}/projects`)
        setProjects(res.data.projects || [])
      } catch (e) {
        console.warn('Failed to load projects', e)
      }
    }
    loadProjects()
  }, [])

  const loadQuestionGroups = async () => {
    try {
      const url = projectId 
        ? `${API_BASE_URL}/projects/${projectId}/question-groups`
        : `${API_BASE_URL}/question-groups`
      const response = await axios.get<QuestionGroupsResponse>(url)
      setQuestionGroups(response.data.groups)
      setGroupLabels(response.data.labels || {})
      setLikertFamilies(response.data.likert_families || {})
    } catch (err) {
      // Se è un progetto e il dataset non è caricato, prova auto-load con merged_file
      if (projectId) {
        try {
          const proj = await axios.get(`${API_BASE_URL}/projects/${projectId}`)
          const merged = proj.data?.merged_file
          if (merged) {
            await axios.post(`${API_BASE_URL}/projects/${projectId}/load-dataset`, {
              file_path: merged,
            })
            // Riprova a caricare i gruppi
            const response2 = await axios.get(`${API_BASE_URL}/projects/${projectId}/question-groups`)
            setQuestionGroups(response2.data.groups)
            setGroupLabels(response2.data.labels || {})
            setLikertFamilies(response2.data.likert_families || {})
            return
          }
        } catch (e) {
          console.error('Auto-load dataset fallito:', e)
        }
      }
      console.error('Failed to load question groups:', err)
    }
  }

  // Determine if current group is Likert-like (enables certain chart types)
  const isLikertGroup = (() => {
    if (!selectedGroup) return false
    const fam = likertFamilies[selectedGroup]
    return !!fam && fam !== 'non-likert'
  })()

  // Auto-fallback if a disallowed chart type is active for a non-Likert group
  useEffect(() => {
    const disallowedForNonLikert = new Set(['histogram','gaussian','box_likert','stacked_100','heatmap_corr','box_multi'])
    if (!isLikertGroup && disallowedForNonLikert.has(chartType)) {
      setChartType('bar')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, isLikertGroup])

  const loadChartTypes = async () => {
    try {
      const response = await axios.get<ChartTypesResponse>(`${API_BASE_URL}/chart-types`)
      // Backend returns array of objects { value, label, description }
      setChartTypes(response.data.chart_types)
      if (response.data.chart_types?.length) {
        setChartType(response.data.chart_types[0].value)
      }
    } catch (err) {
      console.error('Failed to load chart types:', err)
    }
  }

  // Align selection with question list and URL parameter (?group=)
  useEffect(() => {
    if (!questionGroups.length) {
      setSelectedGroup(prev => (prev ? '' : prev))
      return
    }

    if (!historyEnabled) {
      setSelectedGroup(prev => {
        if (prev && questionGroups.includes(prev)) {
          return prev
        }
        return questionGroups[0]
      })
      return
    }

    const params = new URLSearchParams(location.search)
    const requested = params.get('group')

    if (requested && questionGroups.includes(requested)) {
      setSelectedGroup(prev => (prev === requested ? prev : requested))
      return
    }

    setSelectedGroup(prev => {
      if (!prev || !questionGroups.includes(prev)) {
        return questionGroups[0]
      }
      return prev
    })
  }, [questionGroups, location.search, historyEnabled])

  // Keep URL in sync with current selection for deep-linking and navigation from list
  useEffect(() => {
    if (!questionGroups.length || !historyEnabled) return

    const params = new URLSearchParams(location.search)

    if (!selectedGroup) {
      if (!params.has('group')) return
      params.delete('group')
    } else if (params.get('group') === selectedGroup) {
      return
    } else {
      params.set('group', selectedGroup)
    }

    const search = params.toString()
    try {
      navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
    } catch (err) {
      console.warn('Failed to sync URL, disabling history updates.', err)
      setHistoryEnabled(false)
    }
  }, [selectedGroup, location.pathname, location.search, navigate, questionGroups, historyEnabled])

  const analyzeQuestion = async (groupOverride?: string) => {
    const groupKey = groupOverride ?? selectedGroup
    if (!groupKey) return

    setLoading(true)
    try {
      // Backend expects form fields: group_key, chart_type, show_percentages, include_na
      const form = new FormData()
      form.append('group_key', groupKey)
      form.append('chart_type', chartType)
      form.append('show_percentages', showPercentages ? 'true' : 'false')
      form.append('include_na', 'false')

      const url = projectId 
        ? `${API_BASE_URL}/projects/${projectId}/analyze-question`
        : `${API_BASE_URL}/analyze-question`
      const response = await axios.post<AnalyzeQuestionResponse>(url, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setAnalysisResult(response.data)
      setSelectedSubIdx(0)
    } catch (err) {
      console.error('Failed to analyze question:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatGroupOption = (group: string) => {
    const numberFromKey = extractQuestionNumber(group)
    const numberFromLabel = extractQuestionNumber(groupLabels[group])
    const label = sanitizeQuestionText(groupLabels[group] || group)
    const numberToUse = numberFromKey || numberFromLabel

    if (numberToUse && label) {
      return `Domanda ${numberToUse} – ${label}`
    }
    if (label) return label
    if (numberToUse) return `Domanda ${numberToUse}`
    return group
  }

  const downloadChart = () => {
    const chartCfg = analysisResult?.subquestions?.[0]?.chart
    if (!chartCfg) return

    const element = document.createElement('a')
    const file = new Blob([JSON.stringify(chartCfg)], { 
      type: 'application/json' 
    })
    element.href = URL.createObjectURL(file)
    element.download = `${selectedGroup}_${chartType}.json`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const goPrevGroup = () => {
    if (!questionGroups.length || !selectedGroup) return
    const idx = questionGroups.findIndex(g => g === selectedGroup)
    if (idx <= 0) return
    const next = questionGroups[idx - 1]
    setSelectedGroup(next)
    if (mode !== 'view') {
      analyzeQuestion(next)
    }
  }

  const goNextGroup = () => {
    if (!questionGroups.length || !selectedGroup) return
    const idx = questionGroups.findIndex(g => g === selectedGroup)
    if (idx === -1 || idx >= questionGroups.length - 1) return
    const next = questionGroups[idx + 1]
    setSelectedGroup(next)
    if (mode !== 'view') {
      analyzeQuestion(next)
    }
  }

  const goPrevSub = () => {
    if (!analysisResult?.subquestions?.length) return
    setSelectedSubIdx(prev => Math.max(0, prev - 1))
  }

  const goNextSub = () => {
    if (!analysisResult?.subquestions?.length) return
    setSelectedSubIdx(prev => Math.min(analysisResult.subquestions.length - 1, prev + 1))
  }

  const exportCSV = () => {
    const dist = analysisResult?.subquestions?.[selectedSubIdx]?.distribution
    if (!dist) return
    const rows = [
      ['Valore', 'Conteggio', 'Percentuale (%)'],
      ...dist.map((r) => [r.value, r.count, typeof r.percentage === 'number' ? r.percentage.toFixed(1) : r.percentage])
    ]
    const csv = rows.map(r => r.map((v) => {
      const s = String(v ?? '')
      // Escape double quotes and wrap if needed
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }).join(','))
    .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = `${selectedGroup || 'gruppo'}_dettaglio.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!dataset) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="card text-center">
          <BarChart3 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nessun dataset caricato</h2>
          {mode === 'view' ? (
            <p className="text-gray-600">
              In modalità Visualizza si può solo consultare i risultati. Seleziona un progetto con un file unito (merged) oppure passa a "Modifica" per preparare i dati.
            </p>
          ) : (
            <p className="text-gray-600">Carica e prepara un dataset dalla Dashboard per vedere i risultati.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Dataset Info (moved to top, before analysis controls) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{dataset.total_rows ?? 0}</div>
          <div className="text-sm text-gray-600">Righe</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{dataset.total_columns ?? 0}</div>
          <div className="text-sm text-gray-600">Colonne</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{questionGroups.length}</div>
          <div className="text-sm text-gray-600">Gruppi di domande</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{chartTypes.length}</div>
          <div className="text-sm text-gray-600">Tipi di grafico</div>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Risultati dell'analisi</h2>
            {projectId && (
              <p className="text-base text-gray-600 mb-4">Progetto attivo: <span className="font-medium">{projectName}</span></p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {/* Inline Project Switcher (View mode) */}
  {mode === 'view' && (
              <select
                value={projectId || ''}
                onChange={(e) => {
                  const id = e.target.value || null
                  const name = id ? (projects.find(p => p.id === id)?.name || null) : null
      setProject(id, name)
                }}
                className="text-base py-2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 min-w-[220px]"
              >
        <option value="">Predefinito</option>
                {projectId && !projects.some(p => p.id === projectId) && (
                  <option value={projectId}>{projectName || projectId}</option>
                )}
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <button onClick={goPrevGroup} className="btn-secondary px-3 py-2" disabled={!selectedGroup}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={goNextGroup} className="btn-secondary px-3 py-2" disabled={!selectedGroup}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        {(selectedGroup || baseQuestionText || selectedSubTexts.detail) && (
          <div className="text-gray-700 mb-4 text-lg space-y-1">
            {selectedGroup && (
              <div>
                <span className="font-medium">Gruppo:</span> {selectedGroup}
              </div>
            )}
            {baseQuestionText && (
              <div className="text-base">
                <span className="font-medium">Domanda:</span> {baseQuestionText}
              </div>
            )}
            {selectedResponseSummary && selectedResponseSummary.type !== 'other' && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Tipologia risposte:</span> {RESPONSE_TYPE_LABEL[selectedResponseSummary.type]}
              </div>
            )}
            {selectedSubTexts.detail && (
              <div className="text-base">
                <span className="font-medium">Opzione selezionata:</span> {selectedSubTexts.detail}
                {selectedSubYesCount !== null && (
                  <>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="font-medium">
                      {selectedResponseSummary?.yesLabel
                        ? `Risposte "${selectedResponseSummary.yesLabel}"`
                        : 'Risposte "Sì"'}
                    </span>{' '}
                    {selectedSubYesCount}
                  </>
                )}
                {selectedSubPartialCount !== null && (
                  <>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="font-medium">
                      {selectedResponseSummary?.partialLabel
                        ? `Risposte "${selectedResponseSummary.partialLabel}"`
                        : 'Risposte "In parte"'}
                    </span>{' '}
                    {selectedSubPartialCount}
                  </>
                )}
                {selectedSubNoCount !== null && (
                  <>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="font-medium">
                      {selectedResponseSummary?.noLabel
                        ? `Risposte "${selectedResponseSummary.noLabel}"`
                        : 'Risposte "No"'}
                    </span>{' '}
                    {selectedSubNoCount}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Gruppo di domande
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2"
            >
              {questionGroups.map((group) => (
                <option
                  key={group}
                  value={group}
                  title={sanitizeQuestionText(groupLabels[group] || group)}
                >
                  {formatGroupOption(group)}
                </option>
              ))}
            </select>
          </div>
          {/* spazio libero per uniformità layout */}
          <div></div>
        </div>
      </div>

      

      {/* Analysis Results */}
  {analysisResult && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Analisi: {selectedGroup}
            </h3>
            <div className="flex gap-2">
              <button onClick={goPrevSub} className="btn-secondary px-3 py-2" disabled={selectedSubIdx <= 0}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={goNextSub} className="btn-secondary px-3 py-2" disabled={!(analysisResult?.subquestions) || selectedSubIdx >= analysisResult.subquestions.length - 1}>
                <ChevronRight className="h-5 w-5" />
              </button>
              <button onClick={exportCSV} className="btn-secondary px-3 py-2">
                <FileText className="h-5 w-5 mr-2" />
                Esporta CSV
              </button>
              <button onClick={downloadChart} className="btn-secondary px-3 py-2">
                <Download className="h-5 w-5 mr-2" />
                Scarica grafico
              </button>
            </div>
          </div>

          {/* Numeric report per subquestion */}
          {analysisResult?.subquestions && analysisResult.subquestions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xl font-medium text-gray-900 mb-3">Report numerico</h4>
              {groupSummary && (
                <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-sm text-gray-500">Sottodomande</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{groupSummary.totalRows}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-sm text-gray-500">Con distribuzione</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{groupSummary.distributionCount}</div>
                    <div className="text-xs text-gray-500">Solo statistiche: {groupSummary.onlyStatsCount}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-sm text-gray-500">Somma risposte valide</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{groupSummary.totalResponsesSum}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-sm text-gray-500">Somma mancanti</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{groupSummary.missingSum}</div>
                    {typeof groupSummary.missingRate === 'number' && (
                      <div className="text-xs text-gray-500">{groupSummary.missingRate.toFixed(1)}% sul totale</div>
                    )}
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-base">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="p-2">#</th>
                      <th className="p-2 w-12">Dettagli</th>
                      <th className="p-2">Domanda</th>
                      {hasYesColumn && <th className="p-2">Risposte Sì</th>}
                      {hasPartialColumn && <th className="p-2">Risposte In parte</th>}
                      {hasNoColumn && <th className="p-2">Risposte No</th>}
                      <th className="p-2">Conteggio</th>
                      <th className="p-2">Mancanti</th>
                      {showInlineStatsColumns && (
                        <>
                          <th className="p-2">Media</th>
                          <th className="p-2">Mediana</th>
                          <th className="p-2">Dev. Std</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.subquestions.map((sq, idx: number) => {
                      const texts = getSubquestionTexts(sq)
                      const hasDistribution = Array.isArray(sq.distribution) && sq.distribution.length > 0
                      const summary = responseSummaries[idx] ?? summarizeSubquestionResponses(sq)
                      const yesCount = summary?.hasYes ? summary.yesCount : null
                      const partialCount = summary?.hasPartial ? summary.partialCount : null
                      const yesLabel = summary?.yesLabel
                      const partialLabel = summary?.partialLabel
                      const noCount = summary?.hasNo ? summary.noCount : null
                      const noLabel = summary?.noLabel
                      const stats = sq.statistics
                      const meanValue = typeof stats?.mean === 'number' ? stats.mean : null
                      const medianValue = typeof stats?.median === 'number' ? stats.median : null
                      const stdValue = typeof stats?.std === 'number' ? stats.std : null
                      const showStatsInline = showInlineStatsColumns && !hasDistribution
                      const hasSummaryDetails = Boolean(summary && (summary.hasYes || summary.hasPartial || summary.hasNo))
                      const canExpand = hasDistribution || Boolean(stats) || hasSummaryDetails
                      const isExpanded = expandedSubRows.has(idx)
                      const distribution = hasDistribution ? sq.distribution ?? [] : []
                      const expandLabel = hasDistribution
                        ? 'dettagli distribuzione'
                        : hasSummaryDetails
                          ? 'dettagli risposta'
                          : 'dettagli statistici'

                      return (
                        <Fragment key={idx}>
                          <tr className="border-t border-gray-200">
                            <td className="p-2 align-top">{sq.index}</td>
                            <td className="p-2 align-top">
                              {canExpand ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSubDistribution(idx)}
                                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  aria-expanded={isExpanded}
                                  aria-label={isExpanded ? `Nascondi ${expandLabel}` : `Mostra ${expandLabel}`}
                                >
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                  />
                                </button>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="p-2 align-top">
                              <div className="font-medium text-gray-900">{texts.detail || texts.combined || sq.column}</div>
                            </td>
                            {hasYesColumn && (
                              <td className="p-2 align-top">
                                {summary?.hasYes ? (yesCount !== null ? yesCount : 'N/D') : ''}
                              </td>
                            )}
                            {hasPartialColumn && (
                              <td className="p-2 align-top">
                                {summary?.hasPartial ? (partialCount !== null ? partialCount : 'N/D') : ''}
                              </td>
                            )}
                            {hasNoColumn && (
                              <td className="p-2 align-top">
                                {summary?.hasNo ? (noCount !== null ? noCount : 'N/D') : ''}
                              </td>
                            )}
                            <td className="p-2 align-top">{typeof stats?.total_responses === 'number' ? stats.total_responses : 'N/D'}</td>
                            <td className="p-2 align-top">{typeof stats?.missing_values === 'number' ? stats.missing_values : 'N/D'}</td>
                            {showInlineStatsColumns && (
                              <>
                                <td className="p-2 align-top">{showStatsInline ? (meanValue !== null ? meanValue.toFixed(2) : 'N/D') : ''}</td>
                                <td className="p-2 align-top">{showStatsInline ? (medianValue !== null ? medianValue.toFixed(2) : 'N/D') : ''}</td>
                                <td className="p-2 align-top">{showStatsInline ? (stdValue !== null ? stdValue.toFixed(2) : 'N/D') : ''}</td>
                              </>
                            )}
                          </tr>
                          {isExpanded && canExpand && (
                            <tr className="border-t border-gray-100 bg-gray-50">
                              <td className="p-0" colSpan={detailColSpan}>
                                <div className="px-4 py-4">
                                  <div
                                    className={`grid grid-cols-1 gap-4 ${hasDistribution ? 'lg:grid-cols-2' : ''}`}
                                  >
                                    {hasDistribution && (
                                      <div>
                                        <div className="text-sm font-medium text-gray-700 mb-2">Distribuzione risposte</div>
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full text-sm">
                                            <thead>
                                              <tr className="text-left text-gray-600">
                                                <th className="p-2">Valore</th>
                                                <th className="p-2">Conteggio</th>
                                                <th className="p-2">Percentuale</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {distribution.map((row, distIdx) => (
                                                <tr key={`${idx}-${distIdx}`} className="border-t border-gray-200">
                                                  <td className="p-2 align-top">{sanitizeQuestionText(row.value)}</td>
                                                  <td className="p-2 align-top">{row.count}</td>
                                                  <td className="p-2 align-top">{typeof row.percentage === 'number' ? `${row.percentage.toFixed(1)}%` : `${row.percentage}%`}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                    {(stats || summary?.hasYes || summary?.hasPartial || summary?.hasNo) && (
                                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                                        <div className="text-sm font-medium text-gray-700">Sintesi</div>
                                        {summary && summary.type !== 'other' && (
                                          <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                                            Tipologia:{' '}
                                            <span className="font-medium normal-case text-gray-900">
                                              {RESPONSE_TYPE_LABEL[summary.type]}
                                            </span>
                                          </div>
                                        )}
                                        <dl className="mt-3 space-y-2 text-sm text-gray-600">
                                          <div className="flex items-center justify-between">
                                            <dt>Risposte valide</dt>
                                            <dd className="font-medium text-gray-900">{typeof stats?.total_responses === 'number' ? stats.total_responses : 'N/D'}</dd>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <dt>Mancanti</dt>
                                            <dd className="font-medium text-gray-900">{typeof stats?.missing_values === 'number' ? stats.missing_values : 'N/D'}</dd>
                                          </div>
                                          {summary?.hasYes && (
                                            <div className="flex items-center justify-between">
                                              <dt>{yesLabel ? `Risposte "${yesLabel}"` : 'Risposte "Sì"'}</dt>
                                              <dd className="font-medium text-gray-900">{yesCount !== null ? yesCount : 'N/D'}</dd>
                                            </div>
                                          )}
                                          {summary?.hasPartial && (
                                            <div className="flex items-center justify-between">
                                              <dt>{partialLabel ? `Risposte "${partialLabel}"` : 'Risposte "In parte"'}</dt>
                                              <dd className="font-medium text-gray-900">{partialCount !== null ? partialCount : 'N/D'}</dd>
                                            </div>
                                          )}
                                          {summary?.hasNo && (
                                            <div className="flex items-center justify-between">
                                              <dt>{noLabel ? `Risposte "${noLabel}"` : 'Risposte "No"'}</dt>
                                              <dd className="font-medium text-gray-900">{noCount !== null ? noCount : 'N/D'}</dd>
                                            </div>
                                          )}
                                        </dl>
                                        {(meanValue !== null || medianValue !== null || stdValue !== null) && (
                                          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                                            <div>
                                              <div className="text-xs uppercase tracking-wide text-gray-500">Media</div>
                                              <div className="text-base font-semibold text-gray-900">{meanValue !== null ? meanValue.toFixed(2) : 'N/D'}</div>
                                            </div>
                                            <div>
                                              <div className="text-xs uppercase tracking-wide text-gray-500">Mediana</div>
                                              <div className="text-base font-semibold text-gray-900">{medianValue !== null ? medianValue.toFixed(2) : 'N/D'}</div>
                                            </div>
                                            <div>
                                              <div className="text-xs uppercase tracking-wide text-gray-500">Dev. Std</div>
                                              <div className="text-base font-semibold text-gray-900">{stdValue !== null ? stdValue.toFixed(2) : 'N/D'}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Distribution table for selected subquestion */}
          {analysisResult?.subquestions?.[selectedSubIdx]?.distribution && (
            <div className="mb-6">
              <h4 className="text-xl font-medium text-gray-900 mb-3">Dettaglio risposte (domanda selezionata)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-base">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="p-2">Valore</th>
                      <th className="p-2">Conteggio</th>
                      <th className="p-2">Percentuale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.subquestions[selectedSubIdx].distribution!.map((row, idx: number) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="p-2 align-top">{row.value}</td>
                        <td className="p-2 align-top">{row.count}</td>
                        <td className="p-2 align-top">{typeof row.percentage === 'number' ? `${row.percentage.toFixed(1)}%` : `${row.percentage}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Totale risposte: <span className="font-medium">{analysisResult.subquestions[selectedSubIdx].statistics?.total_responses ?? 0}</span>
                {typeof analysisResult.subquestions[selectedSubIdx].statistics?.missing_values === 'number' && (
                  <>
                    <span className="mx-2 text-gray-400">•</span>
                    Mancanti: <span className="font-medium">{analysisResult.subquestions[selectedSubIdx].statistics?.missing_values}</span>
                  </>
                )}
              </p>
            </div>
          )}
            <div className="flex items-end gap-3">
              <label className="inline-flex items-center gap-2 text-base text-gray-700 mb-1">
                <input
                  type="checkbox"
                  checked={showPercentages}
                  onChange={(e) => setShowPercentages(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Mostra percentuali
              </label>
              <button
                onClick={() => analyzeQuestion()}
                disabled={loading || !selectedGroup}
                className="btn-primary disabled:opacity-50 text-base px-4 py-2"
              >
                <Filter className="h-5 w-5 mr-2" />
                {loading ? 'Analisi in corso...' : 'Analizza'}
              </button>
            </div>

          {/* Chart-type selector placed right after the distribution table */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Tipo di grafico</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-full md:w-80 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2"
              >
                {chartTypes.map((type, index) => {
                  const value = type.value
                  const disabled = (!isLikertGroup && ['histogram','gaussian','box_likert','stacked_100','heatmap_corr','box_multi'].includes(value))
                  return (
                    <option key={index} value={value} disabled={disabled}>
                      {type.label}{disabled ? ' • (solo Likert)' : ''}
                    </option>
                  )
                })}
              </select>
              {!isLikertGroup && (
                <p className="text-sm text-gray-500 mt-1">Alcuni grafici sono disponibili solo per gruppi con scala Likert.</p>
              )}
            </div>
          </div>

          {/* Group-level charts for specific types */}
          {analysisResult?.group_chart && (chartType === 'stacked_100' || chartType === 'heatmap_corr' || chartType === 'box_multi') && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              {(() => {
                const gc = analysisResult.group_chart
                if (gc && chartType === 'stacked_100' && gc.chart_type === 'stacked_100') {
                  const x = gc.x
                  const traces: Data[] = gc.traces.map((t, idx: number) => ({
                    type: 'bar',
                    x,
                    y: t.values,
                    name: t.name,
                    marker: { color: PlotlyColors[idx % PlotlyColors.length] },
                  }))
                  return (
                    <Plot
                      data={traces}
                      layout={{
                        title: { text: gc.title || 'Distribuzione 100% (gruppo)' },
                        barmode: 'stack',
                        margin: { l: 60, r: 40, t: 60, b: 100 },
                        yaxis: { title: { text: gc.y_label || 'Percentuale (%)' }, range: [0, 100] },
                        xaxis: { automargin: true },
                      } as Partial<Layout>}
                      config={{ displaylogo: false, responsive: true }}
                      useResizeHandler
                      style={{ width: '100%', height: '560px' }}
                    />
                  )
                }
                if (gc && chartType === 'heatmap_corr' && gc.chart_type === 'heatmap_corr') {
                  return (
                    <Plot
                      data={[{
                        type: 'heatmap',
                        z: gc.matrix,
                        x: gc.labels,
                        y: gc.labels,
                        colorscale: 'RdBu',
                        reversescale: true,
                        zmin: -1,
                        zmax: 1,
                        colorbar: { title: { text: 'Corr' } },
                      }] as Data[]}
                      layout={{
                        title: { text: gc.title || 'Correlazioni (gruppo)' },
                        margin: { l: 120, r: 40, t: 60, b: 120 },
                        xaxis: { automargin: true },
                        yaxis: { automargin: true },
                      } as Partial<Layout>}
                      config={{ displaylogo: false, responsive: true }}
                      useResizeHandler
                      style={{ width: '100%', height: '640px' }}
                    />
                  )
                }
                if (gc && chartType === 'box_multi' && gc.chart_type === 'box_multi') {
                  const traces: Data[] = gc.traces.map((t, idx: number) => ({
                    type: 'box',
                    y: t.y,
                    name: t.name,
                    boxpoints: 'outliers',
                    marker: { color: PlotlyColors[idx % PlotlyColors.length] },
                  }))
                  return (
                    <Plot
                      data={traces}
                      layout={{
                        title: { text: gc.title || 'Box plot multiplo (gruppo)' },
                        margin: { l: 60, r: 40, t: 60, b: 100 },
                        yaxis: { title: { text: gc.y_label || 'Punteggio Likert' } },
                        xaxis: { automargin: true },
                        boxmode: 'group',
                      } as Partial<Layout>}
                      config={{ displaylogo: false, responsive: true }}
                      useResizeHandler
                      style={{ width: '100%', height: '560px' }}
                    />
                  )
                }
                return null
              })()}
            </div>
          )}

          {/* Small multiples: grid of subcharts */}
          {chartType === 'small_multiples' && analysisResult?.subquestions?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {analysisResult.subquestions.map((sq: SubQuestion, idx: number) => {
                const chart = sq.chart
                if (!chart || sq.error) return null
                const labels = chart.labels || []
                const values = chart.values || []
                const text = chart.text_labels || []
                const colors = chart.colors || []
                return (
                  <div key={idx} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="mb-2 text-sm font-medium text-gray-900">{sanitizeQuestionText(chart.title_main || chart.title)}</div>
                    <Plot
                      data={[{
                        type: 'bar',
                        x: labels,
                        y: values,
                        text: text,
                        marker: { color: colors },
                      }] as Data[]}
                      layout={{
                        margin: { l: 40, r: 20, t: 10, b: 60 },
                        yaxis: { title: { text: chart.y_label } },
                        xaxis: { automargin: true },
                      } as Partial<Layout>}
                      config={{ displaylogo: false, responsive: true }}
                      useResizeHandler
                      style={{ width: '100%', height: '360px' }}
                    />
                    {chart.title_sub && (
                      <div className="mt-2 text-xs text-gray-600">{sanitizeQuestionText(chart.title_sub)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Chart for selected subquestion */}
          {analysisResult?.subquestions?.[selectedSubIdx]?.chart && chartType !== 'small_multiples' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {/* Subquestion selector */}
              {analysisResult.subquestions.length > 1 && (
                <div className="mb-4 flex items-center gap-2">
                  <button onClick={goPrevSub} className="btn-secondary px-3 py-2" disabled={selectedSubIdx <= 0}>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <select
                    value={selectedSubIdx}
                    onChange={(e) => setSelectedSubIdx(parseInt(e.target.value, 10))}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2"
                  >
                    {analysisResult.subquestions.map((sq, idx: number) => {
                      const texts = getSubquestionTexts(sq)
                      const summary = summarizeSubquestionResponses(sq)
                      const label = texts.detail || texts.combined || sq.column
                      const badgeParts: string[] = []
                      if (summary.hasYes && summary.yesCount !== null) {
                        badgeParts.push(`${summary.yesLabel || 'Sì'}: ${summary.yesCount}`)
                      }
                      if (summary.hasPartial && summary.partialCount !== null) {
                        badgeParts.push(`${summary.partialLabel || 'In parte'}: ${summary.partialCount}`)
                      }
                      if (summary.hasNo && summary.noCount !== null) {
                        badgeParts.push(`${summary.noLabel || 'No'}: ${summary.noCount}`)
                      }
                      return (
                        <option key={idx} value={idx} title={texts.combined || sq.column}>
                          {badgeParts.length > 0 ? `${label} (${badgeParts.join(' • ')})` : label}
                        </option>
                      )
                    })}
                  </select>
                  <button onClick={goNextSub} className="btn-secondary px-3 py-2" disabled={selectedSubIdx >= analysisResult.subquestions.length - 1}>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
              {(() => {
                const chart = analysisResult.subquestions[selectedSubIdx].chart
                const ct = chart?.chart_type || chartType
                const labels = chart?.labels || []
                const values = chart?.values || []
                const text = chart?.text_labels || []
                const colors = chart?.colors || []

                let data: Data[] = []
                let layout: Partial<Layout> = {
                  title: { text: chart?.title },
                  autosize: true,
                  margin: { l: 60, r: 40, t: 60, b: 100 },
                }

                if (ct === 'pie' || ct === 'donut') {
                  data = [{
                    type: 'pie',
                    labels,
                    values,
                    text: text,
                    textinfo: 'label+percent',
                    marker: { colors },
                    hole: ct === 'donut' ? (chart?.hole ?? 0.5) : 0,
                  } as Data]
                  layout = { ...layout, margin: { l: 40, r: 40, t: 60, b: 40 } }
                } else if (ct === 'histogram' || ct === 'gaussian') {
                  const x = chart?.numeric_data || []
                  const bins = chart?.bins || undefined
                  const traces: Data[] = [{
                    type: 'histogram',
                    x,
                    nbinsx: bins,
                    histnorm: 'probability density',
                    marker: { color: colors[0] || '#4ECDC4' },
                    opacity: 0.6,
                  } as Data]
                  if (ct === 'gaussian' && chart?.gaussian && x.length > 1) {
                    const mean = chart.gaussian.mean
                    const std = chart.gaussian.std || 1
                    // Build a smooth PDF curve across the data range
                    const minX = Math.min(...x)
                    const maxX = Math.max(...x)
                    const steps = 100
                    const xs: number[] = []
                    const ys: number[] = []
                    for (let i = 0; i <= steps; i++) {
                      const xv = minX + (i * (maxX - minX)) / steps
                      const yv = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((xv - mean) / std, 2))
                      xs.push(xv)
                      ys.push(yv)
                    }
                    traces.push({
                      type: 'scatter',
                      mode: 'lines',
                      x: xs,
                      y: ys,
                      line: { color: '#E17055', width: 2 },
                      name: 'Gaussiana',
                    } as Data)
                  }
                  data = traces
                  layout = { ...layout, xaxis: { title: { text: chart?.x_label || 'Valore' } }, yaxis: { title: { text: 'Densità' } } }
                } else if (ct === 'box_likert') {
                  const y = chart?.numeric_data || []
                  data = [{
                    type: 'box',
                    y,
                    name: chart?.title || 'Distribuzione',
                    boxpoints: 'outliers',
                    marker: { color: colors[0] || '#4ECDC4' },
                  } as Data]
                  layout = { ...layout, yaxis: { title: { text: chart?.y_label || 'Punteggio Likert' } } }
                } else {
                  // bar, bar_h, likert_bar fall back to bar visuals
                  const isHorizontal = ct === 'bar_h'
                  data = [{
                    type: 'bar',
                    x: isHorizontal ? values : labels,
                    y: isHorizontal ? labels : values,
                    text: text,
                    marker: { color: colors },
                    orientation: isHorizontal ? 'h' : 'v',
                  } as Data]
                  if (isHorizontal) {
                    // Ensure long category labels are fully visible on the left
                    layout = {
                      ...layout,
                      xaxis: { title: { text: chart?.y_label }, automargin: true },
                      yaxis: { automargin: true },
                      margin: { ...(layout.margin || {}), l: Math.max((layout.margin?.l ?? 0), 160) },
                    }
                  } else {
                    layout = { ...layout, yaxis: { title: { text: chart?.y_label } }, xaxis: { automargin: true } }
                  }
                }

                return (
                  <Plot
                    data={data}
                    layout={layout}
                    config={{
                      displayModeBar: true,
                      displaylogo: false,
                      modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
                      responsive: true,
                    }}
                    useResizeHandler
                    style={{ width: '100%', height: '640px' }}
                  />
                )
              })()}
              {/* Subtitle under single chart (from bracketed text) */}
              {(() => {
                const chart = analysisResult.subquestions[selectedSubIdx].chart
                const sub = chart?.title_sub
                if (!sub) return null
                return <div className="mt-2 text-sm text-gray-600">{sanitizeQuestionText(sub)}</div>
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
