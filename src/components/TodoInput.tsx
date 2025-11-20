import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TodoInputProps {
  onAdd: (text: string) => void;
}

export const TodoInput = ({ onAdd }: TodoInputProps) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tambahkan task baru..."
        className="flex-1 bg-card border-border focus-visible:ring-primary"
      />
      <Button type="submit" className="bg-primary hover:bg-primary/90">
        <Plus className="h-5 w-5" />
      </Button>
    </form>
  );
};
