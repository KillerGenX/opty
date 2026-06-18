"use client"

import * as React from "react"

export function ThemeProvider({
  children,
  ...props
}: any) {
  // Bypassing next-themes to avoid React 19 script tag error since we force 'light' theme
  return <div className="light contents">{children}</div>
}
