import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, List, Loader2 } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import type { DatasetSummary } from '../types/api'
import { compareQuestionNumbers, extractQuestionNumber, getSectionPrefix, sanitizeQuestionText } from '../utils/questions'

interface QuestionExplorerProps {
  dataset: DatasetSummary | null
  isLoading?: boolean
}

interface QuestionItem {
  key: string
  label: string
  number: string
}

interface GroupedQuestions {
  prefix: string
  questions: QuestionItem[]
}

export default function QuestionExplorer({ dataset, isLoading = false }: QuestionExplorerProps) {
  const navigate = useNavigate()
  const { projectId, projectName } = useProject()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isAutoLoading, setIsAutoLoading] = useState<boolean>(true)

  const groupedQuestions = useMemo<GroupedQuestions[]>(() => {
    if (!dataset) return []

    const groups = dataset.groups ?? []
    const labels = dataset.labels ?? {}

    const sectionsMap = new Map<string, QuestionItem[]>()

    groups.forEach((key) => {
      const rawLabel = labels[key]
      const sanitizedLabel = sanitizeQuestionText(rawLabel) || sanitizeQuestionText(key)
      const extractedFromKey = extractQuestionNumber(key)
      const extractedFromLabel = extractQuestionNumber(rawLabel)
      const number = extractedFromKey || extractedFromLabel || key
      const sectionPrefix = getSectionPrefix(extractedFromKey || extractedFromLabel || key) || 'Altre domande'

      if (!sectionsMap.has(sectionPrefix)) {
        sectionsMap.set(sectionPrefix, [])
      }

      sectionsMap.get(sectionPrefix)!.push({
        key,
        label: sanitizedLabel,
        number,
      })
    })

    const entries = Array.from(sectionsMap.entries()).map(([prefix, questions]) => ({
      prefix,
      questions: [...questions].sort((a, b) => {
        const numberComparison = compareQuestionNumbers(a.number, b.number)
        if (numberComparison !== 0) return numberComparison
        return a.key.localeCompare(b.key, undefined, { numeric: true })
      }),
    }))

    return entries.sort((a, b) => {
      const aNum = parseInt(a.prefix, 10)
      const bNum = parseInt(b.prefix, 10)
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum
      }
      if (!Number.isNaN(aNum)) return -1
      if (!Number.isNaN(bNum)) return 1
      return a.prefix.localeCompare(b.prefix, undefined, { numeric: true })
    })
  }, [dataset])

  useEffect(() => {
    if (!groupedQuestions.length) {
      setExpanded(new Set())
      return
    }

    setExpanded(prev => {
      if (prev.size > 0) {
        return prev
      }
      const first = groupedQuestions[0]?.prefix
      return first ? new Set([first]) : new Set()
    })
  }, [groupedQuestions])

  useEffect(() => {
    const timer = window.setTimeout(() => setIsAutoLoading(false), 500)
    return () => window.clearTimeout(timer)
  }, [])

  const toggleSection = (prefix: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(prefix)) {
        next.delete(prefix)
      } else {
        next.add(prefix)
      }
      return next
    })
  }

  const goToGroup = (groupKey: string) => {
    navigate(`/results?group=${encodeURIComponent(groupKey)}`)
  }

  if (isLoading) {
    return (
      <div className="max-w-screen-lg mx-auto">
        <div className="card text-center">
          <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Caricamento domande…</h2>
          <p className="text-gray-600">Stiamo recuperando i dettagli del questionario selezionato.</p>
        </div>
      </div>
    )
  }

  if (!dataset) {
    return (
      <div className="max-w-screen-lg mx-auto">
        <div className="card text-center">
          <List className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nessun questionario caricato</h2>
          <p className="text-gray-600">Carica e prepara un dataset dalla Dashboard per visualizzare l'elenco completo delle domande dell'indagine.</p>
        </div>
      </div>
    )
  }

  if (!groupedQuestions.length) {
    return (
      <div className="max-w-screen-lg mx-auto">
        <div className="card text-center">
          {isAutoLoading ? (
            <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
          ) : (
            <List className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          )}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nessuna domanda disponibile</h2>
          <p className="text-gray-600">
            Assicurati di aver selezionato e caricato le colonne utili del questionario dalla Dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Domande per esteso</h2>
            <p className="text-gray-600">
              Consulta tutte le domande del questionario. Le sezioni sono organizzate per numero e puoi aprirle o chiuderle per leggere il testo completo.
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            {projectId && (
              <div>
                Progetto attivo:
                <span className="font-medium ml-1">{projectName || projectId}</span>
              </div>
            )}
            <div>Domande totali: <span className="font-medium">{dataset.groups.length}</span></div>
          </div>
        </div>
      </div>

      {groupedQuestions.map(section => {
        const isExpanded = expanded.has(section.prefix)
        return (
          <div key={section.prefix} className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection(section.prefix)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                />
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {/^\d+$/.test(section.prefix) ? `Sezione ${section.prefix}` : section.prefix}
                  </div>
                  <div className="text-sm text-gray-500">{section.questions.length} domande</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">clicca per {isExpanded ? 'chiudere' : 'espandere'}</div>
            </button>
            {isExpanded && (
              <ul className="divide-y divide-gray-200">
                {section.questions.map(item => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => goToGroup(item.key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-blue-50 focus:outline-none focus-visible:bg-blue-50"
                    >
                      <div>
                        <div className="text-sm font-medium text-blue-700">Domanda {item.number}</div>
                        <div className="text-base text-gray-900 mt-1">{item.label}</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-blue-500" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
