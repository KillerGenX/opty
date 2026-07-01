"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Pencil, Loader2 } from "lucide-react"

export function EditButton({ optyId }: { optyId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    setLoading(true)
    router.push(`/opportunities/${optyId}/edit`)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-2 h-7 gap-1.5 rounded-full px-3"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Pencil className="h-3 w-3" />
      )}
      {loading ? "Loading..." : "Edit Detail"}
    </Button>
  )
}
