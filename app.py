from flask import Flask, render_template, request, jsonify, session
import google.generativeai as genai
import os
from dotenv import load_dotenv
import uuid
from datetime import timedelta
import random
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'sentiment-analysis-secret-key')
app.permanent_session_lifetime = timedelta(hours=2)

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("No Gemini API key found. Please set GEMINI_API_KEY in your environment variables.")

genai.configure(api_key=GEMINI_API_KEY)

# Create the model
generation_config = {
    "temperature": 0.8,  # Higher temperature for more varied responses
    "top_p": 0.9,
    "top_k": 40,
    "max_output_tokens": 500,
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
)

# System prompt for sentiment analysis with explicit percentage format request
SENTIMENT_PROMPT = """You are a sentiment analysis assistant. Analyze the text and provide:
1. Sentiment classification (Positive/Negative/Neutral)
2. Confidence score as a percentage between 0-100% (always use percentage format, not decimal)
3. Explanation of your reasoning
4. Key words/phrases that influenced your decision

Format your response with these exact headings:
**Sentiment:** [Positive/Negative/Neutral]
**Confidence:** [X]% (always include the % symbol)
**Explanation:** [Your explanation here]
**Key Indicators:** [List of words/phrases]"""

@app.before_request
def make_session_permanent():
    session.permanent = True
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        user_message = request.json.get('message')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Combine system prompt with user message
        full_prompt = f"{SENTIMENT_PROMPT}\n\nAnalyze the following text:\n{user_message}"
        
        # Send message to Gemini API
        response = model.generate_content(full_prompt)
        response_text = response.text
        
        # Normalize confidence score formatting to always use percentage
        response_text = normalize_confidence_score(response_text)
        
        return jsonify({
            'response': response_text
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def normalize_confidence_score(text):
    """
    Ensure confidence score is always formatted as a percentage with % symbol
    """
    # Pattern to find confidence scores (both decimal and percentage formats)
    patterns = [
        r"\*\*Confidence:\*\*\s*(\d*\.?\d+)%?",  # Matches **Confidence:** 85% or **Confidence:** 85
        r"Confidence:\s*(\d*\.?\d+)%?",  # Matches Confidence: 85% or Confidence: 85
        r"Confidence score:\s*(\d*\.?\d+)%?",  # Matches Confidence score: 85% or Confidence score: 85
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            score_str = match.group(1)
            
            # Convert to percentage format if needed
            try:
                # Handle decimal format (e.g., 0.85)
                if "." in score_str and float(score_str) <= 1.0:
                    score_percent = int(float(score_str) * 100)
                # Handle whole number format (e.g., 85 or 85%)
                else:
                    score_percent = int(float(score_str))
                
                # Ensure score is within valid range
                score_percent = max(0, min(100, score_percent))
                
                # Replace with properly formatted percentage
                replacement = f"**Confidence:** {score_percent}%"
                text = text.replace(match.group(0), replacement)
                
            except ValueError:
                # If conversion fails, keep the original but add % if missing
                if "%" not in match.group(0):
                    text = text.replace(match.group(0), match.group(0) + "%")
    
    # Ensure all confidence references use the same heading format
    text = re.sub(r"(Confidence:?|Confidence score:?)", "**Confidence:**", text, flags=re.IGNORECASE)
    
    return text

if __name__ == '__main__':
    app.run(debug=True)