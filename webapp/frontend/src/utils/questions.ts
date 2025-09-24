import type { SubQuestion } from '../types/api'

export const sanitizeQuestionText = (value: string | null | undefined): string => {
  if (!value) return ''
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const normalizeSeparators = (value: string): string => {
  return value
    .replace(/_/g, '.')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\.\s*/g, '.')
}

const safeNormalize = (value: string): string => {
  try {
    return value.normalize('NFD')
  } catch {
    return value
  }
}

const stripDiacritics = (value: string): string => {
  if (!value) return ''
  return safeNormalize(value).replace(/[\u0300-\u036f]/g, '')
}

export const extractQuestionNumber = (value: string | null | undefined): string => {
  if (!value) return ''
  const normalized = normalizeSeparators(String(value))
  const multiLevel = normalized.match(/\d+(?:[.-]\d+)*/)
  if (multiLevel && multiLevel[0]) {
    return multiLevel[0].replace(/-/g, '.')
  }
  const single = normalized.match(/\d+/)
  return single ? single[0] : ''
}

export const getSectionPrefix = (value: string | null | undefined): string => {
  const number = extractQuestionNumber(value)
  if (!number) return ''
  const parts = number.split('.')
  const first = parts[0]
  const asInt = parseInt(first, 10)
  return Number.isNaN(asInt) ? first : String(asInt)
}

export const compareQuestionNumbers = (a: string, b: string): number => {
  if (a === b) return 0
  const split = (input: string) => input.split('.').map(part => {
    const num = parseInt(part, 10)
    return Number.isNaN(num) ? part : num
  })

  const aParts = split(a)
  const bParts = split(b)
  const maxLen = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < maxLen; i += 1) {
    const aPart = aParts[i]
    const bPart = bParts[i]
    if (aPart === undefined) return -1
    if (bPart === undefined) return 1
    if (typeof aPart === 'number' && typeof bPart === 'number') {
      if (aPart !== bPart) return aPart - bPart
    } else if (typeof aPart === 'number') {
      return -1
    } else if (typeof bPart === 'number') {
      return 1
    } else if (aPart !== bPart) {
      return String(aPart).localeCompare(String(bPart))
    }
  }

  return 0
}

const bracketSuffixPattern = /(.*?)(\[[^\]]+\])\s*$/

const pickBracketSuffix = (input: string): string => {
  const match = input.match(/\[[^\]]+\]\s*$/)
  return match ? match[0].trim() : ''
}

export const getSubquestionTexts = (sq: SubQuestion | null | undefined) => {
  const empty = { base: '', detail: '', combined: '' }
  if (!sq) return empty

  const chart = sq.chart
  const rawBase = chart?.title_main ?? chart?.title ?? ''
  const rawDetail = chart?.title_sub ?? ''

  let base = sanitizeQuestionText(rawBase)
  let detail = sanitizeQuestionText(rawDetail)

  if (!detail) {
    const match = (chart?.title ?? '').match(bracketSuffixPattern) || (chart?.title_main ?? '').match(bracketSuffixPattern) || sq.column.match(bracketSuffixPattern)
    if (match) {
      base = sanitizeQuestionText(match[1])
      detail = sanitizeQuestionText(match[2])
    }
  }

  if (!detail) {
    const bracketFromBase = pickBracketSuffix(rawBase)
    if (bracketFromBase) {
      detail = sanitizeQuestionText(bracketFromBase)
      base = sanitizeQuestionText(rawBase.replace(bracketSuffixPattern, '$1'))
    }
  }

  if (!detail) {
    const bracketFromColumn = pickBracketSuffix(sq.column)
    if (bracketFromColumn) {
      detail = sanitizeQuestionText(bracketFromColumn)
    }
  }

  const normalizedBase = base.trim()
  const normalizedDetail = detail.trim()
  const combined = normalizedDetail ? `${normalizedBase ? `${normalizedBase} ` : ''}${normalizedDetail}`.trim() : normalizedBase

  return {
    base: normalizedBase,
    detail: normalizedDetail,
    combined,
  }
}

const YES_TOKENS = new Set(['si', 's', 'yes', 'y', 'vero', 'v', 'true'])
const PARTIAL_TOKENS = new Set(['in parte', 'in parte si', 'parzialmente', 'parziale', 'in parte sì'])
const NO_TOKENS = new Set(['no', 'n', 'false'])
const LIKERT_TOKENS = new Set([
  'molto',
  'abbastanza',
  'poco',
  'per nulla',
  'per niente',
  'non so',
  'non saprei',
  'per nulla daccordo',
  'per niente daccordo',
  "per nulla d'accordo",
  "per niente d'accordo",
  'daccordo',
  "d'accordo",
  'in disaccordo',
  'molto daccordo',
  'abbastanza daccordo',
  'poco daccordo',
])

const normalizeForComparison = (value: string): string => {
  if (!value) return ''
  return stripDiacritics(sanitizeQuestionText(value)).toLowerCase()
}

