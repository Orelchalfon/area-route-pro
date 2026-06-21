import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer } from '@/types';

const MAX_RESULTS = 50;

interface CustomerSearchFieldProps {
  customers: Customer[];
  customerId: string;
  setCustomerId: (id: string) => void;
  label?: string;
  placeholder?: string;
}

export function CustomerSearchField({ customers, customerId, setCustomerId, label = 'לקוח', placeholder = 'חפש לפי שם, טלפון, עיר...' }: CustomerSearchFieldProps) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedCustomer = customers.find(c => c.id === customerId);

  const { results, total } = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches: Customer[] = [];
    for (const c of customers) {
      if (tokens.length > 0) {
        const haystack = `${c.name} ${c.phone} ${c.city} ${c.address}`.toLowerCase();
        if (!tokens.every(t => haystack.includes(t))) continue;
      }
      matches.push(c);
      if (matches.length >= MAX_RESULTS && tokens.length === 0) break;
    }
    return { results: matches.slice(0, MAX_RESULTS), total: matches.length };
  }, [customers, query]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={customerOpen} className="w-full justify-between font-normal">
            {selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.city}` : 'חפש ובחר לקוח...'}
            <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command dir="rtl" shouldFilter={false}>
            <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>לא נמצאו לקוחות</CommandEmpty>
              <CommandGroup>
                {results.map(c => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      setCustomerId(c.id);
                      setCustomerOpen(false);
                    }}
                  >
                    <Check className={cn("ml-2 h-4 w-4", customerId === c.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.phone} · {c.city}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {total > MAX_RESULTS && (
                <div className="py-2 text-center text-xs text-muted-foreground">
                  מציג {MAX_RESULTS} מתוך {total} — צמצם את החיפוש
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
