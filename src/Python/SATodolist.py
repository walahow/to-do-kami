import json
import matplotlib
import math
import os
import random
import sys
import argparse
import time
import tkinter as tk
from tkinter import ttk, messagebox
from dataclasses import dataclass, asdict
from typing import List, Tuple

# ---- Matplotlib dan Tkinter GUI ----
# Hanya import jika TIDAK headless (akan dihandle di main)
import matplotlib
# matplotlib.use("TkAgg") # Dipindah ke main agar tidak error di environment tanpa display

HISTORY_FILE = "D:\\to-do-kami-main\\src\\Python\\tasks_history.json"

@dataclass
class Task:
    name: str
    deadline: float   # jam dari sekarang
    duration: float   # jam
    difficulty: int   # 1-5


# ======================
#  Fungsi SA (core)
# ======================
def compute_cost(
    order: List[int],
    tasks: List[Task],
    w_deadline: float = 5.0,
    w_difficulty: float = 2.5,
    w_makespan: float = 0.05,
) -> float:
    """
    Cost = kombinasi keterlambatan dan kesulitan.
    - lateness dihitung per task: max(0, finish_time - deadline)
    - tugas yang sulit (difficulty tinggi) yang telat akan kena penalti lebih besar
    - makespan diberi bobot kecil hanya agar jadwal tidak terlalu panjang
    """
    t = 0.0
    total_cost = 0.0

    for idx in order:
        task = tasks[idx]
        t += task.duration

        lateness = max(0.0, t - task.deadline)

        # Penalti utama: telat terhadap deadline
        total_cost += w_deadline * lateness

        # Penalti tambahan: kalau tugas sulit telat, hukum lebih berat
        total_cost += w_difficulty * task.difficulty * lateness

    # Penalti kecil untuk total waktu (opsional, supaya tidak terlalu molor)
    total_cost += w_makespan * t

    return total_cost


def neighbour(order: List[int]) -> List[int]:
    """
    Membuat solusi tetangga dari urutan sekarang.
    Dipakai beberapa jenis operator:
    - swap dua posisi acak
    - reverse segmen
    - insert: ambil satu task dan sisipkan di posisi lain

    Ini jauh lebih kuat daripada hanya swap.
    """
    n = len(order)
    if n < 2:
        return order[:]

    new_order = order.copy()
    r = random.random()

    if r < 0.33:
        # SWAP dua posisi random
        i, j = random.sample(range(n), 2)
        new_order[i], new_order[j] = new_order[j], new_order[i]

    elif r < 0.66:
        # REVERSE segmen kecil
        i, j = sorted(random.sample(range(n), 2))
        new_order[i:j+1] = reversed(new_order[i:j+1])

    else:
        # INSERT: ambil satu elemen dan masukkan ke posisi lain
        i, j = random.sample(range(n), 2)
        elem = new_order.pop(i)
        new_order.insert(j, elem)

    return new_order


