"use client"

import React from "react"
import { AlertCircle } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900 rounded-xl flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-rose-800 dark:text-rose-400">Failed to render content</h3>
            <p className="text-sm text-rose-600 dark:text-rose-500 mt-1">
              There was a problem rendering this AI-generated document. It might contain malformed HTML.
            </p>
            <details className="mt-3 text-xs text-rose-700/70 dark:text-rose-400/70 cursor-pointer">
              <summary>View Error Details</summary>
              <pre className="mt-2 p-2 bg-rose-100 dark:bg-rose-900/50 rounded overflow-x-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
