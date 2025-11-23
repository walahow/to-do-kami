import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const PYTHON_DIR = path.join(__dirname, 'src', 'Python');
const HISTORY_FILE = path.join(PYTHON_DIR, 'tasks_history.json');
const PYTHON_SCRIPT = 'SATodolist.py';

// Endpoint to save tasks
app.post('/api/save-tasks', async (req, res) => {
    try {
        const tasks = req.body;
        await fs.writeFile(HISTORY_FILE, JSON.stringify(tasks, null, 2));
        console.log('Tasks saved to', HISTORY_FILE);
        res.json({ success: true, message: 'Tasks saved successfully' });
    } catch (error) {
        console.error('Error saving tasks:', error);
        res.status(500).json({ success: false, error: 'Failed to save tasks' });
    }
});

// Endpoint to run Python script
app.post('/api/run-sa', (req, res) => {
    console.log('Starting Python script...');

    // Spawn the python process
    // We set the CWD to the Python directory so it finds the JSON file easily
    const pythonProcess = spawn('python', [PYTHON_SCRIPT], {
        cwd: PYTHON_DIR,
        stdio: 'inherit' // This allows the GUI to show up and output to flow to console
    });

    pythonProcess.on('error', (err) => {
        console.error('Failed to start Python script:', err);
        return res.status(500).json({ success: false, error: 'Failed to start Python script' });
    });

    // We don't wait for it to finish because it's a GUI app that might stay open
    res.json({ success: true, message: 'Python script started' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
