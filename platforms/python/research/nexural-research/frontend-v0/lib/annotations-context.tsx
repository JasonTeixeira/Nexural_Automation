'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useSession } from './session-context'

export type AnnotationType = 'note' | 'highlight' | 'flag' | 'question' | 'insight'
export type AnnotationTarget = 'trade' | 'date' | 'metric' | 'chart' | 'general'

export interface Annotation {
  id: string
  sessionId: string
  type: AnnotationType
  target: AnnotationTarget
  targetId?: string // trade_id, date, metric_name, etc.
  title: string
  content: string
  author: string
  createdAt: string
  updatedAt: string
  resolved: boolean
  replies: AnnotationReply[]
  tags: string[]
  color?: string
  position?: { x: number; y: number } // For chart annotations
}

export interface AnnotationReply {
  id: string
  annotationId: string
  content: string
  author: string
  createdAt: string
}

export interface AnnotationFilters {
  types?: AnnotationType[]
  targets?: AnnotationTarget[]
  resolved?: boolean
  author?: string
  tags?: string[]
  dateRange?: { start: string; end: string }
}

interface AnnotationsContextValue {
  annotations: Annotation[]
  filteredAnnotations: Annotation[]
  filters: AnnotationFilters
  setFilters: (filters: AnnotationFilters) => void
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'resolved'>) => Annotation
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  resolveAnnotation: (id: string) => void
  addReply: (annotationId: string, reply: Omit<AnnotationReply, 'id' | 'createdAt' | 'annotationId'>) => void
  getAnnotationsForTarget: (target: AnnotationTarget, targetId?: string) => Annotation[]
  exportAnnotations: () => string
  importAnnotations: (json: string) => void
  shareableLink: (annotationId: string) => string
}

const AnnotationsContext = createContext<AnnotationsContextValue | null>(null)

export function useAnnotations() {
  const context = useContext(AnnotationsContext)
  if (!context) {
    throw new Error('useAnnotations must be used within AnnotationsProvider')
  }
  return context
}

export function useAnnotationsSafe() {
  return useContext(AnnotationsContext)
}

const STORAGE_KEY = 'nexural_annotations'
const CURRENT_USER = 'Research Analyst' // Would come from auth in production

function generateId() {
  return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function AnnotationsProvider({ children }: { children: React.ReactNode }) {
  const { sessionId } = useSession()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [filters, setFilters] = useState<AnnotationFilters>({})

  // Load annotations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setAnnotations(JSON.parse(stored))
      } catch {
        console.error('Failed to parse stored annotations')
      }
    }
  }, [])

  // Save annotations to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations))
  }, [annotations])

  // Filter annotations
  const filteredAnnotations = annotations.filter(ann => {
    if (sessionId && ann.sessionId !== sessionId) return false
    if (filters.types?.length && !filters.types.includes(ann.type)) return false
    if (filters.targets?.length && !filters.targets.includes(ann.target)) return false
    if (filters.resolved !== undefined && ann.resolved !== filters.resolved) return false
    if (filters.author && ann.author !== filters.author) return false
    if (filters.tags?.length && !filters.tags.some(t => ann.tags.includes(t))) return false
    if (filters.dateRange) {
      const created = new Date(ann.createdAt)
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      if (created < start || created > end) return false
    }
    return true
  })

  const addAnnotation = useCallback((data: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'resolved'>) => {
    const now = new Date().toISOString()
    const annotation: Annotation = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      replies: [],
      resolved: false,
    }
    setAnnotations(prev => [annotation, ...prev])
    return annotation
  }, [])

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(ann => 
      ann.id === id 
        ? { ...ann, ...updates, updatedAt: new Date().toISOString() }
        : ann
    ))
  }, [])

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id))
  }, [])

  const resolveAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.map(ann =>
      ann.id === id
        ? { ...ann, resolved: true, updatedAt: new Date().toISOString() }
        : ann
    ))
  }, [])

  const addReply = useCallback((annotationId: string, reply: Omit<AnnotationReply, 'id' | 'createdAt' | 'annotationId'>) => {
    const newReply: AnnotationReply = {
      ...reply,
      id: generateId(),
      annotationId,
      createdAt: new Date().toISOString(),
    }
    setAnnotations(prev => prev.map(ann =>
      ann.id === annotationId
        ? { ...ann, replies: [...ann.replies, newReply], updatedAt: new Date().toISOString() }
        : ann
    ))
  }, [])

  const getAnnotationsForTarget = useCallback((target: AnnotationTarget, targetId?: string) => {
    return annotations.filter(ann => {
      if (sessionId && ann.sessionId !== sessionId) return false
      if (ann.target !== target) return false
      if (targetId && ann.targetId !== targetId) return false
      return true
    })
  }, [annotations, sessionId])

  const exportAnnotations = useCallback(() => {
    const data = sessionId 
      ? annotations.filter(a => a.sessionId === sessionId)
      : annotations
    return JSON.stringify(data, null, 2)
  }, [annotations, sessionId])

  const importAnnotations = useCallback((json: string) => {
    try {
      const imported: Annotation[] = JSON.parse(json)
      setAnnotations(prev => {
        const existingIds = new Set(prev.map(a => a.id))
        const newAnnotations = imported.filter(a => !existingIds.has(a.id))
        return [...prev, ...newAnnotations]
      })
    } catch {
      console.error('Failed to import annotations')
    }
  }, [])

  const shareableLink = useCallback((annotationId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/dashboard?annotation=${annotationId}`
  }, [])

  return (
    <AnnotationsContext.Provider
      value={{
        annotations,
        filteredAnnotations,
        filters,
        setFilters,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        resolveAnnotation,
        addReply,
        getAnnotationsForTarget,
        exportAnnotations,
        importAnnotations,
        shareableLink,
      }}
    >
      {children}
    </AnnotationsContext.Provider>
  )
}

// Helper component for annotation type icons and colors
export const annotationTypeConfig: Record<AnnotationType, { label: string; color: string; bgColor: string }> = {
  note: { label: 'Note', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  highlight: { label: 'Highlight', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  flag: { label: 'Flag', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  question: { label: 'Question', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  insight: { label: 'Insight', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
}

export const annotationTargetConfig: Record<AnnotationTarget, { label: string }> = {
  trade: { label: 'Trade' },
  date: { label: 'Date' },
  metric: { label: 'Metric' },
  chart: { label: 'Chart' },
  general: { label: 'General' },
}
