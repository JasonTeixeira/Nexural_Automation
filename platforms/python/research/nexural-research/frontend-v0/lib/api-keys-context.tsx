'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'groq' 
  | 'mistral' 
  | 'xai'
  | 'deepseek'
  | 'perplexity'
  | 'together'
  | 'fireworks'
  | 'custom'

export interface ProviderConfig {
  id: AIProvider
  name: string
  description: string
  keyPrefix: string
  baseUrl?: string
  models: { id: string; name: string; description: string }[]
  recommended: boolean
}

export const AI_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, o1, o3 models',
    keyPrefix: 'sk-',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest multimodal model' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast, capable' },
      { id: 'o1-preview', name: 'o1 Preview', description: 'Reasoning model' },
      { id: 'o3-mini', name: 'o3 Mini', description: 'Advanced reasoning' },
    ],
    recommended: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 4, Claude 3.5 Sonnet',
    keyPrefix: 'sk-ant-',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Latest, best for analysis' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Excellent reasoning' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' },
    ],
    recommended: true,
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini 2.0, Gemini 1.5 Pro',
    keyPrefix: 'AI',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast, multimodal' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Long context' },
    ],
    recommended: false,
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference',
    keyPrefix: 'gsk_',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Fast, capable' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Great for analysis' },
    ],
    recommended: false,
  },
  {
    id: 'xai',
    name: 'xAI',
    description: 'Grok models',
    keyPrefix: 'xai-',
    models: [
      { id: 'grok-2', name: 'Grok 2', description: 'Latest Grok model' },
      { id: 'grok-beta', name: 'Grok Beta', description: 'Experimental' },
    ],
    recommended: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Cost-effective reasoning',
    keyPrefix: 'sk-',
    baseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'V3 model' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'R1 reasoning' },
    ],
    recommended: false,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'European AI provider',
    keyPrefix: '',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most capable' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced' },
    ],
    recommended: false,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Search-augmented AI',
    keyPrefix: 'pplx-',
    models: [
      { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge Online', description: 'Web-connected' },
      { id: 'llama-3.1-sonar-large-128k-chat', name: 'Sonar Large', description: 'Fast chat' },
    ],
    recommended: false,
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Open-source models',
    keyPrefix: '',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B', description: 'Fast inference' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', description: 'Great reasoning' },
    ],
    recommended: false,
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Fast open-source models',
    keyPrefix: '',
    models: [
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B', description: 'Optimized' },
    ],
    recommended: false,
  },
]

export interface APIKeyConfig {
  id: string
  name: string
  provider: AIProvider
  keyMasked: string
  model: string
  isEnabled: boolean
  isValid?: boolean
  lastUsed?: Date
  createdAt: Date
  usageCount: number
}

export interface EnsembleConfig {
  enabled: boolean
  mode: 'parallel' | 'sequential' | 'voting'
  providers: string[] // key IDs to use
  aggregation: 'first' | 'merge' | 'best' | 'consensus'
}

interface APIKeysContextValue {
  keys: APIKeyConfig[]
  activeKeyId: string | null
  ensembleConfig: EnsembleConfig
  
  // Key management
  addKey: (name: string, provider: AIProvider, key: string, model: string) => string
  removeKey: (id: string) => void
  updateKey: (id: string, updates: Partial<APIKeyConfig>) => void
  setActiveKey: (id: string) => void
  toggleKeyEnabled: (id: string) => void
  validateKey: (id: string) => Promise<boolean>
  getDecryptedKey: (id: string) => string | null
  
  // Ensemble
  setEnsembleConfig: (config: Partial<EnsembleConfig>) => void
  getEnabledKeys: () => APIKeyConfig[]
  getEnsembleKeys: () => { key: APIKeyConfig; decrypted: string }[]
  
  // Status
  hasValidKey: boolean
  isEnsembleReady: boolean
}

const APIKeysContext = createContext<APIKeysContextValue | null>(null)

const STORAGE_KEY = 'nexural_api_keys_v2'
const KEYS_ENCRYPTED = 'nexural_keys_encrypted_v2'
const ACTIVE_KEY_STORAGE = 'nexural_active_key_v2'
const ENSEMBLE_STORAGE = 'nexural_ensemble_config'

// Simple encryption (demo only - use proper encryption in production)
function encryptKey(key: string): string {
  return btoa(key.split('').reverse().join(''))
}

