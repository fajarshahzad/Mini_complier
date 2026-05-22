# Mini Compiler

A modern and interactive compiler construction platform built using **React**, **FastAPI**, and multiple parsing techniques. This project provides a complete environment for lexical analysis, syntax analysis, parsing visualization, token generation, grammar validation, and compiler learning.

---

# One-Click Run (IMPORTANT)

This project includes a **`run.bat`** file in the root directory.

### Simply do this:

```bash
Double-click run.bat
```

OR run from terminal:

```bash
run.bat
```

### What it does automatically:

* Checks Python installation
* Checks Node.js installation
* Installs backend dependencies (`requirements.txt`)
* Installs frontend dependencies (`npm install`)
* Starts FastAPI backend server
* Starts React frontend server
* Opens the application automatically (if configured)


---

# Features

## Core Compiler Features

* Lexical Analysis (Lexer)
* Token Generation
* Syntax Analysis
* Parse Tree Generation
* Grammar Validation
* Error Detection & Reporting
* Multiple Parsing Algorithms
* Step-by-Step Parsing Visualization
* Real-Time Compilation Feedback

---

# Supported Parsing Techniques

* LL(1) Parser
* Recursive Descent Parser
* Non-Recursive Predictive Parser
* LR Parser
* Custom Grammar Handling

---

# Tech Stack

## Frontend

* React.js
* Tailwind CSS
* JavaScript
* Axios
* Framer Motion

## Backend

* FastAPI
* Python
* Pydantic
* Uvicorn

## Compiler Concepts

* Lexical Analysis
* Syntax Analysis
* Context-Free Grammars
* Parse Trees
* Tokenization
* Error Handling
* Parsing Algorithms

---

# Project Structure

```bash
project/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── components/
│   ├── pages/
│   └── package.json
│
├── backend/
│   ├── app.py
│   ├── auth/
│   ├── parsers/
│   │   ├── lexer
│   │   ├── ll1
│   │   ├── recursive_descent
│   │   ├── non_recursive
│   │   └── lr_parser
│   ├── requirements.txt
│
├── run.bat
└── README.md
```

---

# Installation (Manual Alternative)

If you don’t want to use `run.bat`, follow these steps:

---

## Clone Repository

```bash
git clone https://https://github.com/fajarshahzad/Mini_complier
cd Mini_compiler
```

---

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# API Endpoints

## Lexer

```http
POST /lexer/tokenize
```

## LL1 Parser

```http
POST /parser/ll1
```

## Recursive Descent Parser

```http
POST /parser/recursive
```
## Contributors

* Fajar Shahzad
* Talha Ghaffar
* Anas Fiaz

# Note

This project is fully automated using `run.bat`. Just run it and everything will be set up automatically.
