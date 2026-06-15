"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calculator, Calendar, CreditCard, Settings, Smile, User, Building2, Search } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { createClient } from "@/lib/supabase/client"

export function GlobalSearch({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [opportunities, setOpportunities] = React.useState<any[]>([])

  React.useEffect(() => {
    const fetchOpty = async () => {
      const { data } = await supabase.from('opportunities').select('id, opportunity_name, customer_name, stage')
      if (data) setOpportunities(data)
    }
    fetchOpty()
  }, [supabase])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  const onSelectOpty = (id: string) => {
    setOpen(false)
    router.push(`/opportunities/${id}`)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Global Search" description="Search everything">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Opportunities">
          {opportunities.map(opty => (
            <CommandItem key={opty.id} value={`${opty.opportunity_name} ${opty.customer_name}`} onSelect={() => onSelectOpty(opty.id)}>
              <Building2 className="mr-2 h-4 w-4" />
              <span>{opty.opportunity_name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{opty.customer_name}</span>
              <span className="ml-auto text-xs opacity-50">{opty.stage}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => { setOpen(false); router.push('/opportunities/new') }}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>New Opportunity</span>
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard') }}>
            <Calculator className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