function decryptKey(encrypted: string): string {
  try {
    return atob(encrypted).split('').reverse().join('')
  } catch {
    return ''
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return key.slice(0, 6) + '••••••••' + key.slice(-4)
}

export function APIKeysProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<APIKeyConfig[]>([])
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null)
  const [decryptedKeys, setDecryptedKeys] = useState<Map<string, string>>(new Map())
  const [ensembleConfig, setEnsembleConfigState] = useState<EnsembleConfig>({
    enabled: false,
    mode: 'parallel',
    providers: [],
    aggregation: 'merge',
  })
  
  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as APIKeyConfig[]
        setKeys(parsed.map(k => ({
          ...k,
          createdAt: new Date(k.createdAt),
          lastUsed: k.lastUsed ? new Date(k.lastUsed) : undefined,
        })))
      }
      
      const encryptedStore = localStorage.getItem(KEYS_ENCRYPTED)
      if (encryptedStore) {
        const encrypted = JSON.parse(encryptedStore) as Record<string, string>
        const decrypted = new Map<string, string>()
        Object.entries(encrypted).forEach(([id, enc]) => {
          decrypted.set(id, decryptKey(enc))
        })
        setDecryptedKeys(decrypted)
      }
      
      const activeId = localStorage.getItem(ACTIVE_KEY_STORAGE)
      if (activeId) setActiveKeyId(activeId)
      
      const ensembleStored = localStorage.getItem(ENSEMBLE_STORAGE)
      if (ensembleStored) {
        setEnsembleConfigState(JSON.parse(ensembleStored))
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }, [])
  
  // Save to localStorage
  useEffect(() => {
    if (keys.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [keys])
  
  useEffect(() => {
    if (activeKeyId) {
      localStorage.setItem(ACTIVE_KEY_STORAGE, activeKeyId)
    } else {
      localStorage.removeItem(ACTIVE_KEY_STORAGE)
    }
  }, [activeKeyId])
  
  useEffect(() => {
    localStorage.setItem(ENSEMBLE_STORAGE, JSON.stringify(ensembleConfig))
  }, [ensembleConfig])
  
  const addKey = useCallback((name: string, provider: AIProvider, key: string, model: string): string => {
    const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    
    const newKey: APIKeyConfig = {
      id,
      name,
      provider,
      keyMasked: maskKey(key),
      model,
      isEnabled: true,
      isValid: undefined,
      createdAt: new Date(),
      usageCount: 0,
    }
    
    setKeys(prev => [...prev, newKey])
    setDecryptedKeys(prev => new Map(prev).set(id, key))
    
    // Store encrypted
    const encryptedStore = JSON.parse(localStorage.getItem(KEYS_ENCRYPTED) || '{}')
    encryptedStore[id] = encryptKey(key)
    localStorage.setItem(KEYS_ENCRYPTED, JSON.stringify(encryptedStore))
    
    // Set as active if first key
    if (keys.length === 0) {
      setActiveKeyId(id)
    }
    
    return id
  }, [keys.length])
  
  const removeKey = useCallback((id: string) => {
    setKeys(prev => prev.filter(k => k.id !== id))
    setDecryptedKeys(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    
    const encryptedStore = JSON.parse(localStorage.getItem(KEYS_ENCRYPTED) || '{}')
    delete encryptedStore[id]
    localStorage.setItem(KEYS_ENCRYPTED, JSON.stringify(encryptedStore))
    
    if (activeKeyId === id) {
      const remaining = keys.filter(k => k.id !== id)
      setActiveKeyId(remaining.length > 0 ? remaining[0].id : null)
    }
    
    // Remove from ensemble
    setEnsembleConfigState(prev => ({
      ...prev,
      providers: prev.providers.filter(p => p !== id),
    }))
  }, [activeKeyId, keys])
  
  const updateKey = useCallback((id: string, updates: Partial<APIKeyConfig>) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, ...updates } : k))
  }, [])
  
  const setActiveKey = useCallback((id: string) => {
    if (keys.some(k => k.id === id)) {
      setActiveKeyId(id)
    }
  }, [keys])
  
  const toggleKeyEnabled = useCallback((id: string) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, isEnabled: !k.isEnabled } : k))
  }, [])
  
  const validateKey = useCallback(async (id: string): Promise<boolean> => {
    const key = decryptedKeys.get(id)
    const keyConfig = keys.find(k => k.id === id)
    if (!key || !keyConfig) return false
    
    try {
      let isValid = false
      
      if (keyConfig.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
        })
        isValid = response.ok
      } else if (keyConfig.provider === 'anthropic') {
        // Check prefix for Anthropic
        isValid = key.startsWith('sk-ant-')
      } else {
        // For other providers, assume valid if non-empty
        isValid = key.length > 10
      }
      
      updateKey(id, { isValid, lastUsed: new Date() })
      return isValid
    } catch {
      updateKey(id, { isValid: false })
      return false
    }
  }, [decryptedKeys, keys, updateKey])
  
  const getDecryptedKey = useCallback((id: string): string | null => {
    return decryptedKeys.get(id) || null
  }, [decryptedKeys])
  
  const setEnsembleConfig = useCallback((config: Partial<EnsembleConfig>) => {
    setEnsembleConfigState(prev => ({ ...prev, ...config }))
  }, [])
  
  const getEnabledKeys = useCallback(() => {
    return keys.filter(k => k.isEnabled)
  }, [keys])
  
  const getEnsembleKeys = useCallback(() => {
    if (!ensembleConfig.enabled) {
      const activeKey = keys.find(k => k.id === activeKeyId)
      if (!activeKey) return []
      const decrypted = decryptedKeys.get(activeKeyId!)
      if (!decrypted) return []
      return [{ key: activeKey, decrypted }]
    }
    
    return ensembleConfig.providers
      .map(id => {
        const key = keys.find(k => k.id === id && k.isEnabled)
        const decrypted = decryptedKeys.get(id)
        if (!key || !decrypted) return null
        return { key, decrypted }
      })
      .filter((k): k is { key: APIKeyConfig; decrypted: string } => k !== null)
  }, [keys, activeKeyId, decryptedKeys, ensembleConfig])
  
  const hasValidKey = keys.some(k => k.isEnabled)
  const isEnsembleReady = ensembleConfig.enabled && ensembleConfig.providers.length >= 2
  
  return (
    <APIKeysContext.Provider
      value={{
        keys,
        activeKeyId,
        ensembleConfig,
        addKey,
        removeKey,
        updateKey,
        setActiveKey,
        toggleKeyEnabled,
        validateKey,
        getDecryptedKey,
        setEnsembleConfig,
        getEnabledKeys,
        getEnsembleKeys,
        hasValidKey,
        isEnsembleReady,
      }}
    >
      {children}
    </APIKeysContext.Provider>
  )
}

export function useAPIKeys() {
  const context = useContext(APIKeysContext)
  if (!context) {
    throw new Error('useAPIKeys must be used within APIKeysProvider')
  }
  return context
}
