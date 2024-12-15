const socket = io();

const loginSection = document.getElementById('loginSection');
const chatSection = document.getElementById('chatSection');
const usernameInput = document.getElementById('usernameInput');
const messageInput = document.getElementById('messageInput');
const messages = document.getElementById('messages');
const userList = document.getElementById('userList');
const fileInput = document.getElementById('fileInput');
const fileUploadBtn = document.getElementById('fileUploadBtn');
const notificationSound = document.getElementById('notificationSound');

let currentUsername = '';

// Join Chat
document.getElementById('joinButton').addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        currentUsername = username;
        socket.emit('user join', username);
        loginSection.classList.add('hidden');
        chatSection.classList.remove('hidden');
    }
});

// File Upload Button
fileUploadBtn.addEventListener('click', () => {
    fileInput.click();
});

// File Input Change Event
fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    for (let file of files) {
        await uploadFile(file);
    }
    // Reset file input
    fileInput.value = '';
});

// File Upload Function
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const fileData = await response.json();

        // Determine file type
        const fileType = getFileType(file.type);

        // Emit file message
        socket.emit('file message', {
            filename: fileData.filename,
            originalname: fileData.originalname,
            path: fileData.path,
            type: fileType
        });
    } catch (error) {
        console.error('File upload error:', error);
        alert('File upload failed');
    }
}

// Determine file type
function getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

// Send Message on Enter or Button Click
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', message);
        messageInput.value = '';
        
        // Play notification sound
        notificationSound.play();
    }
}

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
        
        // Play notification sound
        notificationSound.play();
    }
});

document.getElementById('sendButton').addEventListener('click', sendMessage);

// Receive Messages
socket.on('chat message', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');

    if (data.type === 'system') {
        messageDiv.classList.add('system');
    } else {
        messageDiv.classList.add(data.username === currentUsername ? 'sent' : 'received');
    }

    messageDiv.innerHTML = `
        <strong>${data.username === currentUsername ? 'You' : data.username}</strong>
        <p>${data.message}</p>
    `;

    messages.appendChild(messageDiv);
    scrollToBottom();
});

// Receive File Messages
socket.on('file message', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'file-message');
    messageDiv.classList.add(data.username === currentUsername ? 'sent' : 'received');

    let fileContent = '';
    switch(data.file.type) {
        case 'image':
            fileContent = `<img src="${data.file.path}" alt="${data.file.originalname}" class="file-preview">`;
            break;
        case 'video':
            fileContent = `<video controls class="file-preview">
                <source src="${data.file.path}" type="video/mp4">
                Your browser does not support the video tag.
            </video>`;
            break;
        case 'audio':
            fileContent = `<audio controls class="file-preview">
                <source src="${data.file.path}" type="audio/mpeg">
                Your browser does not support the audio tag.
            </audio>`;
            break;
        default:
            fileContent = `<a href="${data.file.path}" download>${data.file.originalname}</a>`;
    }

    messageDiv.innerHTML = `
        <strong>${data.username === currentUsername ? 'You' : data.username}</strong>
        <div class="file-content">${fileContent}</div>
    `;

    messages.appendChild(messageDiv);
    scrollToBottom();
});

// Scroll to bottom function
function scrollToBottom() {
    messages.scrollTo({
        top: messages.scrollHeight,
        behavior: 'smooth'
    });
}

// Update User List
socket.on('user list', (users) => {
    userList.innerHTML = '<h3>Online Users</h3>';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.textContent = user;
        userList.appendChild(userDiv);
    });
});