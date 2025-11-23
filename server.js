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

// Endpoint to run Python script with SSE
app.get('/api/run-sa', (req, res) => {
    console.log('Starting Python script (Headless)...');

    // SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const pythonProcess = spawn('python', [PYTHON_SCRIPT, '--headless'], {
        cwd: PYTHON_DIR
    });

    pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            if (line.trim()) {
                res.write(`data: ${line}\n\n`);
            }
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
        res.write(`data: ${JSON.stringify({ type: 'error', message: data.toString() })}\n\n`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python script exited with code ${code}`);
        res.write('event: close\ndata: done\n\n');
        res.end();
    });

    req.on('close', () => {
        pythonProcess.kill();
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
