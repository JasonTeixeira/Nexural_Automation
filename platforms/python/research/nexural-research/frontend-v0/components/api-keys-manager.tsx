'use client'

import { useState } from 'react'
import { useAPIKeys, AI_PROVIDERS, type APIKeyConfig, type AIProvider } from '@/lib/api-keys-context'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Key,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Shield,
  AlertTriangle,
  ExternalLink,
  Brain,
  Layers,
  Zap,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PROVIDER_COLORS: Record<AIProvider, string> = {
  openai: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  anthropic: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  google: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  groq: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  mistral: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  xai: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  deepseek: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  perplexity: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  together: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  fireworks: 'bg-red-500/10 text-red-500 border-red-500/20',
  custom: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

const PROVIDER_LINKS: Partial<Record<AIProvider, string>> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  google: 'https://aistudio.google.com/app/apikey',
  groq: 'https://console.groq.com/keys',
  mistral: 'https://console.mistral.ai/api-keys/',
  xai: 'https://console.x.ai/',
  deepseek: 'https://platform.deepseek.com/api_keys',
  perplexity: 'https://www.perplexity.ai/settings/api',
  together: 'https://api.together.xyz/settings/api-keys',
  fireworks: 'https://fireworks.ai/api-keys',
}

export function APIKeysManager() {
  const { 
    keys, 
    activeKeyId, 
    ensembleConfig,
    addKey, 
    removeKey, 
    setActiveKey, 
    toggleKeyEnabled,
    validateKey,
    setEnsembleConfig,
  } = useAPIKeys()
  
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyProvider, setNewKeyProvider] = useState<AIProvider>('openai')
  const [newKeyModel, setNewKeyModel] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [isValidating, setIsValidating] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  
  const selectedProvider = AI_PROVIDERS.find(p => p.id === newKeyProvider)
  
  // Set default model when provider changes
  const handleProviderChange = (provider: AIProvider) => {
    setNewKeyProvider(provider)
    const providerConfig = AI_PROVIDERS.find(p => p.id === provider)
    if (providerConfig && providerConfig.models.length > 0) {
      setNewKeyModel(providerConfig.models[0].id)
    }
  }
  
  const handleAddKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim() || !newKeyModel) return
    
    addKey(newKeyName.trim(), newKeyProvider, newKeyValue.trim(), newKeyModel)
    setNewKeyName('')
    setNewKeyProvider('openai')
    setNewKeyModel('')
    setNewKeyValue('')
    setAddDialogOpen(false)
  }
  
  const handleValidateKey = async (id: string) => {
    setIsValidating(id)
    await validateKey(id)
    setIsValidating(null)
  }
  
  const enabledKeys = keys.filter(k => k.isEnabled)
  
  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            AI Provider API Keys
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your own AI providers for strategy analysis
          </p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add API Key</DialogTitle>
              <DialogDescription>
                Connect an AI provider for strategy analysis. Keys are encrypted locally.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., My Claude Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="key-provider">AI Provider</Label>
                <Select value={newKeyProvider} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          <span>{provider.name}</span>
                          {provider.recommended && <Star className="h-3 w-3 text-amber-500" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProvider && (
                  <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="key-model">Model</Label>
                <Select value={newKeyModel} onValueChange={setNewKeyModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProvider?.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div>
                          <span>{model.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="key-value">API Key</Label>
                <Input
                  id="key-value"
                  type="password"
                  placeholder={selectedProvider?.keyPrefix ? `${selectedProvider.keyPrefix}...` : 'Enter your API key'}
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                />
                {PROVIDER_LINKS[newKeyProvider] && (
                  <a 
                    href={PROVIDER_LINKS[newKeyProvider]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Get {selectedProvider?.name} API Key
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium">Secure Storage</p>
                  <p className="text-muted-foreground">
                    Keys are encrypted and stored locally. They are sent directly to the AI provider from your browser.
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddKey} disabled={!newKeyName.trim() || !newKeyValue.trim() || !newKeyModel}>
                Add Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="keys">
        <TabsList className="mb-4">
          <TabsTrigger value="keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys ({keys.length})
          </TabsTrigger>
          <TabsTrigger value="ensemble" className="gap-2">
            <Layers className="h-4 w-4" />
            Ensemble Mode
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="keys">
          {/* Keys List */}
          {keys.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No API keys configured</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Add your own API keys to use different AI providers. Without keys, the platform uses Vercel AI Gateway.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {AI_PROVIDERS.filter(p => p.recommended).map((provider) => (
                  <Button key={provider.id} variant="outline" size="sm" asChild>
                    <a href={PROVIDER_LINKS[provider.id]} target="_blank" rel="noopener noreferrer" className="gap-2">
                      Get {provider.name} Key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => {
                const provider = AI_PROVIDERS.find(p => p.id === key.provider)
                
                return (
                  <div
                    key={key.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                      activeKeyId === key.id
                        ? 'border-primary bg-primary/5'
                        : key.isEnabled
                          ? 'border-border hover:border-border/80'
                          : 'border-border/50 opacity-60'
                    )}
                  >
                    <Switch
                      checked={key.isEnabled}
                      onCheckedChange={() => toggleKeyEnabled(key.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{key.name}</span>
                        <Badge variant="outline" className={cn('text-xs', PROVIDER_COLORS[key.provider])}>
                          {provider?.name || key.provider}
                        </Badge>
                        {activeKeyId === key.id && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                          {key.keyMasked}
                        </code>
                        <span className="text-xs">{key.model}</span>
                        {key.isValid === true && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <Check className="h-3 w-3" />
                            Valid
                          </span>
                        )}
                        {key.isValid === false && (
                          <span className="flex items-center gap-1 text-red-500">
                            <X className="h-3 w-3" />
                            Invalid
                          </span>
                        )}
                        {key.usageCount > 0 && (
                          <span className="text-xs">{key.usageCount} uses</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {activeKeyId !== key.id && key.isEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveKey(key.id)}
                        >
                          Set Active
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleValidateKey(key.id)}
                        disabled={isValidating === key.id}
                      >
                        {isValidating === key.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Test'
                        )}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{key.name}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeKey(key.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="ensemble">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Ensemble Analysis
                </h4>
                <p className="text-sm text-muted-foreground">
                  Run analysis across multiple AI models and compare results
                </p>
              </div>
              <Switch
                checked={ensembleConfig.enabled}
                onCheckedChange={(enabled) => setEnsembleConfig({ enabled })}
                disabled={enabledKeys.length < 2}
              />
            </div>
            
            {enabledKeys.length < 2 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p className="text-sm">Add at least 2 enabled API keys to use ensemble mode</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Aggregation Mode</Label>
                  <Select 
                    value={ensembleConfig.aggregation} 
                    onValueChange={(v) => setEnsembleConfig({ aggregation: v as typeof ensembleConfig.aggregation })}
                    disabled={!ensembleConfig.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merge">Merge All Responses</SelectItem>
                      <SelectItem value="first">Use Fastest Response</SelectItem>
                      <SelectItem value="best">Use Best Quality Response</SelectItem>
                      <SelectItem value="consensus">Find Consensus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Providers in Ensemble</Label>
                  <div className="space-y-2 p-3 rounded-lg border border-border">
                    {enabledKeys.map((key) => {
                      const provider = AI_PROVIDERS.find(p => p.id === key.provider)
                      const isInEnsemble = ensembleConfig.providers.includes(key.id)
                      
                      return (
                        <label 
                          key={key.id} 
                          className={cn(
                            'flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50',
                            !ensembleConfig.enabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isInEnsemble}
                            disabled={!ensembleConfig.enabled}
                            onChange={(e) => {
                              const newProviders = e.target.checked
                                ? [...ensembleConfig.providers, key.id]
                                : ensembleConfig.providers.filter(p => p !== key.id)
                              setEnsembleConfig({ providers: newProviders })
                            }}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{key.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {provider?.name} / {key.model}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
                
                {ensembleConfig.enabled && ensembleConfig.providers.length < 2 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-500">Select at least 2 providers for ensemble analysis</p>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Default Provider Info */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Default: Vercel AI Gateway</h4>
            <p className="text-sm text-muted-foreground">
              Without custom API keys, the platform uses Vercel AI Gateway which provides access to Claude, GPT-4, and other models with no configuration needed.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
