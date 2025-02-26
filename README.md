# AI Chatbot

## Overview
This project is a real-time AI chat application where users can initiate conversations, interact with the AI, and access conversation histories. It leverages a frontend built with Next.js (React) and a backend powered by FastAPI. A WebSocket connection is used to facilitate seamless real-time communication with the AI model.

### Key Features
- **User Authentication**: Sign in via Google account using NextAuth.
- **Real-Time Chat**: Communicate with the AI through WebSockets for a dynamic experience.
- **Conversation Management**: Create, continue, and delete conversations as needed.
- **Message History**: View and manage past conversations stored in a JSON file.
- **AI Responses**: Powered by Groq API using the Llama model for intelligent replies.

---

## Table of Contents
1. [Technologies](#technologies)
2. [Setup Instructions](#setup-instructions)
   - [Frontend Setup (Next.js)](#frontend-setup-nextjs)
   - [Backend Setup (FastAPI)](#backend-setup-fastapi)
3. [API Endpoints](#api-endpoints)
4. [Project Structure](#project-structure)
5. [Environment Variables](#environment-variables)
6. [License](#license)

---

## Technologies
- **Frontend**: Next.js, React, TypeScript, WebSocket, NextAuth
- **Backend**: FastAPI, Python, WebSocket
- **Communication**: WebSockets for real-time communication
- **AI API**: Groq API (Llama model) for generating AI responses
- **Styling**: Tailwind CSS for modern UI components
- **Database**: Conversations stored in a JSON file for simplicity

---

## Setup Instructions

### Prerequisites
Ensure you have the following installed:
- Node.js (v16 or later)
- Python (v3.9 or later)
- Docker (optional, for containerization)
- A `.env` file for environment variables

---

### 1. Clone the Repository
Clone the repository to your local machine:
git clone <repository-url>
cd <repository-directory>

### 2. Frontend Setup (Next.js)
 cd frontend
npm install
npm run dev

### 3. Backend Setup (FastAPI)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows, use venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

## API Endpoints 
GET /conversations: Retrieve all saved conversations.
DELETE /conversations/{id}: Delete a specific conversation by ID.
WebSocket Endpoint
ws://localhost:8000/ws/{session_id}: WebSocket connection for real-time communication with the AI.

## Environment Variables 
GROQ_API_KEY=your_groq_api_key








