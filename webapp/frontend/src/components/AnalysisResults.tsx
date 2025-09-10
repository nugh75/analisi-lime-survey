import { useState, useEffect } from 'react'
import { BarChart3, Download, Filter, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import Plot from 'react-plotly.js'
import axios from 'axios'
import { useProject } from '../context/ProjectContext'
import { useMode } from '../context/ModeContext'

// Simple color palette for multi-trace charts
const PlotlyColors = [
  '#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A',
  '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52',
  '#2E86AB', '#A23B72', '#0B8457', '#EE6C4D', '#3D5A80',
]

interface AnalysisResultsProps {
  dataset: any
}

export default function AnalysisResults({ dataset = null }: AnalysisResultsProps) {
  const [questionGroups, setQuestionGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [chartType, setChartType] = useState<string>('bar')
  const [chartTypes, setChartTypes] = useState<{ value: string; label: string }[]>([])
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>({})
  const [likertFamilies, setLikertFamilies] = useState<Record<string, string>>({})
  const [selectedSubIdx, setSelectedSubIdx] = useState<number>(0)
  const [showPercentages, setShowPercentages] = useState<boolean>(true)
  const { projectId, projectName, setProject } = useProject()
  const { mode } = useMode()
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])

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
        const res = await axios.get('http://localhost:8000/projects')
        setProjects(res.data.projects || [])
      } catch {}
    }
    loadProjects()
  }, [])

  const loadQuestionGroups = async () => {
    try {
      const url = projectId 
        ? `http://localhost:8000/projects/${projectId}/question-groups`
        : 'http://localhost:8000/question-groups'
      const response = await axios.get(url)
      setQuestionGroups(response.data.groups)
      setGroupLabels(response.data.labels || {})
  setLikertFamilies(response.data.likert_families || {})
      if (response.data.groups.length > 0) {
        setSelectedGroup(response.data.groups[0])
      }
    } catch (err) {
      // Se è un progetto e il dataset non è caricato, prova auto-load con merged_file
      if (projectId) {
        try {
          const proj = await axios.get(`http://localhost:8000/projects/${projectId}`)
          const merged = proj.data?.merged_file
          if (merged) {
            await axios.post(`http://localhost:8000/projects/${projectId}/load-dataset`, {
              file_path: merged,
            })
            // Riprova a caricare i gruppi
            const response2 = await axios.get(`http://localhost:8000/projects/${projectId}/question-groups`)
            setQuestionGroups(response2.data.groups)
            setGroupLabels(response2.data.labels || {})
            setLikertFamilies(response2.data.likert_families || {})
            if (response2.data.groups.length > 0) {
              setSelectedGroup(response2.data.groups[0])
            }
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
      const response = await axios.get('http://localhost:8000/chart-types')
      // Backend returns array of objects { value, label, description }
      setChartTypes(response.data.chart_types)
      if (response.data.chart_types?.length) {
        setChartType(response.data.chart_types[0].value)
      }
    } catch (err) {
      console.error('Failed to load chart types:', err)
    }
  }

  const analyzeQuestion = async () => {
    if (!selectedGroup) return

    setLoading(true)
    try {
      // Backend expects form fields: group_key, chart_type, show_percentages, include_na
      const form = new FormData()
      form.append('group_key', selectedGroup)
      form.append('chart_type', chartType)
  form.append('show_percentages', showPercentages ? 'true' : 'false')
      form.append('include_na', 'false')

      const url = projectId 
        ? `http://localhost:8000/projects/${projectId}/analyze-question`
        : 'http://localhost:8000/analyze-question'
      const response = await axios.post(url, form, {
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

  const sanitizeText = (s: string | undefined | null) => {
    if (!s) return ''
    return String(s)
      .replace(/<br\s*\/?\>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
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

  const goPrevGroup = async () => {
    if (!questionGroups.length || !selectedGroup) return
    const idx = questionGroups.findIndex(g => g === selectedGroup)
    if (idx <= 0) return
    const next = questionGroups[idx - 1]
    setSelectedGroup(next)
    await analyzeQuestion()
  }

  const goNextGroup = async () => {
    if (!questionGroups.length || !selectedGroup) return
    const idx = questionGroups.findIndex(g => g === selectedGroup)
    if (idx === -1 || idx >= questionGroups.length - 1) return
    const next = questionGroups[idx + 1]
    setSelectedGroup(next)
    await analyzeQuestion()
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
      ...dist.map((r: any) => [r.value, r.count, typeof r.percentage === 'number' ? r.percentage.toFixed(1) : r.percentage])
    ]
    const csv = rows.map(r => r.map((v: any) => {
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
        {selectedGroup && (
          <p className="text-gray-700 mb-4 text-lg">
      <span className="font-medium">Gruppo:</span> {selectedGroup}
            {groupLabels[selectedGroup] && (
              <>
                <span className="mx-2 text-gray-400">•</span>
        <span className="font-medium">Titolo:</span> {sanitizeText(groupLabels[selectedGroup])}
              </>
            )}
          </p>
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
              {questionGroups.map((group, index) => (
                <option key={index} value={group}>
                  {group}
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
              <div className="overflow-x-auto">
                <table className="min-w-full text-base">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="p-2">#</th>
                      <th className="p-2">Domanda</th>
                      <th className="p-2">Conteggio</th>
                      <th className="p-2">Mancanti</th>
                      <th className="p-2">Media</th>
                      <th className="p-2">Mediana</th>
                      <th className="p-2">Dev. Std</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.subquestions.map((sq: any, idx: number) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="p-2 align-top">{sq.index}</td>
                        <td className="p-2 align-top">
                          <div className="font-medium text-gray-900">{sanitizeText(sq.chart?.title) || sq.column}</div>
                        </td>
                        <td className="p-2 align-top">{sq.statistics?.total_responses ?? 'N/D'}</td>
                        <td className="p-2 align-top">{sq.statistics?.missing_values ?? 0}</td>
                        <td className="p-2 align-top">{typeof sq.statistics?.mean === 'number' ? sq.statistics.mean.toFixed(2) : 'N/D'}</td>
                        <td className="p-2 align-top">{typeof sq.statistics?.median === 'number' ? sq.statistics.median.toFixed(2) : 'N/D'}</td>
                        <td className="p-2 align-top">{typeof sq.statistics?.std === 'number' ? sq.statistics.std.toFixed(2) : (sq.statistics?.std ?? 'N/D')}</td>
                      </tr>
                    ))}
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
                    {analysisResult.subquestions[selectedSubIdx].distribution.map((row: any, idx: number) => (
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
                onClick={analyzeQuestion}
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
                if (chartType === 'stacked_100' && gc?.traces && gc?.x) {
                  const x = gc.x
                  const traces = (gc.traces as any[]).map((t: any, idx: number) => ({
                    type: 'bar',
                    x,
                    y: t.values,
                    name: t.name,
                    marker: { color: PlotlyColors[idx % PlotlyColors.length] },
                  }))
                  return (
                    <Plot
                      data={traces as any}
                      layout={{
                        title: gc.title || 'Distribuzione 100% (gruppo)',
                        barmode: 'stack',
                        margin: { l: 60, r: 40, t: 60, b: 100 },
                        yaxis: { title: gc.y_label || 'Percentuale (%)', range: [0, 100] },
                        xaxis: { automargin: true },
                      }}
                      config={{ displaylogo: false, responsive: true }}
                      useResizeHandler
                      style={{ width: '100%', height: '560px' }}
                    />
                  )
                }
                if (chartType === 'heatmap_corr' && gc?.matrix && gc?.labels) {
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
                      }]}
                      layout={{
                        title: gc.title || 'Correlazioni (gruppo)',
                        margin: { l: 120, r: 40, t: 60, b: 120 },
                        xaxis: { automargin: true },
                        yaxis: { automargin: true },
                      }}
                      config={{ displaylogo: false, responsive: true }}
                      useResizeHandler
                      style={{ width: '100%', height: '640px' }}
                    />
                  )
                }
                if (chartType === 'box_multi' && gc?.traces) {
                  const traces = (gc.traces as any[]).map((t: any, idx: number) => ({
                    type: 'box',
                    y: t.y,
                    name: t.name,
                    boxpoints: 'outliers',
                    marker: { color: PlotlyColors[idx % PlotlyColors.length] },
                  }))
                  return (
                    <Plot
                      data={traces as any}
                      layout={{
                        title: gc.title || 'Box plot multiplo (gruppo)',
                        margin: { l: 60, r: 40, t: 60, b: 100 },
                        yaxis: { title: gc.y_label || 'Punteggio Likert' },
                        xaxis: { automargin: true },
                        boxmode: 'group',
                      }}
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
              {analysisResult.subquestions.map((sq: any, idx: number) => {
                const chart = sq.chart
                if (!chart || chart.error) return null
                const labels = chart.labels || []
                const values = chart.values || []
                const text = chart.text_labels || []
                const colors = chart.colors || []
                return (
                  <div key={idx} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="mb-2 text-sm font-medium text-gray-900">{sanitizeText(chart.title_main || chart.title)}</div>
                    <Plot
                      data={[{
                        type: 'bar',
                        x: labels,
                        y: values,
                        text: text,
                        marker: { color: colors },
                      }]}
                      layout={{
                        margin: { l: 40, r: 20, t: 10, b: 60 },
                        yaxis: { title: chart.y_label },
                        xaxis: { automargin: true },
                      }}
                      config={{ displaylogo: false, responsive: true }}
                      useResizeHandler
                      style={{ width: '100%', height: '360px' }}
                    />
                    {chart.title_sub && (
                      <div className="mt-2 text-xs text-gray-600">{sanitizeText(chart.title_sub)}</div>
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
          {analysisResult.subquestions.map((sq: any, idx: number) => (
                      <option key={idx} value={idx}>
            {sanitizeText(sq.chart?.title) || sq.column}
                      </option>
                    ))}
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

                let data: any[] = []
                let layout: any = {
                  title: chart?.title,
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
                  }]
                  layout = { ...layout, margin: { l: 40, r: 40, t: 60, b: 40 } }
                } else if (ct === 'histogram' || ct === 'gaussian') {
                  const x = chart?.numeric_data || []
                  const bins = chart?.bins || undefined
                  const traces: any[] = [{
                    type: 'histogram',
                    x,
                    nbinsx: bins,
                    histnorm: 'probability density',
                    marker: { color: colors[0] || '#4ECDC4' },
                    opacity: 0.6,
                  }]
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
                    })
                  }
                  data = traces
                  layout = { ...layout, xaxis: { title: chart?.x_label || 'Valore' }, yaxis: { title: 'Densità' } }
                } else if (ct === 'box_likert') {
                  const y = chart?.numeric_data || []
                  data = [{
                    type: 'box',
                    y,
                    name: chart?.title || 'Distribuzione',
                    boxpoints: 'outliers',
                    marker: { color: colors[0] || '#4ECDC4' },
                  }]
                  layout = { ...layout, yaxis: { title: chart?.y_label || 'Punteggio Likert' } }
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
                  }]
                  layout = { ...layout, yaxis: { title: chart?.y_label }, xaxis: { automargin: true } }
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
                return <div className="mt-2 text-sm text-gray-600">{sanitizeText(sub)}</div>
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
