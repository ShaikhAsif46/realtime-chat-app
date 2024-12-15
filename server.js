const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB file size limit
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        res.json({ 
            filename: req.file.filename, 
            originalname: req.file.originalname,
            path: `/uploads/${req.file.filename}` 
        });
    } else {
        res.status(400).send('No file uploaded');
    }
});

// Store connected users
const users = new Set();

io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle user join
    socket.on('user join', (username) => {
        users.add(username);
        socket.username = username;
        
        // Broadcast new user to all clients
        io.emit('user list', Array.from(users));
        io.emit('chat message', {
            username: 'System',
            message: `${username} has joined the chat`,
            type: 'system'
        });
    });

    // Handle chat messages
    socket.on('chat message', (msg) => {
        io.emit('chat message', {
            username: socket.username,
            message: msg,
            type: 'user'
        });
    });

    // Handle file sharing
    socket.on('file message', (fileData) => {
        io.emit('file message', {
            username: socket.username,
            file: fileData,
            type: 'file'
        });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.username);
            io.emit('user list', Array.from(users));
            io.emit('chat message', {
                username: 'System',
                message: `${socket.username} has left the chat`,
                type: 'system'
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});