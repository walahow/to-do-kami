import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Timer, TrendingUp } from "lucide-react";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

interface TodoInputProps {
  onAdd: (text: string, deadlineHours: number, durationHours: number, difficulty: Difficulty) => void;
}

export const TodoInput = ({ onAdd }: TodoInputProps) => {
  const [text, setText] = useState("");
  const [deadlineHours, setDeadlineHours] = useState<number>(24);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && deadlineHours > 0 && durationHours > 0) {
      onAdd(text.trim(), deadlineHours, durationHours, difficulty);
      setText("");
      setDeadlineHours(24);
      setDurationHours(1);
      setDifficulty(3);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tambahkan task baru..."
        className="w-full bg-card border-border focus-visible:ring-primary rounded-xl shadow-sm focus:shadow-md transition-shadow"
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Deadline (jam dari sekarang)
          </label>
          <Input
            type="number"
            min="0.5"
            step="0.5"
            value={deadlineHours}
            onChange={(e) => setDeadlineHours(parseFloat(e.target.value) || 0)}
            placeholder="24"
            className="w-full bg-card border-border rounded-xl shadow-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" />
            Durasi (jam)
          </label>
          <Input
            type="number"
            min="0.5"
            step="0.5"
            value={durationHours}
            onChange={(e) => setDurationHours(parseFloat(e.target.value) || 0)}
            placeholder="1"
            className="w-full bg-card border-border rounded-xl shadow-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Difficulty (1-5)
          </label>
          <Select value={difficulty.toString()} onValueChange={(value) => setDifficulty(parseInt(value) as Difficulty)}>
            <SelectTrigger className="w-full bg-card rounded-xl shadow-sm">
              <SelectValue placeholder="Pilih difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">⚪ Level 1 (Termudah)</SelectItem>
              <SelectItem value="2">🟢 Level 2</SelectItem>
              <SelectItem value="3">🟡 Level 3</SelectItem>
              <SelectItem value="4">🟠 Level 4</SelectItem>
              <SelectItem value="5">🔴 Level 5 (Tersulit)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 rounded-xl shadow-md hover:shadow-lg">
        <Plus className="h-5 w-5 mr-2" />
        Tambah Task
      </Button>
    </form>
  );
};
