import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type Priority = "low" | "medium" | "high" | "urgent";

interface TodoInputProps {
  onAdd: (text: string, deadline: Date | null, priority: Priority) => void;
}

export const TodoInput = ({ onAdd }: TodoInputProps) => {
  const [text, setText] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Priority>("medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim(), deadline || null, priority);
      setText("");
      setDeadline(undefined);
      setPriority("medium");
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

        <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
          <SelectTrigger className="flex-1 min-w-[180px] bg-card">
            <SelectValue placeholder="Pilih prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">🟢 Rendah</SelectItem>
            <SelectItem value="medium">🟡 Sedang</SelectItem>
            <SelectItem value="high">🟠 Tinggi</SelectItem>
            <SelectItem value="urgent">🔴 Urgent</SelectItem>
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
