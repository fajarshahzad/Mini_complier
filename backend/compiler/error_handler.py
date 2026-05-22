# backend/compiler/error_handler.py

class CompilerError:
    def __init__(self, type_: str, message: str, line: int, column: int):
        self.type = type_ # 'Lexical', 'Syntactic', or 'Semantic'
        self.message = message
        self.line = line
        self.column = column

    def to_dict(self):
        return {
            "type": self.type,
            "message": self.message,
            "line": self.line,
            "column": self.column
        }

    def __repr__(self):
        return f"[{self.type} Error] {self.message} at Line:{self.line}, Col:{self.column}"

class ErrorHandler:
    def __init__(self):
        self.errors = []

    def report_lexical_error(self, message: str, line: int, column: int):
        self.errors.append(CompilerError("Lexical", message, line, column))

    def report_syntactic_error(self, message: str, line: int, column: int):
        self.errors.append(CompilerError("Syntactic", message, line, column))

    def report_semantic_error(self, message: str, line: int, column: int):
        self.errors.append(CompilerError("Semantic", message, line, column))

    def has_errors(self) -> bool:
        return len(self.errors) > 0

    def get_errors(self):
        return [err.to_dict() for err in self.errors]

    def clear(self):
        self.errors.clear()

    def get_summary(self) -> str:
        if not self.errors:
            return "Compilation successful. 0 errors detected."
        
        lex_count = sum(1 for e in self.errors if e.type == "Lexical")
        syn_count = sum(1 for e in self.errors if e.type == "Syntactic")
        sem_count = sum(1 for e in self.errors if e.type == "Semantic")
        
        return f"Compilation failed with {len(self.errors)} errors: " \
               f"{lex_count} Lexical, {syn_count} Syntactic, {sem_count} Semantic."