# =========================================================
#  SA Logic (Decoupled from GUI)
# =========================================================
class SAEngine:
    def __init__(
        self,
        tasks: List[Task],
        T_max: float = 100.0,
        T_min: float = 0.1,
        alpha: float = 0.95,
        iter_per_T: int = 10,
        callback=None,
    ):
        """
        Parameter default diganti supaya:
        - T_max cukup tinggi (bisa eksplor solusi jelek di awal)
        - T_min kecil (berhenti saat sudah benar-benar "dingin")
        - alpha mendekati 1 (pendinginan pelan → eksplorasi lebih stabil)
        - iter_per_T besar (lebih banyak percobaan per suhu)
        """
        self.tasks = tasks
        self.T_max = T_max
        self.T_min = T_min
        self.alpha = alpha
        self.iter_per_T = iter_per_T
        self.callback = callback  # function(event_type, data)

        self.n = len(tasks)
        self.current_order: List[int] = []
        self.current_cost: float = 0.0
        self.best_order: List[int] = []
        self.best_cost: float = float("inf")
        self.T: float = T_max
        self.iter_at_T: int = 0
        self.global_iter: int = 0
        self.running = False

    def start(self):
        if self.n == 0:
            if self.callback:
                self.callback("error", "Tidak ada tugas untuk dioptimasi.")
            return

        self.running = True
        self.T = self.T_max
        self.iter_at_T = 0
        self.global_iter = 0
        
        # Solusi awal: urutkan berdasarkan deadline (heuristik masuk akal)
        self.current_order = sorted(range(self.n), key=lambda i: self.tasks[i].deadline)
        self.current_cost = compute_cost(self.current_order, self.tasks)
        self.best_order = self.current_order[:]
        self.best_cost = self.current_cost

        if self.callback:
            self.callback("start", {
                "T_max": self.T_max,
                "T_min": self.T_min,
                "alpha": self.alpha,
                "iter_per_T": self.iter_per_T,
                "initial_cost": self.current_cost
            })

    def step(self, batch_size=1):
        if not self.running:
            return False

        if self.T <= self.T_min:
            self.running = False
            if self.callback:
                best_schedule_names = [self.tasks[i].name for i in self.best_order]
                self.callback("finish", {
                    "best_cost": self.best_cost,
                    "best_order": self.best_order,
                    "best_schedule": best_schedule_names
                })
            return False

        for _ in range(batch_size):
            if self.iter_at_T >= self.iter_per_T:
                self.T *= self.alpha
                self.iter_at_T = 0
                if self.callback:
                    self.callback("temp_change", {"T": self.T})
                
                if self.T <= self.T_min:
                    break

            new_order = neighbour(self.current_order)
            new_cost = compute_cost(new_order, self.tasks)
            delta = new_cost - self.current_cost

            accepted = False
            if delta < 0:
                # solusi lebih bagus → selalu diterima
                self.current_order, self.current_cost = new_order, new_cost
                accepted = True
            else:
                # solusi lebih buruk → diterima dengan probabilitas exp(-delta / T)
                prob = math.exp(-delta / self.T)
                if random.random() < prob:
                    self.current_order, self.current_cost = new_order, new_cost
                    accepted = True

            self.global_iter += 1
            self.iter_at_T += 1

            if self.current_cost < self.best_cost:
                self.best_order = self.current_order[:]
                self.best_cost = self.current_cost

            # Emit progress setiap beberapa iterasi
            if self.global_iter % 50 == 0:
                if self.callback:
                    self.callback("progress", {
                        "iter": self.global_iter,
                        "T": self.T,
                        "current_cost": self.current_cost,
                        "best_cost": self.best_cost,
                        "accepted": accepted
                    })
        
        return True

# =========================================================
#  Headless Runner
# =========================================================
def run_headless():
    # Load tasks
    if not os.path.exists(HISTORY_FILE):
        print(json.dumps({"type": "error", "message": "History file not found"}))
        return

    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        tasks = [Task(**item) for item in data]
    except Exception as e:
        print(json.dumps({"type": "error", "message": str(e)}))
        return

    # Callback untuk print JSON
    def on_event(event_type, data):
        # Flush stdout agar segera terkirim ke nodejs
        print(json.dumps({"type": event_type, "data": data}), flush=True)

    # Setup Engine (pakai parameter SA yang baru)
    engine = SAEngine(
        tasks,
        T_max=100.0,
        T_min=0.1,
        alpha=0.95,
        iter_per_T=10,
        callback=on_event,
    )
    engine.start()

    # Loop sampai selesai
    while engine.running:
        engine.step(batch_size=50)
        time.sleep(0.01) # Sedikit delay agar tidak membebani CPU berlebih

# =========================================================
#  GUI Runner (Legacy Wrapper)
# =========================================================
class GUIAdapter:
    def __init__(self, gui, tasks):
        self.gui = gui
        # SAEngine pakai default baru yang lebih masuk akal
        self.engine = SAEngine(tasks, callback=self.on_event)
        self.iter_history = []
        self.cost_history = []
    
    def on_event(self, event_type, data):
        if event_type == "start":
            self.gui.clear_log()
            self.gui.log(f"Mulai SA: Cost awal = {data['initial_cost']:.4f}")
            self.iter_history = [0]
            self.cost_history = [data['initial_cost']]
            self.gui.update_plot(self.iter_history, self.cost_history)
            
        elif event_type == "temp_change":
            self.gui.log(f"Turun suhu: T = {data['T']:.5f}")
            
        elif event_type == "progress":
            self.iter_history.append(data['iter'])
            self.cost_history.append(data['best_cost'])
            self.gui.log(f"Iter {data['iter']} | T={data['T']:.4f} | best={data['best_cost']:.4f}")
            
        elif event_type == "finish":
            self.gui.log("SA selesai.")
            self.gui.log(f"Best cost = {data['best_cost']:.4f}")
            self.gui.show_best_order(data['best_order'], self.engine.tasks, data['best_cost'])
            self.stop()

    def start(self):
        self.engine.start()
        self.gui.set_run_button_state("disabled")
        self.gui.set_add_clear_buttons_state("disabled")
        self.gui.root.after(1, self.step_loop)

    def stop(self):
        self.engine.running = False
        self.gui.set_run_button_state("normal")
        self.gui.set_add_clear_buttons_state("normal")

    def step_loop(self):
        if self.engine.step(batch_size=5):
            self.gui.update_plot(self.iter_history, self.cost_history)
            self.gui.root.after(1, self.step_loop)


