import { useState, useEffect } from "react";
import { TodoInput, Difficulty } from "@/components/TodoInput";
import { TodoItem } from "@/components/TodoItem";
import { TodoFilter, FilterType } from "@/components/TodoFilter";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  deadlineHours: number;
  durationHours: number;
  difficulty: Difficulty;
  createdAt: number;
}

interface DetailedTask {
  name: string;
  duration: number;
  deadline: number;
  difficulty: number;
  finish_time: number;
  lateness: number;
}

const Index = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [chartData, setChartData] = useState<Array<{ iteration: number; cost: number; current: number }>>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [bestSchedule, setBestSchedule] = useState<DetailedTask[]>([]);

  // Load tasks from server on mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/get-tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');

        const data = await response.json();
        const loadedTodos = data.map((t: any, index: number) => ({
          id: Date.now().toString() + index,
          text: t.name,
          completed: false,
          deadlineHours: t.deadline,
          durationHours: t.duration,
          difficulty: t.difficulty,
          createdAt: Date.now(),
        }));

        setTodos(loadedTodos);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading tasks:", error);
        toast.error("Gagal memuat data task");
      }
    };

    fetchTasks();
  }, []);

  // Save tasks to server when todos change
  useEffect(() => {
    if (!isLoaded) return;

    const saveTasks = async () => {
      try {
        const pythonTasks = todos.map(todo => ({
          name: todo.text,
          deadline: todo.deadlineHours,
          duration: todo.durationHours,
          difficulty: todo.difficulty
        }));

        await fetch('http://localhost:3001/api/save-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pythonTasks),
        });
      } catch (error) {
        console.error("Error saving tasks:", error);
        toast.error("Gagal menyimpan perubahan");
      }
    };

    // Debounce save slightly to avoid too many requests
    const timeoutId = setTimeout(saveTasks, 500);
    return () => clearTimeout(timeoutId);
  }, [todos, isLoaded]);

  const addTodo = (text: string, deadlineHours: number, durationHours: number, difficulty: Difficulty) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      deadlineHours,
      durationHours,
      difficulty,
      createdAt: Date.now(),
    };
    setTodos([newTodo, ...todos]);
  };

  const runSAnnealing = async () => {
    try {
      setChartData([]);
      setLogs([]);
      setBestSchedule([]); // Clear previous results

      // Transform data for Python script
      const pythonTasks = todos.map(todo => ({
        name: todo.text,
        deadline: todo.deadlineHours,
        duration: todo.durationHours,
        difficulty: todo.difficulty
      }));

      // 1. Save tasks to server
      const saveResponse = await fetch('http://localhost:3001/api/save-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pythonTasks),
      });

      if (!saveResponse.ok) throw new Error('Gagal menyimpan data task');

      toast.success("Memulai Simulated Annealing...", {
        description: "Menghubungkan ke Python script..."
      });

      // 2. Connect to SSE endpoint
      const eventSource = new EventSource('http://localhost:3001/api/run-sa');

      eventSource.onmessage = (event) => {
        if (event.data === 'done') {
          eventSource.close();
          toast.success("Optimisasi Selesai!");
          return;
        }

        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'start') {
            setLogs(prev => [...prev, `Mulai SA: Score awal = ${msg.data.initial_cost.toFixed(4)}`]);
            setChartData([{ iteration: 0, cost: msg.data.initial_cost, current: msg.data.initial_cost }]);
          }
          else if (msg.type === 'temp_change') {
            // Optional: Log temp change if needed
          }
          else if (msg.type === 'progress') {
            setChartData(prev => [...prev, {
              iteration: msg.data.iter,
              cost: msg.data.best_cost,
              current: msg.data.current_cost
            }]);

            setLogs(prev => [...prev, `Iter ${msg.data.iter} | T=${msg.data.T.toFixed(4)} | Cur=${msg.data.current_cost.toFixed(4)} | Best=${msg.data.best_cost.toFixed(4)}`]);
          }
          else if (msg.type === 'finish') {
            setLogs(prev => [...prev, `SA Selesai. Best Score Found = ${msg.data.best_cost.toFixed(4)}`]);
            if (msg.data.detailed_schedule) {
              setBestSchedule(msg.data.detailed_schedule);
            }
          }
          else if (msg.type === 'error') {
            toast.error("Python Error", { description: msg.message });
            setLogs(prev => [...prev, `ERROR: ${msg.message}`]);
          }
        } catch (e) {
          console.error("Error parsing SSE data:", e);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        eventSource.close();
        toast.error("Koneksi terputus");
      };

    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan", {
        description: error instanceof Error ? error.message : "Gagal menghubungkan ke server"
      });
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const filteredTodos = todos
    .filter((todo) => {
      if (filter === "active") return !todo.completed;
      if (filter === "completed") return todo.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.difficulty !== b.difficulty) {
        return b.difficulty - a.difficulty;
      }
      const aTimeRemaining = (a.createdAt + (a.deadlineHours * 60 * 60 * 1000)) - Date.now();
      const bTimeRemaining = (b.createdAt + (b.deadlineHours * 60 * 60 * 1000)) - Date.now();
      return aTimeRemaining - bTimeRemaining;
    });

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Centered Brand Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-2xl shadow-sm">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
              My Tasks
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Kelola task harian Anda dengan mudah dan efisien
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Todo List */}
          <div className="space-y-6">

            <div className="bg-card rounded-2xl shadow-lg border border-border p-6 md:p-8 space-y-6 backdrop-blur-sm">
              <TodoInput onAdd={addTodo} />

              <div className="flex items-center justify-between flex-wrap gap-4">
                <TodoFilter currentFilter={filter} onFilterChange={setFilter} counts={counts} />
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {counts.active} task tersisa
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runSAnnealing}
                    className="flex items-center gap-2 rounded-xl shadow-sm hover:shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={todos.length === 0}
                  >
                    <Play className="h-4 w-4" />
                    SAnneal
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredTodos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg">
                      {filter === "completed"
                        ? "Belum ada task yang selesai"
                        : filter === "active"
                          ? "Tidak ada task aktif"
                          : "Belum ada task. Tambahkan task pertama Anda!"}
                    </p>
                  </div>
                ) : (
                  filteredTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      id={todo.id}
                      text={todo.text}
                      completed={todo.completed}
                      deadlineHours={todo.deadlineHours}
                      durationHours={todo.durationHours}
                      difficulty={todo.difficulty}
                      createdAt={todo.createdAt}
                      onToggle={toggleTodo}
                      onDelete={deleteTodo}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="text-center mt-6 text-sm text-muted-foreground space-y-1">
              <p>Data tersimpan otomatis di browser Anda</p>
              <p className="text-xs">Klik SAnneal untuk menjalankan optimasi dengan Python</p>
            </div>
          </div>

          {/* Right Column - Chart and Logs */}
          <div className="space-y-6">
            {/* Chart Section */}
            <div className="bg-card rounded-2xl shadow-lg border border-border p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Grafik Score vs Iterasi</h2>
              <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="iteration"
                        label={{ value: 'Iterasi', position: 'insideBottom', offset: -5 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line
                        name="Best Score"
                        type="monotone"
                        dataKey="cost"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        name="Current Score"
                        type="monotone"
                        dataKey="current"
                        stroke="#ef4444"
                        strokeWidth={1}
                        dot={false}
                        opacity={0.7}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Grafik akan muncul setelah menjalankan SA</p>
                  </div>
                )}
              </div>
            </div>

            {/* Logs Section */}
            <div className="bg-card rounded-2xl shadow-lg border border-border p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Log Proses SA</h2>
              <ScrollArea className="h-[500px] w-full rounded-md border border-border p-4 bg-muted/30">
                {logs.length > 0 ? (
                  <div className="space-y-1 font-mono text-sm">
                    {logs.map((log, index) => (
                      <p key={index} className="text-muted-foreground whitespace-pre-wrap">
                        {log}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Log akan muncul setelah menjalankan SA</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Bottom Section - Detailed Results */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Hasil Jadwal Optimal (Detail)</h2>
          <ScrollArea className="w-full rounded-md border border-border bg-muted/30">
            {bestSchedule.length > 0 ? (
              <div className="p-4">
                <table className="w-full text-sm text-left">
                  <thead className="text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Nama Tugas</th>
                      <th className="px-4 py-3">Durasi (Jam)</th>
                      <th className="px-4 py-3">Deadline (Jam)</th>
                      <th className="px-4 py-3">Kesulitan (1-5)</th>
                      <th className="px-4 py-3">Waktu Selesai</th>
                      <th className="px-4 py-3">Keterlambatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bestSchedule.map((task, index) => (
                      <tr key={index} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{index + 1}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{task.name}</td>
                        <td className="px-4 py-3">{task.duration}</td>
                        <td className="px-4 py-3">{task.deadline}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.difficulty >= 4 ? 'bg-red-500/10 text-red-500' :
                            task.difficulty >= 3 ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-green-500/10 text-green-500'
                            }`}>
                            Level {task.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3">{task.finish_time.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {task.lateness > 0 ? (
                            <span className="text-red-500 font-medium">+{task.lateness.toFixed(2)} Jam</span>
                          ) : (
                            <span className="text-green-500">Tepat Waktu</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                <p>Hasil detail akan muncul di sini setelah proses SA selesai</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default Index;
