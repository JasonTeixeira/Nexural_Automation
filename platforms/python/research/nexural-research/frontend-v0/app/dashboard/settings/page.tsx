"use client"

import { useState } from "react"
import { useSession } from "@/lib/session-context"
import { Panel } from "@/components/panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { APIKeysManager } from "@/components/api-keys-manager"
import { 
  Settings, 
  Server, 
  Bell, 
  Palette, 
  Shield, 
  Database,
  Save,
  RefreshCw,
  Check,
  ExternalLink,
  Key
} from "lucide-react"

interface SettingsSection {
  id: string
  name: string
  icon: React.ReactNode
}

const SECTIONS: SettingsSection[] = [
  { id: "api-keys", name: "AI API Keys", icon: <Key className="h-4 w-4" /> },
  { id: "api", name: "Backend API", icon: <Server className="h-4 w-4" /> },
  { id: "analysis", name: "Analysis Defaults", icon: <Settings className="h-4 w-4" /> },
  { id: "notifications", name: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { id: "appearance", name: "Appearance", icon: <Palette className="h-4 w-4" /> },
  { id: "security", name: "Security", icon: <Shield className="h-4 w-4" /> },
  { id: "data", name: "Data Management", icon: <Database className="h-4 w-4" /> },
]

export default function SettingsPage() {
  const { sessionId, apiBaseUrl, setApiBaseUrl, clearSession } = useSession()
  const [activeSection, setActiveSection] = useState("api-keys")
  const [localApiUrl, setLocalApiUrl] = useState(apiBaseUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveApiUrl = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    setApiBaseUrl(localApiUrl)
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`${localApiUrl}/health`)
      if (response.ok) {
        alert("Connection successful!")
      } else {
        alert("Connection failed. Please check the API URL.")
      }
    } catch {
      alert("Connection failed. Please check the API URL.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your analysis environment and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {section.icon}
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {activeSection === "api-keys" && (
            <APIKeysManager />
          )}

          {activeSection === "api" && (
            <>
              <Panel title="Backend API Configuration">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      API Base URL
                    </label>
                    <div className="flex gap-3">
                      <Input
                        value={localApiUrl}
                        onChange={(e) => setLocalApiUrl(e.target.value)}
                        placeholder="https://your-api.com"
                        className="flex-1 font-mono text-sm"
                      />
                      <Button variant="outline" onClick={handleTestConnection}>
                        Test
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Enter the base URL of your strategy analysis backend API
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={handleSaveApiUrl} disabled={isSaving} className="gap-2">
                      {saved ? (
                        <>
                          <Check className="h-4 w-4" />
                          Saved
                        </>
                      ) : isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Panel>

              <Panel title="Current Session">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Session ID
                    </label>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono text-muted-foreground">
                        {sessionId || "No active session"}
                      </code>
                    </div>
                  </div>
                  {sessionId && (
                    <Button variant="outline" onClick={clearSession} className="text-negative hover:text-negative">
                      Clear Session
                    </Button>
                  )}
                </div>
              </Panel>

              <Panel title="API Documentation">
                <p className="text-sm text-muted-foreground mb-4">
                  View the complete API documentation for integrating with your backend.
                </p>
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View API Docs
                </Button>
              </Panel>
            </>
          )}

          {activeSection === "analysis" && (
            <>
              <Panel title="Monte Carlo Settings">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Number of Simulations
                    </label>
                    <Input type="number" defaultValue="1000" className="max-w-xs" />
                    <p className="text-xs text-muted-foreground mt-1">
                      More simulations = more accurate results (recommended: 1000-10000)
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Confidence Levels
                    </label>
                    <Input defaultValue="95, 99" className="max-w-xs" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated confidence percentages for VaR/CVaR calculations
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel title="Walk-Forward Settings">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Number of Folds
                    </label>
                    <Input type="number" defaultValue="5" className="max-w-xs" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      In-Sample / Out-of-Sample Ratio
                    </label>
                    <Input defaultValue="0.7" className="max-w-xs" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Proportion of data used for in-sample optimization
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel title="Risk-Free Rate">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Annual Risk-Free Rate
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input type="number" defaultValue="5" step="0.1" />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for Sharpe ratio and other risk-adjusted calculations
                  </p>
                </div>
              </Panel>
            </>
          )}

          {activeSection === "notifications" && (
            <Panel title="Email Notifications">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Analysis Complete</p>
                    <p className="text-xs text-muted-foreground">Get notified when analysis finishes</p>
                  </div>
                  <input type="checkbox" className="rounded border-border text-primary" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Weekly Reports</p>
                    <p className="text-xs text-muted-foreground">Receive automated weekly summaries</p>
                  </div>
                  <input type="checkbox" className="rounded border-border text-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Risk Alerts</p>
                    <p className="text-xs text-muted-foreground">Alert when metrics exceed thresholds</p>
                  </div>
                  <input type="checkbox" className="rounded border-border text-primary" defaultChecked />
                </div>
              </div>
            </Panel>
          )}

          {activeSection === "appearance" && (
            <Panel title="Theme">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <button className="p-4 rounded-lg border-2 border-primary bg-muted/50 text-center">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 mx-auto mb-2" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button className="p-4 rounded-lg border border-border bg-muted/30 text-center opacity-50 cursor-not-allowed">
                    <div className="w-8 h-8 rounded-full bg-white border mx-auto mb-2" />
                    <span className="text-sm font-medium">Light</span>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </button>
                  <button className="p-4 rounded-lg border border-border bg-muted/30 text-center opacity-50 cursor-not-allowed">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-b from-white to-zinc-900 mx-auto mb-2" />
                    <span className="text-sm font-medium">System</span>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {activeSection === "security" && (
            <Panel title="API Keys">
              <p className="text-sm text-muted-foreground mb-4">
                Manage API keys for programmatic access to your analysis data.
              </p>
              <Button variant="outline" disabled>
                Generate API Key (Coming Soon)
              </Button>
            </Panel>
          )}

          {activeSection === "data" && (
            <>
              <Panel title="Data Retention">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Auto-delete sessions after
                    </label>
                    <select className="px-3 py-2 rounded-lg border border-border bg-background text-foreground">
                      <option>7 days</option>
                      <option>30 days</option>
                      <option>90 days</option>
                      <option>Never</option>
                    </select>
                  </div>
                </div>
              </Panel>

              <Panel title="Clear All Data">
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete all analysis data and sessions. This action cannot be undone.
                </p>
                <Button variant="outline" className="text-negative hover:text-negative">
                  Delete All Data
                </Button>
              </Panel>
            </>
          )}

          <div className="flex justify-end pt-4">
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
