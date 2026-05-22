# backend/compiler/lexer.py

import re

class Token:
    def __init__(self, type_, value, line, column):
        self.type = type_
        self.value = value
        self.line = line
        self.column = column

    def __repr__(self):
        return f"Token({self.type}, '{self.value}', Line:{self.line}, Col:{self.column})"

    def to_dict(self):
        return {
            "type": self.type,
            "value": self.value,
            "line": self.line,
            "column": self.column
        }

class Lexer:
    def __init__(self, source_code: str):
        self.source = source_code
        self.source_len = len(source_code)
        
        # Double buffering simulation
        self.BUFFER_SIZE = 128
        self.buffer1 = ""
        self.buffer2 = ""
        self.active_buffer = 1 # 1 or 2
        self.buffer_ptr = 0
        self.source_ptr = 0
        
        # Pointers and tracking
        self.line = 1
        self.column = 1
        self.lexeme_begin_line = 1
        self.lexeme_begin_col = 1
        
        # Load initial buffer
        self._load_buffer(1)
        
        self.keywords = {
            "program", "var", "integer", "real", "char", "const",
            "begin", "end", "if", "then", "else", "while", "do",
            "write", "writeln"
        }
        
    def _load_buffer(self, buf_num):
        chunk = self.source[self.source_ptr : self.source_ptr + self.BUFFER_SIZE]
        self.source_ptr += len(chunk)
        if buf_num == 1:
            self.buffer1 = chunk
        else:
            self.buffer2 = chunk

    def _next_char(self):
        """Reads the next character from double buffer."""
        # Get buffer content
        active_content = self.buffer1 if self.active_buffer == 1 else self.buffer2
        
        if self.buffer_ptr >= len(active_content):
            # We reached the end of the active buffer
            # Load the other buffer
            other_buf = 2 if self.active_buffer == 1 else 1
            self._load_buffer(other_buf)
            self.active_buffer = other_buf
            self.buffer_ptr = 0
            
            active_content = self.buffer1 if self.active_buffer == 1 else self.buffer2
            if len(active_content) == 0:
                return None # EOF
                
        char = active_content[self.buffer_ptr]
        self.buffer_ptr += 1
        
        # Track line/column
        if char == '\n':
            self.line += 1
            self.column = 1
        else:
            self.column += 1
            
        return char

    def _peek_char(self):
        """Peeks at the next character without advancing."""
        active_content = self.buffer1 if self.active_buffer == 1 else self.buffer2
        ptr = self.buffer_ptr
        
        if ptr >= len(active_content):
            # Check if there is data left in source
            if self.source_ptr >= self.source_len:
                return None # Truly EOF
            # Else, mock-peek from source directly
            return self.source[self.source_ptr]
            
        return active_content[ptr]

    def get_next_token(self):
        """Lexical analyzer main state machine loop."""
        while True:
            char = self._peek_char()
            if char is None:
                return Token("$", "$", self.line, self.column) # EOF
                
            # Skip whitespaces
            if char.isspace():
                self._next_char()
                continue
                
            # Skip comments: (* ... *) or { ... }
            if char == '{':
                self._next_char() # consume '{'
                while True:
                    c = self._next_char()
                    if c is None:
                        raise ValueError(f"Lexical Error: Unclosed comment starting at line {self.line}")
                    if c == '}':
                        break
                continue
                
            if char == '(' and self.source[self.source_ptr : self.source_ptr + 1] == '*':
                # Check for (* comments
                self._next_char() # consume '('
                self._next_char() # consume '*'
                while True:
                    c = self._next_char()
                    if c is None:
                        raise ValueError(f"Lexical Error: Unclosed comment starting at line {self.line}")
                    if c == '*' and self._peek_char() == ')':
                        self._next_char() # consume ')'
                        break
                continue

            self.lexeme_begin_line = self.line
            self.lexeme_begin_col = self.column
            
            # 1. Identifiers and Keywords
            if char.isalpha() or char == '_':
                lexeme = ""
                while True:
                    c = self._peek_char()
                    if c and (c.isalnum() or c == '_'):
                        lexeme += self._next_char()
                    else:
                        break
                if lexeme.lower() in self.keywords:
                    return Token(lexeme.lower(), lexeme, self.lexeme_begin_line, self.lexeme_begin_col)
                return Token("IDENTIFIER", lexeme, self.lexeme_begin_line, self.lexeme_begin_col)
                
            # 2. Numbers (Integer or Real)
            if char.isdigit():
                lexeme = ""
                while True:
                    c = self._peek_char()
                    if c and c.isdigit():
                        lexeme += self._next_char()
                    else:
                        break
                
                # Check for decimal point for REAL
                if self._peek_char() == '.':
                    # Peek next next to ensure it's not the end of a program statement like "end."
                    # We can look directly at source index
                    next_idx = self.source_ptr if self.buffer_ptr >= len(self.buffer1 if self.active_buffer == 1 else self.buffer2) else self.source_ptr - (len(self.buffer1 if self.active_buffer == 1 else self.buffer2) - self.buffer_ptr)
                    if next_idx + 1 < self.source_len and self.source[next_idx + 1].isdigit():
                        lexeme += self._next_char() # consume '.'
                        while True:
                            c = self._peek_char()
                            if c and c.isdigit():
                                lexeme += self._next_char()
                            else:
                                break
                        return Token("REAL_CONST", lexeme, self.lexeme_begin_line, self.lexeme_begin_col)
                
                return Token("INT_CONST", lexeme, self.lexeme_begin_line, self.lexeme_begin_col)

            # 3. Character Constants: 'a'
            if char == "'":
                self._next_char() # consume opening single-quote
                c = self._next_char()
                if c is None or c == "'":
                    raise ValueError(f"Lexical Error: Empty or malformed character constant at line {self.lexeme_begin_line}")
                closing = self._next_char()
                if closing != "'":
                    raise ValueError(f"Lexical Error: Unclosed character constant at line {self.lexeme_begin_line}")
                return Token("CHAR_CONST", f"'{c}'", self.lexeme_begin_line, self.lexeme_begin_col)

            # 4. Multi-character operators: :=, <=, >=, <>
            if char == ':':
                self._next_char() # consume ':'
                if self._peek_char() == '=':
                    self._next_char() # consume '='
                    return Token(":=", ":=", self.lexeme_begin_line, self.lexeme_begin_col)
                return Token(":", ":", self.lexeme_begin_line, self.lexeme_begin_col)
                
            if char == '<':
                self._next_char()
                if self._peek_char() == '=':
                    self._next_char()
                    return Token("<=", "<=", self.lexeme_begin_line, self.lexeme_begin_col)
                if self._peek_char() == '>':
                    self._next_char()
                    return Token("<>", "<>", self.lexeme_begin_line, self.lexeme_begin_col)
                return Token("<", "<", self.lexeme_begin_line, self.lexeme_begin_col)
                
            if char == '>':
                self._next_char()
                if self._peek_char() == '=':
                    self._next_char()
                    return Token(">=", ">=", self.lexeme_begin_line, self.lexeme_begin_col)
                return Token(">", ">", self.lexeme_begin_line, self.lexeme_begin_col)
                
            # 5. Single-character operators and punctuation
            single_tokens = {
                '=': '=', '+': '+', '-': '-', '*': '*', '/': '/',
                ';': ';', ',': ',', '(': '(', ')': ')', '.': '.'
            }
            if char in single_tokens:
                val = self._next_char()
                return Token(single_tokens[char], val, self.lexeme_begin_line, self.lexeme_begin_col)
                
            # Invalid character
            invalid_char = self._next_char()
            raise ValueError(f"Lexical Error: Invalid character '{invalid_char}' at line {self.lexeme_begin_line}, col {self.lexeme_begin_col}")

    def tokenize_all(self):
        """Tokenize the entire source code and return a list of tokens."""
        tokens = []
        errors = []
        try:
            while True:
                tok = self.get_next_token()
                tokens.append(tok)
                if tok.type == "$":
                    break
        except Exception as e:
            errors.append(str(e))
        return tokens, errors