# ==========================================
#  GUI Utama (Modified to use Adapter)
# ==========================================
class ToDoSAGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Simulated Annealing - Optimisasi Prioritas To-Do List")

        self.tasks: List[Task] = []
        self.adapter: GUIAdapter | None = None

        self._build_widgets()
        self.load_history()

    # ---------- Persistence ----------
    def load_history(self):
        if not os.path.exists(HISTORY_FILE):
            return
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.tasks = [Task(**item) for item in data]
            self.refresh_task_list()
        except Exception as e:
            messagebox.showerror("Error", f"Gagal load history: {e}")

    def save_history(self):
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump([asdict(t) for t in self.tasks], f, indent=2)
        except Exception as e:
            messagebox.showerror("Error", f"Gagal simpan history: {e}")

    # ---------- UI ----------
    def _build_widgets(self):
        main_frame = ttk.Frame(self.root, padding=10)
        main_frame.grid(row=0, column=0, sticky="nsew")

        self.root.rowconfigure(0, weight=1)
        self.root.columnconfigure(0, weight=1)

        # Left panel: input + list tugas
        left_frame = ttk.Frame(main_frame)
        left_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        main_frame.columnconfigure(0, weight=0)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(0, weight=1)

        # Input fields
        ttk.Label(left_frame, text="Nama Tugas:").grid(row=0, column=0, sticky="w")
        self.entry_name = ttk.Entry(left_frame, width=30)
        self.entry_name.grid(row=0, column=1, sticky="w")

        ttk.Label(left_frame, text="Deadline (jam dari sekarang):").grid(row=1, column=0, sticky="w")
        self.entry_deadline = ttk.Entry(left_frame, width=10)
        self.entry_deadline.grid(row=1, column=1, sticky="w")

        ttk.Label(left_frame, text="Durasi (jam):").grid(row=2, column=0, sticky="w")
        self.entry_duration = ttk.Entry(left_frame, width=10)
        self.entry_duration.grid(row=2, column=1, sticky="w")

        ttk.Label(left_frame, text="Difficulty (1-5):").grid(row=3, column=0, sticky="w")
        self.entry_difficulty = ttk.Entry(left_frame, width=5)
        self.entry_difficulty.grid(row=3, column=1, sticky="w")

        # Buttons add / clear
        btn_frame = ttk.Frame(left_frame)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=5, sticky="w")

        self.btn_add = ttk.Button(btn_frame, text="Tambah Tugas", command=self.add_task)
        self.btn_add.grid(row=0, column=0, padx=(0, 5))

        self.btn_clear = ttk.Button(btn_frame, text="Hapus Semua Tugas", command=self.clear_tasks)
        self.btn_clear.grid(row=0, column=1, padx=(0, 5))

        # Listbox tugas
        ttk.Label(left_frame, text="Daftar Tugas:").grid(row=5, column=0, columnspan=2, sticky="w", pady=(10, 0))
        self.task_listbox = tk.Listbox(left_frame, width=50, height=10)
        self.task_listbox.grid(row=6, column=0, columnspan=2, sticky="nsew")
        left_frame.rowconfigure(6, weight=1)

        # Tombol Run SA
        self.btn_run = ttk.Button(left_frame, text="Run Simulated Annealing", command=self.run_sa)
        self.btn_run.grid(row=7, column=0, columnspan=2, pady=10, sticky="ew")

        # Right panel: log + plot
        right_frame = ttk.Frame(main_frame)
        right_frame.grid(row=0, column=1, sticky="nsew")
        right_frame.rowconfigure(1, weight=1)
        right_frame.columnconfigure(0, weight=1)

        # Log area
        ttk.Label(right_frame, text="Log Proses SA:").grid(row=0, column=0, sticky="w")
        self.text_log = tk.Text(right_frame, height=10, wrap="word")
        self.text_log.grid(row=1, column=0, sticky="nsew")
        scrollbar = ttk.Scrollbar(right_frame, orient="vertical", command=self.text_log.yview)
        scrollbar.grid(row=1, column=1, sticky="ns")
        self.text_log["yscrollcommand"] = scrollbar.set

        # Plot area
        ttk.Label(right_frame, text="Grafik Best Cost vs Iterasi:").grid(row=2, column=0, sticky="w", pady=(10, 0))
        
        # Matplotlib Figure
        import matplotlib.pyplot as plt
        from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
        
        self.fig, self.ax = plt.subplots(figsize=(5, 3))
        self.ax.set_xlabel("Iterasi")
        self.ax.set_ylabel("Best Cost")
        self.ax.grid(True)

        self.line, = self.ax.plot([], [], marker="o", linestyle="-")
        self.canvas = FigureCanvasTkAgg(self.fig, master=right_frame)
        self.canvas_widget = self.canvas.get_tk_widget()
        self.canvas_widget.grid(row=3, column=0, columnspan=2, sticky="nsew")
        right_frame.rowconfigure(3, weight=1)

    # ---------- Task ops ----------
    def add_task(self):
        name = self.entry_name.get().strip()
        if not name:
            messagebox.showwarning("Input salah", "Nama tugas tidak boleh kosong.")
            return

        try:
            deadline = float(self.entry_deadline.get())
            duration = float(self.entry_duration.get())
            difficulty = int(self.entry_difficulty.get())
        except ValueError:
            messagebox.showwarning("Input salah", "Deadline/durasi/difficulty harus angka.")
            return

        if difficulty < 1 or difficulty > 5:
            messagebox.showwarning("Input salah", "Difficulty harus 1 sampai 5.")
            return

        task = Task(name, deadline, duration, difficulty)
        self.tasks.append(task)
        self.refresh_task_list()
        self.save_history()

        # clear input
        self.entry_name.delete(0, tk.END)
        self.entry_deadline.delete(0, tk.END)
        self.entry_duration.delete(0, tk.END)
        self.entry_difficulty.delete(0, tk.END)

    def clear_tasks(self):
        if not self.tasks:
            return
        if messagebox.askyesno("Konfirmasi", "Yakin hapus semua tugas?"):
            self.tasks = []
            self.refresh_task_list()
            self.save_history()

    def refresh_task_list(self):
        self.task_listbox.delete(0, tk.END)
        for i, t in enumerate(self.tasks, start=1):
            self.task_listbox.insert(
                tk.END,
                f"{i}. {t.name} | deadline={t.deadline} jam | durasi={t.duration} jam | diff={t.difficulty}"
            )

    # ---------- SA control ----------
    def run_sa(self):
        if self.adapter is not None and self.adapter.engine.running:
            messagebox.showinfo("Info", "SA sudah berjalan.")
            return

        self.adapter = GUIAdapter(self, self.tasks)
        self.adapter.start()

    def set_run_button_state(self, state: str):
        self.btn_run["state"] = state

    def set_add_clear_buttons_state(self, state: str):
        self.btn_add["state"] = state
        self.btn_clear["state"] = state

    # ---------- Log + Plot + Hasil ----------
    def log(self, text: str):
        self.text_log.insert(tk.END, text + "\n")
        self.text_log.see(tk.END)

    def clear_log(self):
        self.text_log.delete("1.0", tk.END)

    def update_plot(self, iters: List[int], costs: List[float]):
        self.line.set_data(iters, costs)
        if iters:
            self.ax.set_xlim(0, max(iters) + 1)
        if costs:
            ymin = min(costs)
            ymax = max(costs)
            if ymin == ymax:
                ymin -= 1
                ymax += 1
            self.ax.set_ylim(ymin, ymax)
        self.canvas.draw_idle()

    def show_best_order(self, best_order: List[int], tasks: List[Task], best_cost: float):
        self.log("\n=== Urutan Tugas Optimal (Best Solution) ===")
        t = 0.0
        for pos, idx in enumerate(best_order, start=1):
            task = tasks[idx]
            start_time = t
            end_time = start_time + task.duration
            lateness = max(0.0, end_time - task.deadline)
            self.log(
                f"{pos}. {task.name} | start={start_time:.2f} | end={end_time:.2f} | "
                f"deadline={task.deadline:.2f} | lateness={lateness:.2f} | diff={task.difficulty}"
            )
            t = end_time
        self.log(f"\nBest total cost = {best_cost:.4f}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--headless", action="store_true", help="Run in headless mode (JSON output)")
    args = parser.parse_args()

    if args.headless:
        run_headless()
    else:
        # Import GUI libs only here

        matplotlib.use("TkAgg")
        
        root = tk.Tk()
        app = ToDoSAGUI(root)
        root.protocol("WM_DELETE_WINDOW", lambda: (app.save_history(), root.destroy()))
        root.mainloop()


if __name__ == "__main__":
    main()
