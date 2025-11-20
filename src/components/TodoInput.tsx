import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type Priority = 1 | 2 | 3 | 4 | 5;

interface TodoInputProps {
  onAdd: (text: string, deadline: Date | null, priority: Priority) => void;
}

export const TodoInput = ({ onAdd }: TodoInputProps) => {
  const [text, setText] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Priority>(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim(), deadline || null, priority);
      setText("");
      setDeadline(undefined);
      setPriority(3);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tambahkan task baru..."
        className="w-full bg-card border-border focus-visible:ring-primary"
      />
      
      <div className="flex gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 min-w-[180px] justify-start text-left font-normal",
                !deadline && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {deadline ? format(deadline, "PPP") : "Pilih deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={setDeadline}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </PopoverContent>
        </Popover>

        <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value) as Priority)}>
          <SelectTrigger className="flex-1 min-w-[180px] bg-card">
            <SelectValue placeholder="Pilih prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">⚪ Prioritas 1 (Terendah)</SelectItem>
            <SelectItem value="2">🟢 Prioritas 2</SelectItem>
            <SelectItem value="3">🟡 Prioritas 3</SelectItem>
            <SelectItem value="4">🟠 Prioritas 4</SelectItem>
            <SelectItem value="5">🔴 Prioritas 5 (Tertinggi)</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit" className="bg-primary hover:bg-primary/90">
          <Plus className="h-5 w-5 mr-2" />
          Tambah
        </Button>
      </div>
    </form>
  );
};
