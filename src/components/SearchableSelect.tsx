import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface SearchOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: string[] | SearchOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    emptyMessage = "No se encontraron resultados.",
    disabled = false,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between h-auto py-3 px-4 font-normal border-input hover:bg-background"
                >
                    <span className="truncate">
                        {value
                            ? (typeof options[0] === 'string'
                                ? (options as string[]).find((opt) => opt === value)
                                : (options as SearchOption[]).find((opt) => opt.value === value)?.label)
                            : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Buscar..." />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isString = typeof option === 'string';
                                const optValue = isString ? (option as string) : (option as SearchOption).value;
                                const optLabel = isString ? (option as string) : (option as SearchOption).label;

                                return (
                                    <CommandItem
                                        key={optValue}
                                        value={optLabel} // Filter by label
                                        onSelect={() => {
                                            onChange(optValue === value ? "" : optValue);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === optValue ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {optLabel}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
