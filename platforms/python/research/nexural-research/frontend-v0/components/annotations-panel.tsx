'use client'

import { useState } from 'react'
import { useAnnotationsSafe, Annotation } from '@/lib/annotations-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  MessageSquare,
  Flag,
  Bookmark,
  TrendingDown,
  Target,
  Milestone,
  Plus,
  X,
  Check,
  RotateCcw,
  Filter,
  Send,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const typeIcons: Record<Annotation['type'], React.ReactNode> = {
  note: <MessageSquare className="h-4 w-4" />,
  flag: <Flag className="h-4 w-4" />,
  highlight: <Bookmark className="h-4 w-4" />,
  drawdown: <TrendingDown className="h-4 w-4" />,
  trade: <Target className="h-4 w-4" />,
  milestone: <Milestone className="h-4 w-4" />,
}

const typeColors: Record<Annotation['type'], string> = {
  note: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  flag: 'bg-red-500/10 text-red-500 border-red-500/20',
  highlight: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  drawdown: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  trade: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  milestone: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
}

interface AnnotationFormProps {
  onSubmit: (data: {
    type: Annotation['type']
    title: string
    content: string
    tags: string[]
  }) => void
  onCancel: () => void
  initialData?: Partial<Annotation>
}

function AnnotationForm({ onSubmit, onCancel, initialData }: AnnotationFormProps) {
  const [type, setType] = useState<Annotation['type']>(initialData?.type || 'note')
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }
  
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ type, title, content, tags })
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(typeIcons) as Annotation['type'][]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm capitalize transition-colors',
                type === t
                  ? typeColors[t]
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {typeIcons[t]}
              {t}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Annotation title..."
          required
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add details..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Tags</label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tag..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          {initialData ? 'Update' : 'Create'} Annotation
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

interface AnnotationCardProps {
  annotation: Annotation
}

function AnnotationCard({ annotation }: AnnotationCardProps) {
  const ctx = useAnnotationsSafe()
  const [showReplies, setShowReplies] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  
  if (!ctx) return null
  
  const { selectAnnotation, resolveAnnotation, deleteAnnotation, addReply } = ctx
  
  const handleReply = () => {
    if (replyContent.trim()) {
      addReply(annotation.id, replyContent)
      setReplyContent('')
    }
  }
  
  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all cursor-pointer hover:border-primary/50',
        annotation.resolved && 'opacity-60',
        typeColors[annotation.type]
      )}
      onClick={() => selectAnnotation(annotation)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {typeIcons[annotation.type]}
          <span className="font-medium text-sm">{annotation.title}</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => resolveAnnotation(annotation.id, !annotation.resolved)}>
              {annotation.resolved ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reopen
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Resolve
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-negative"
              onClick={() => deleteAnnotation(annotation.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {annotation.content && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {annotation.content}
        </p>
      )}
      
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: annotation.userColor }}
          >
            {annotation.userName.slice(0, 2).toUpperCase()}
          </div>
          <span>{formatDistanceToNow(new Date(annotation.createdAt), { addSuffix: true })}</span>
        </div>
        
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            setShowReplies(!showReplies)
          }}
        >
          <MessageSquare className="h-3 w-3" />
          {annotation.replies.length}
        </button>
      </div>
      
      {annotation.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {annotation.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      
      {showReplies && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-3" onClick={(e) => e.stopPropagation()}>
          {annotation.replies.map((reply) => (
            <div key={reply.id} className="flex gap-2">
              <div
                className="h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: reply.userColor }}
              >
                {reply.userName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{reply.userName}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-0.5">{reply.content}</p>
              </div>
            </div>
          ))}
          
          <div className="flex gap-2">
            <Input
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Reply..."
              className="text-sm h-8"
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            />
            <Button size="icon" className="h-8 w-8" onClick={handleReply}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AnnotationsPanel() {
  const ctx = useAnnotationsSafe()
  
  if (!ctx) return null
  
  const {
    filteredAnnotations,
    isCreating,
    setIsCreating,
    createAnnotation,
    filterType,
    setFilterType,
    showResolved,
    setShowResolved,
    allTags,
  } = ctx
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Annotations
          {filteredAnnotations.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {filteredAnnotations.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Annotations</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as Annotation['type'] | 'all')}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
                <SelectItem value="flag">Flags</SelectItem>
                <SelectItem value="highlight">Highlights</SelectItem>
                <SelectItem value="drawdown">Drawdowns</SelectItem>
                <SelectItem value="trade">Trades</SelectItem>
                <SelectItem value="milestone">Milestones</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant={showResolved ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowResolved(!showResolved)}
            >
              <Check className="h-3 w-3 mr-1" />
              Resolved
            </Button>
            
            <div className="flex-1" />
            
            <Button size="sm" className="h-8" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          
          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.slice(0, 10).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Create Form */}
          {isCreating && (
            <div className="p-4 border border-primary/50 rounded-lg bg-card">
              <AnnotationForm
                onSubmit={(data) => {
                  createAnnotation({
                    ...data,
                    sessionId: '',
                    userId: 'user-1',
                    userName: 'Quant Analyst',
                    userColor: '#10b981',
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname,
                  })
                }}
                onCancel={() => setIsCreating(false)}
              />
            </div>
          )}
          
          {/* Annotations List */}
          <div className="space-y-3">
            {filteredAnnotations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No annotations yet</p>
                <p className="text-xs mt-1">Click Add to create your first annotation</p>
              </div>
            ) : (
              filteredAnnotations.map((annotation) => (
                <AnnotationCard key={annotation.id} annotation={annotation} />
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Chart annotation marker component
interface AnnotationMarkerProps {
  annotation: Annotation
  onClick?: () => void
}

export function AnnotationMarker({ annotation, onClick }: AnnotationMarkerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute transform -translate-x-1/2 -translate-y-1/2 p-1 rounded-full border-2 transition-all hover:scale-110 z-10',
        typeColors[annotation.type]
      )}
      style={{ left: annotation.x, top: annotation.y }}
      title={annotation.title}
    >
      {typeIcons[annotation.type]}
    </button>
  )
}
