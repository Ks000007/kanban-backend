// File: server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

const DB_DIR = path.join(__dirname, 'db');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const TASKS_FILE = path.join(DB_DIR, 'tasks.json');

// Ensure the db directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function to read a file
const readFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`File not found: ${filePath}. Initializing with empty array.`);
            return [];
        }
        console.error(`Error reading file ${filePath}:`, error);
        return [];
    }
};

// Helper function to write to a file
const writeFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing to file ${filePath}:`, error);
    }
};

// ===================================
// AUTHENTICATION ROUTES
// ===================================

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const users = readFile(USERS_FILE);
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.status(200).json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
});

// Register endpoint
app.post('/api/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const users = readFile(USERS_FILE);

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '';
        for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
        return color;
    };
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        let initials = '';
        if (parts.length > 0 && parts[0].length > 0) initials += parts[0][0];
        if (parts.length > 1 && parts[1].length > 0) initials += parts[1][0];
        return initials.toUpperCase();
    };
    const randomColor = getRandomColor();
    const initials = getInitials(name);

    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password,
        role,
        avatar: `https://placehold.co/150x150/${randomColor}/ffffff?text=${initials}`,
        color: `#${randomColor}`,
    };

    users.push(newUser);
    writeFile(USERS_FILE, users);

    res.status(201).json({ success: true, user: newUser });
});

// Update a user's profile
app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const updatedUser = req.body;
    const users = readFile(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex !== -1) {
        users[userIndex] = {...users[userIndex], ...updatedUser };
        writeFile(USERS_FILE, users);
        res.status(200).json({ success: true, user: users[userIndex] });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// ===================================
// TASK ROUTES
// ===================================

// Get all tasks
app.get('/api/tasks', (req, res) => {
    const tasks = readFile(TASKS_FILE);
    res.status(200).json(tasks);
});

// Create a new task
app.post('/api/tasks', (req, res) => {
    const tasks = readFile(TASKS_FILE);
    const newTask = { id: Date.now().toString(), ...req.body };
    tasks.push(newTask);
    writeFile(TASKS_FILE, tasks);
    res.status(201).json(newTask);
});

// Update a task
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const updatedTask = req.body;
    const tasks = readFile(TASKS_FILE);
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex !== -1) {
        tasks[taskIndex] = {...tasks[taskIndex], ...updatedTask };
        writeFile(TASKS_FILE, tasks);
        res.status(200).json(tasks[taskIndex]);
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const tasks = readFile(TASKS_FILE);
    const initialLength = tasks.length;
    const updatedTasks = tasks.filter(t => t.id !== id);

    if (updatedTasks.length < initialLength) {
        writeFile(TASKS_FILE, updatedTasks);
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

// Get all users
app.get('/api/users', (req, res) => {
    const users = readFile(USERS_FILE);
    // Respond with a simplified list of users (without passwords)
    const sanitizedUsers = users.map(u => {
        const { password, ...safeUser } = u;
        return safeUser;
    });
    res.status(200).json(sanitizedUsers);
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});