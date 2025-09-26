import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Users, ListChecks, FileSpreadsheet, HardDrive, Database, AlertTriangle } from 'lucide-react'
import { API_BASE_URL } from '../services/api'
import type { ProjectInfo } from '../types/api'

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('it-IT')
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('it-IT')
}

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}

export default function ProjectsOverview() {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await axios.get<{ projects: ProjectInfo[] }>(`${API_BASE_URL}/projects`)
        setProjects(res.data?.projects ?? [])
      } catch (e) {
        setError('Impossibile caricare i progetti')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const aggregates = useMemo(() => {
    const totals = {
      projects: projects.length,
      respondents: 0,
      datasets: 0,
      size: 0,
    }
    projects.forEach((p) => {
      if (typeof p.records_count === 'number') totals.respondents += p.records_count
      if (typeof p.datasets_count === 'number') totals.datasets += p.datasets_count
      if (typeof p.total_size_bytes === 'number') totals.size += p.total_size_bytes
    })
    return totals
  }, [projects])

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panoramica indagini</h2>
          <p className="text-gray-600">Elenco sintetico degli studi disponibili e del numero di rispondenti</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Progetti</div>
            <div className="text-2xl font-semibold text-gray-900">{formatNumber(aggregates.projects)}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <ListChecks className="h-8 w-8 text-green-600" />
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Rispondenti totali</div>
            <div className="text-2xl font-semibold text-gray-900">{formatNumber(aggregates.respondents)}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <HardDrive className="h-8 w-8 text-purple-600" />
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Spazio occupato</div>
            <div className="text-2xl font-semibold text-gray-900">{formatSize(aggregates.size)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Dettaglio progetti</h3>
          <span className="text-sm text-gray-500">Aggiornato automaticamente</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Caricamento in corso...</div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Nessun progetto disponibile</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Indagine</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rispondenti</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">File caricati</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dataset generati</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">File unito</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ultimo caricamento dati</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ultimo accesso analisi</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dimensione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{project.name || project.id}</div>
                      <div className="text-xs text-gray-500">Creato il {formatDate(project.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>{formatNumber(project.records_count)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-gray-500" />
                        <span>{formatNumber(project.files_count)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatNumber(project.datasets_count)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate" title={project.merged_file || undefined}>
                      {project.merged_file || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(project.last_updated_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(project.last_loaded_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatSize(project.total_size_bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
