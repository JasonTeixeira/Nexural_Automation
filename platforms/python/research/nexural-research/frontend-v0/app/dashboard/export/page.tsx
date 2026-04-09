"use client"

import { useState } from "react"
import { useSession } from "@/lib/session-context"
import { Panel } from "@/components/panel"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  FileImage,
  Check,
  AlertCircle
} from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

interface ExportOption {
  id: string
  name: string
  description: string
  format: string
  icon: React.ReactNode
  sections: string[]
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "full_pdf",
    name: "Full PDF Report",
    description: "Comprehensive institutional-grade report with all metrics, charts, and analysis",
    format: "PDF",
    icon: <FileText className="h-5 w-5" />,
    sections: ["Overview", "Advanced Metrics", "Risk Analysis", "Monte Carlo", "Walk-Forward", "Trades"],
  },
  {
    id: "executive_summary",
    name: "Executive Summary",
    description: "One-page summary with key metrics and grades for quick review",
    format: "PDF",
    icon: <FileText className="h-5 w-5" />,
    sections: ["Key Metrics", "Overall Grade", "Risk Summary"],
  },
  {
    id: "metrics_csv",
    name: "Metrics Export",
    description: "All calculated metrics in spreadsheet format for further analysis",
    format: "CSV",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    sections: ["All Metrics", "Time Series Data"],
  },
  {
    id: "trade_log",
    name: "Trade Log Export",
    description: "Complete trade history with entry/exit details and PnL",
    format: "CSV",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    sections: ["All Trades", "MAE/MFE", "Duration"],
  },
  {
    id: "json_full",
    name: "JSON Data Export",
    description: "Complete analysis data in JSON format for API integration",
    format: "JSON",
    icon: <FileJson className="h-5 w-5" />,
    sections: ["All Data", "API Compatible"],
  },
  {
    id: "charts_png",
    name: "Charts Package",
    description: "All charts exported as high-resolution images",
    format: "ZIP",
    icon: <FileImage className="h-5 w-5" />,
    sections: ["Equity Curve", "Drawdown", "Distribution", "Heatmap"],
  },
]

export default function ExportPage() {
  const { sessionId } = useSession()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [completed, setCompleted] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (option: ExportOption) => {
    if (!sessionId) return

    setDownloading(option.id)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/export/${option.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `strategy_${option.id}_${new Date().toISOString().split("T")[0]}.${option.format.toLowerCase()}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setCompleted(prev => [...prev, option.id])
      setTimeout(() => {
        setCompleted(prev => prev.filter(id => id !== option.id))
      }, 3000)
    } catch {
      setError(`Failed to export ${option.name}. Please try again.`)
    } finally {
      setDownloading(null)
    }
  }

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No strategy loaded. Please upload a strategy first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Export Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate institutional-grade reports and data exports
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-negative/10 border border-negative/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-negative flex-shrink-0" />
          <p className="text-sm text-negative">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_OPTIONS.map((option) => {
          const isDownloading = downloading === option.id
          const isCompleted = completed.includes(option.id)

          return (
            <Panel key={option.id} className="p-0 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {option.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{option.name}</h3>
                      <span className="text-xs text-muted-foreground">{option.format}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {option.sections.map((section) => (
                    <span
                      key={section}
                      className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 bg-muted/30 border-t border-border">
                <Button
                  onClick={() => handleExport(option)}
                  disabled={isDownloading}
                  className="w-full gap-2"
                  variant={isCompleted ? "outline" : "default"}
                >
                  {isDownloading ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Generating...
                    </>
                  ) : isCompleted ? (
                    <>
                      <Check className="h-4 w-4 text-positive" />
                      Downloaded
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download {option.format}
                    </>
                  )}
                </Button>
              </div>
            </Panel>
          )
        })}
      </div>

      {/* Custom Report Builder */}
      <Panel title="Custom Report Builder">
        <p className="text-sm text-muted-foreground mb-4">
          Build a custom report by selecting specific sections to include.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            "Overview Metrics",
            "Equity Curve",
            "Drawdown Analysis",
            "Risk Metrics",
            "Trade Statistics",
            "Monte Carlo",
            "Walk-Forward",
            "Regime Analysis",
            "Distribution Charts",
            "Monthly Heatmap",
            "Rolling Metrics",
            "AI Commentary",
          ].map((section) => (
            <label
              key={section}
              className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                className="rounded border-border text-primary focus:ring-primary"
                defaultChecked
              />
              <span className="text-sm text-foreground">{section}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Generate Custom Report
          </Button>
          <span className="text-sm text-muted-foreground">
            12 sections selected
          </span>
        </div>
      </Panel>

      {/* Scheduled Reports */}
      <Panel title="Scheduled Reports">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Set up automated report generation and delivery via email.
            </p>
          </div>
          <Button variant="outline" disabled>
            Coming Soon
          </Button>
        </div>
      </Panel>
    </div>
  )
}