const looksLikeYes = (value: string): boolean => {
  if (!value) return false
  const normalized = normalizeForComparison(value)
  if (!normalized) return false
  if (YES_TOKENS.has(normalized)) return true
  const numeric = Number(normalized.replace(',', '.'))
  if (!Number.isNaN(numeric)) {
    return numeric > 0
  }
  return false
}

const looksLikeNo = (value: string): boolean => {
  if (!value) return false
  const normalized = normalizeForComparison(value)
  if (!normalized) return false
  if (NO_TOKENS.has(normalized)) return true
  const numeric = Number(normalized.replace(',', '.'))
  if (!Number.isNaN(numeric)) {
    return numeric <= 0
  }
  return false
}

const looksLikePartial = (value: string): boolean => {
  if (!value) return false
  const normalized = normalizeForComparison(value)
  if (!normalized) return false
  if (PARTIAL_TOKENS.has(normalized)) return true
  return false
}

const normalizeLabel = (value: string | number): string => {
  if (typeof value === 'number') return String(value)
  const cleaned = sanitizeQuestionText(value)
  return cleaned || String(value)
}

export interface ResponseCategorySummary {
  type: 'yes_no' | 'yes_partial' | 'likert' | 'other'
  hasYes: boolean
  hasPartial: boolean
  hasNo: boolean
  yesCount: number | null
  partialCount: number | null
  noCount: number | null
  yesLabel?: string
  partialLabel?: string
  noLabel?: string
}

export const summarizeSubquestionResponses = (sq: SubQuestion | null | undefined): ResponseCategorySummary => {
  const empty: ResponseCategorySummary = {
    type: 'other',
    hasYes: false,
    hasPartial: false,
    hasNo: false,
    yesCount: null,
    partialCount: null,
    noCount: null,
  }

  if (!sq) return empty

  const distributions = Array.isArray(sq.distribution) ? sq.distribution : []
  let yesCount = 0
  let partialCount = 0
  let noCount = 0
  let yesSeen = false
  let partialSeen = false
  let noSeen = false
  let yesLabel: string | undefined
  let partialLabel: string | undefined
  let noLabel: string | undefined
  const likertMatches = new Set<string>()

  distributions.forEach((row) => {
    const label = normalizeLabel(row.value as string)
    const normalized = normalizeForComparison(label)
    if (LIKERT_TOKENS.has(normalized)) {
      likertMatches.add(normalized)
    }

    if (looksLikeYes(label)) {
      yesLabel = yesLabel || label
      if (typeof row.count === 'number') {
        yesCount += row.count
        yesSeen = true
      }
    } else if (looksLikePartial(label)) {
      partialLabel = partialLabel || label
      if (typeof row.count === 'number') {
        partialCount += row.count
        partialSeen = true
      }
    } else if (looksLikeNo(label)) {
      noLabel = noLabel || label
      if (typeof row.count === 'number') {
        noCount += row.count
        noSeen = true
      }
    }
  })

  const texts = getSubquestionTexts(sq)
  const detail = texts.detail || texts.combined
  const base = texts.base

  const detailLooksYes = looksLikeYes(detail)
  const detailLooksPartial = looksLikePartial(detail)
  const detailLooksNo = looksLikeNo(detail)

  if (!yesSeen && (detailLooksYes || looksLikeYes(base))) {
    yesSeen = true
    yesLabel = yesLabel || (detailLooksYes ? detail : base)
    if (typeof sq.statistics?.total_responses === 'number') {
      yesCount = sq.statistics.total_responses
    }
  }

  if (!partialSeen && (detailLooksPartial || looksLikePartial(base))) {
    partialSeen = true
    partialLabel = partialLabel || (detailLooksPartial ? detail : base)
    if (typeof sq.statistics?.total_responses === 'number') {
      partialCount = sq.statistics.total_responses
    }
  }

  if (!noSeen && (detailLooksNo || looksLikeNo(base))) {
    noSeen = true
    noLabel = noLabel || (detailLooksNo ? detail : base)
    if (typeof sq.statistics?.total_responses === 'number') {
      noCount = sq.statistics.total_responses
    }
  }

  let type: ResponseCategorySummary['type'] = 'other'
  if (yesSeen && partialSeen) {
    type = 'yes_partial'
  } else if (yesSeen && noSeen) {
    type = 'yes_no'
  } else if (likertMatches.size >= 2) {
    type = 'likert'
  }

  return {
    type,
    hasYes: yesSeen,
    hasPartial: partialSeen,
    hasNo: noSeen,
    yesCount: yesSeen ? yesCount : null,
    partialCount: partialSeen ? partialCount : null,
    noCount: noSeen ? noCount : null,
    yesLabel,
    partialLabel,
    noLabel,
  }
}

export const getYesCount = (sq: SubQuestion | null | undefined): number | null => {
  try {
    const summary = summarizeSubquestionResponses(sq)
    return summary.hasYes ? summary.yesCount : null
  } catch (err) {
    console.warn('Failed to compute yes-count for subquestion', err)
    return null
  }
}
