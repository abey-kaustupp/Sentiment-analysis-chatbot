document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // Function to add a message to the chat
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        
        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        
        const icon = document.createElement('i');
        icon.classList.add('fas', isUser ? 'fa-user' : 'fa-smile');
        avatar.appendChild(icon);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        // Format the response with sentiment highlighting
        const formattedContent = formatSentimentResponse(content);
        messageContent.innerHTML = formattedContent;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to format sentiment response with highlights
    function formatSentimentResponse(text) {
        // Highlight sentiment labels
        text = text.replace(/\*\*Sentiment:\*\* (Positive)/gi, '**Sentiment:** <span class="positive">$1</span>');
        text = text.replace(/\*\*Sentiment:\*\* (Negative)/gi, '**Sentiment:** <span class="negative">$1</span>');
        text = text.replace(/\*\*Sentiment:\*\* (Neutral)/gi, '**Sentiment:** <span class="neutral">$1</span>');
        
        // Highlight confidence scores
        text = text.replace(/\*\*Confidence:\*\* (\d+)%/gi, '**Confidence:** <span class="confidence">$1%</span>');
        
        // Convert markdown-style bold to HTML
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert line breaks to HTML
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
    
    // Function to show typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.classList.add('message', 'bot-message');
        
        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-smile');
        avatar.appendChild(icon);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('typing-indicator');
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.classList.add('typing-dot');
            messageContent.appendChild(dot);
        }
        
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(messageContent);
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return typingDiv;
    }
    
    // Function to send message to the server
    async function sendMessage() {
        const message = userInput.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        addMessage(message, true);
        
        // Clear input
        userInput.value = '';
        
        // Show typing indicator
        const typingIndicator = showTypingIndicator();
        
        try {
            // Send message to server
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            if (typingIndicator && typingIndicator.parentNode) {
                chatMessages.removeChild(typingIndicator);
            }
            
            if (data.error) {
                addMessage('Sorry, there was an error processing your request: ' + data.error);
            } else {
                addMessage(data.response);
            }
        } catch (error) {
            // Remove typing indicator
            if (typingIndicator && typingIndicator.parentNode) {
                chatMessages.removeChild(typingIndicator);
            }
            
            addMessage('Sorry, there was a connection error. Please try again.');
            console.error('Error:', error);
        }
    }
    
    // Event listeners - FIXED: Properly attach event listeners
    sendButton.addEventListener('click', function(e) {
        e.preventDefault();
        sendMessage();
    });
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Focus input on load
    userInput.focus();
    
    // Add clear chat function
    function addClearButton() {
        // Check if clear button already exists
        if (document.getElementById('clear-button')) return;
        
        const clearButton = document.createElement('button');
        clearButton.id = 'clear-button';
        clearButton.innerHTML = '<i class="fas fa-trash"></i> Clear Chat';
        clearButton.addEventListener('click', clearChat);
        
        const header = document.querySelector('header');
        header.style.position = 'relative';
        header.appendChild(clearButton);
    }
    
    // Function to clear chat
    async function clearChat() {
        try {
            // Clear the chat UI
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML = '';
            
            // Add the initial bot message
            addMessage("Hello! I'm your Sentiment Analysis Assistant. Send me any text, and I'll analyze its sentiment, provide a confidence score, and explain my reasoning.", false);
            
            // Optionally, you could also call a backend endpoint to reset the session
            // await fetch('/clear', { method: 'POST' });
            
        } catch (error) {
            console.error('Error clearing chat:', error);
        }
    }
    
    // Add clear button when page loads
    addClearButton();
});