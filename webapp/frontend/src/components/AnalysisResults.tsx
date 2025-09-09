import { useState, useEffect } from 'react'
import { BarChart3, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import Plot from 'react-plotly.js'
import axios from 'axios'
import { useProject } from '../context/ProjectContext'

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
  const [selectedSubIdx, setSelectedSubIdx] = useState<number>(0)
  const { projectId, projectName } = useProject()

  useEffect(() => {
    if (dataset) {
      loadQuestionGroups()
      loadChartTypes()
    }
  }, [dataset])

  const loadQuestionGroups = async () => {
    try {
      const url = projectId 
        ? `http://localhost:8000/projects/${projectId}/question-groups`
        : 'http://localhost:8000/question-groups'
      const response = await axios.get(url)
      setQuestionGroups(response.data.groups)
      setGroupLabels(response.data.labels || {})
      if (response.data.groups.length > 0) {
        setSelectedGroup(response.data.groups[0])
      }
    } catch (err) {
      console.error('Failed to load question groups:', err)
    }
  }

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
      form.append('show_percentages', 'true')
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

  if (!dataset) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="card text-center">
          <BarChart3 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Dataset Loaded</h2>
          <p className="text-gray-600">Please load a dataset from the dashboard first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Controls */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Analysis Results</h2>
            {projectId && (
              <p className="text-base text-gray-600 mb-4">Progetto attivo: <span className="font-medium">{projectName}</span></p>
            )}
          </div>
          <div className="flex gap-2">
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
            <span className="font-medium">Group:</span> {selectedGroup}
            {groupLabels[selectedGroup] && (
              <>
                <span className="mx-2 text-gray-400">•</span>
                <span className="font-medium">Title:</span> {groupLabels[selectedGroup]}
              </>
            )}
          </p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Question Group
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
          
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2"
            >
              {chartTypes.map((type, index) => (
                <option key={index} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={analyzeQuestion}
              disabled={loading || !selectedGroup}
              className="btn-primary disabled:opacity-50 text-base px-4 py-2"
            >
              <Filter className="h-5 w-5 mr-2" />
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{dataset.total_groups ?? 0}</div>
          <div className="text-sm text-gray-600">Rows</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{questionGroups.length}</div>
          <div className="text-sm text-gray-600">Columns</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{chartTypes.length}</div>
          <div className="text-sm text-gray-600">Question Groups</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{dataset.total_groups ?? 0}</div>
          <div className="text-sm text-gray-600">Chart Types</div>
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Analysis: {selectedGroup}
            </h3>
            <div className="flex gap-2">
              <button onClick={goPrevSub} className="btn-secondary px-3 py-2" disabled={selectedSubIdx <= 0}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={goNextSub} className="btn-secondary px-3 py-2" disabled={!(analysisResult?.subquestions) || selectedSubIdx >= analysisResult.subquestions.length - 1}>
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={downloadChart}
                className="btn-secondary px-3 py-2"
              >
                <Download className="h-5 w-5 mr-2" />
                Download
              </button>
            </div>
          </div>

          {/* Numeric report per subquestion */}
          {analysisResult?.subquestions && analysisResult.subquestions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xl font-medium text-gray-900 mb-3">Numeric report</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-base">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="p-2">#</th>
                      <th className="p-2">Question</th>
                      <th className="p-2">Count</th>
                      <th className="p-2">Missing</th>
                      <th className="p-2">Mean</th>
                      <th className="p-2">Median</th>
                      <th className="p-2">Std Dev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.subquestions.map((sq: any, idx: number) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="p-2 align-top">{sq.index}</td>
                        <td className="p-2 align-top">
                          <div className="font-medium text-gray-900">{sq.chart?.title || sq.column}</div>
                        </td>
                        <td className="p-2 align-top">{sq.statistics?.total_responses ?? 'N/A'}</td>
                        <td className="p-2 align-top">{sq.statistics?.missing_values ?? 0}</td>
                        <td className="p-2 align-top">{typeof sq.statistics?.mean === 'number' ? sq.statistics.mean.toFixed(2) : 'N/A'}</td>
                        <td className="p-2 align-top">{typeof sq.statistics?.median === 'number' ? sq.statistics.median.toFixed(2) : 'N/A'}</td>
                        <td className="p-2 align-top">{typeof sq.statistics?.std === 'number' ? sq.statistics.std.toFixed(2) : (sq.statistics?.std ?? 'N/A')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Chart */}
          {analysisResult?.subquestions?.[selectedSubIdx]?.chart && (
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
                        {sq.chart?.title || sq.column}
                      </option>
                    ))}
                  </select>
                  <button onClick={goNextSub} className="btn-secondary px-3 py-2" disabled={selectedSubIdx >= analysisResult.subquestions.length - 1}>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
              <Plot
                data={[{
                  type: 'bar',
                  x: analysisResult.subquestions[selectedSubIdx].chart.labels,
                  y: analysisResult.subquestions[selectedSubIdx].chart.values,
                  text: analysisResult.subquestions[selectedSubIdx].chart.text_labels,
                  marker: { color: analysisResult.subquestions[selectedSubIdx].chart.colors },
                  orientation: chartType === 'bar_h' ? 'h' : 'v'
                }]}
                layout={{
                  title: analysisResult.subquestions[selectedSubIdx].chart.title,
                  autosize: true,
                  margin: { l: 60, r: 40, t: 60, b: 100 },
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
                  responsive: true,
                }}
                useResizeHandler
                style={{ width: '100%', height: '640px' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
