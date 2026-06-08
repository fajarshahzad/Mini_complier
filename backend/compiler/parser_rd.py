# backend/compiler/parser_rd.py

from .lexer import Token
from .symbol_table import SymbolTableManager
from .error_handler import ErrorHandler
from .ast import (
    ProgramNode, VarDeclNode, CompoundStmtNode, AssignmentNode,
    IfStmtNode, WhileStmtNode, WriteStmtNode, BinaryOpNode,
    IdentifierNode, ConstantNode
)

class RecursiveDescentParser:
    def __init__(self, tokens: list, error_handler: ErrorHandler):
        self.tokens = tokens
        self.ptr = 0
        self.current_token = tokens[0] if tokens else Token("$", "$", 1, 1)
        self.symbol_table = SymbolTableManager()
        self.errors = error_handler
        
        # Track recursive call trace for visualization
        self.trace = []

    def _next_token(self):
        if self.ptr < len(self.tokens) - 1:
            self.ptr += 1
            self.current_token = self.tokens[self.ptr]
        else:
            self.current_token = Token("$", "$", self.current_token.line, self.current_token.column)

    def match(self, expected_type):
        if self.current_token.type == expected_type:
            val = self.current_token.value
            self._next_token()
            return val
        else:
            self.errors.report_syntactic_error(
                f"Expected '{expected_type}', found '{self.current_token.value}'",
                self.current_token.line,
                self.current_token.column
            )
            # Recover by skipping or simulating match
            val = f"<{expected_type}>"
            if self.current_token.type != "$":
                self._next_token()
            return val

    def log_call(self, name):
        self.trace.append(f"Enter {name} (Token: {self.current_token.value})")

    def parse(self):
        try:
            ast = self.parse_Program()
            return ast
        except Exception as e:
            self.errors.report_syntactic_error(f"Fatal parsing error: {str(e)}", self.current_token.line, self.current_token.column)
            return None

    # Program -> program IDENTIFIER ; Declarations CompoundStmt .
    def parse_Program(self):
        self.log_call("Program")
        self.match("program")
        prog_name = self.match("IDENTIFIER")
        self.match(";")
        
        # Enter global scope (already in global, but let's label it)
        decls = self.parse_Declarations()
        body = self.parse_CompoundStmt()
        self.match(".")
        return ProgramNode(prog_name, decls, body)

    # Declarations -> VarDecl | epsilon
    def parse_Declarations(self):
        self.log_call("Declarations")
        decls = []
        while self.current_token.type == "var":
            decls.append(self.parse_VarDecl())
        return decls

    # VarDecl -> var IdList : Type ; Declarations
    def parse_VarDecl(self):
        self.log_call("VarDecl")
        self.match("var")
        ids = self.parse_IdList()
        self.match(":")
        var_type = self.parse_Type()
        self.match(";")
        
        # Insert variables into symbol table
        for var_name, line in ids:
            success = self.symbol_table.insert(var_name, "variable", var_type, line)
            if not success:
                self.errors.report_semantic_error(
                    f"Variable '{var_name}' already declared in this scope",
                    line, 1
                )
                
        return VarDeclNode([name for name, _ in ids], var_type)

    # IdList -> IDENTIFIER IdListTail
    def parse_IdList(self):
        self.log_call("IdList")
        ids = []
        line = self.current_token.line
        val = self.match("IDENTIFIER")
        ids.append((val, line))
        ids.extend(self.parse_IdListTail())
        return ids

    # IdListTail -> , IDENTIFIER IdListTail | epsilon
    def parse_IdListTail(self):
        self.log_call("IdListTail")
        ids = []
        if self.current_token.type == ",":
            self.match(",")
            line = self.current_token.line
            val = self.match("IDENTIFIER")
            ids.append((val, line))
            ids.extend(self.parse_IdListTail())
        return ids

    # Type -> integer | real | char
    def parse_Type(self):
        self.log_call("Type")
        t = self.current_token.type
        if t in ["integer", "real", "char"]:
            return self.match(t)
        else:
            self.errors.report_syntactic_error(
                f"Expected variable type, found '{self.current_token.value}'",
                self.current_token.line,
                self.current_token.column
            )
            self._next_token()
            return "integer"

    # CompoundStmt -> begin StmtList end
    def parse_CompoundStmt(self):
        self.log_call("CompoundStmt")
        self.match("begin")
        # Enter nested scope inside compound statements
        self.symbol_table.enter_scope("block")
        
        stmts = self.parse_StmtList()
        
        self.symbol_table.exit_scope()
        self.match("end")
        return CompoundStmtNode(stmts)

    # StmtList -> Statement StmtListTail
    def parse_StmtList(self):
        self.log_call("StmtList")
        stmts = []
        stmt = self.parse_Statement()
        if stmt:
            stmts.append(stmt)
        stmts.extend(self.parse_StmtListTail())
        return stmts

    # StmtListTail -> ; Statement StmtListTail | epsilon
    def parse_StmtListTail(self):
        self.log_call("StmtListTail")
        stmts = []
        if self.current_token.type == ";":
            self.match(";")
            stmt = self.parse_Statement()
            if stmt:
                stmts.append(stmt)
            stmts.extend(self.parse_StmtListTail())
        return stmts

    # Statement -> Assignment | IfStmt | WhileStmt | CompoundStmt | WriteStmt | epsilon
    def parse_Statement(self):
        self.log_call("Statement")
        t = self.current_token.type
        if t == "IDENTIFIER":
            return self.parse_Assignment()
        elif t == "if":
            return self.parse_IfStmt()
        elif t == "while":
            return self.parse_WhileStmt()
        elif t == "begin":
            return self.parse_CompoundStmt()
        elif t in ["write", "writeln"]:
            return self.parse_WriteStmt()
        else:
            # Epsilon (empty statement)
            return None

    # Assignment -> IDENTIFIER ASSIGN_OP Expression
    def parse_Assignment(self):
        self.log_call("Assignment")
        var_name = self.current_token.value
        line = self.current_token.line
        col = self.current_token.column
        self.match("IDENTIFIER")
        
        # Semantic check: check if variable is declared
        sym_entry = self.symbol_table.lookup(var_name)
        if not sym_entry:
            self.errors.report_semantic_error(
                f"Undeclared variable '{var_name}'",
                line, col
            )
            
        self.match("ASSIGN_OP")
        expr = self.parse_Expression()
        
        # Simple Type Compatibility Check
        if sym_entry and expr:
            expr_type = self._get_expr_type(expr)
            if expr_type and sym_entry.type != expr_type:
                # real can take integer, but integer can't take real/char
                if not (sym_entry.type == "real" and expr_type == "integer"):
                    self.errors.report_semantic_error(
                        f"Type mismatch: Cannot assign '{expr_type}' to variable '{var_name}' of type '{sym_entry.type}'",
                        line, col
                    )
                    
        return AssignmentNode(var_name, expr)

    # IfStmt -> if Condition then Statement ElsePart
    def parse_IfStmt(self):
        self.log_call("IfStmt")
        self.match("if")
        cond = self.parse_Condition()
        self.match("then")
        then_branch = self.parse_Statement()
        else_branch = self.parse_ElsePart()
        return IfStmtNode(cond, then_branch, else_branch)

    # ElsePart -> else Statement | epsilon
    def parse_ElsePart(self):
        self.log_call("ElsePart")
        if self.current_token.type == "else":
            self.match("else")
            return self.parse_Statement()
        return None

    # WhileStmt -> while Condition do Statement
    def parse_WhileStmt(self):
        self.log_call("WhileStmt")
        self.match("while")
        cond = self.parse_Condition()
        self.match("do")
        body = self.parse_Statement()
        return WhileStmtNode(cond, body)

    # WriteStmt -> write ( Expression ) | writeln ( Expression )
    def parse_WriteStmt(self):
        self.log_call("WriteStmt")
        is_writeln = (self.current_token.type == "writeln")
        self.match(self.current_token.type)
        self.match("(")
        expr = self.parse_Expression()
        self.match(")")
        return WriteStmtNode(expr, is_writeln)

    # Condition -> Expression RelOp Expression
    def parse_Condition(self):
        self.log_call("Condition")
        left = self.parse_Expression()
        op = self.parse_RelOp()
        right = self.parse_Expression()
        return BinaryOpNode(left, op, right)

    # RelOp -> = | <> | < | > | <= | >=
    def parse_RelOp(self):
        self.log_call("RelOp")
        t = self.current_token.type
        if t in ["=", "<>", "<", ">", "<=", ">="]:
            return self.match(t)
        else:
            self.errors.report_syntactic_error(
                f"Expected relational operator, found '{self.current_token.value}'",
                self.current_token.line,
                self.current_token.column
            )
            return "="

    # Expression -> Term ExprTail
    def parse_Expression(self):
        self.log_call("Expression")
        node = self.parse_Term()
        return self.parse_ExprTail(node)

    # ExprTail -> AddOp Term ExprTail | epsilon
    def parse_ExprTail(self, left_node):
        self.log_call("ExprTail")
        if self.current_token.type in ["+", "-"]:
            op = self.match(self.current_token.type)
            right = self.parse_Term()
            combined_node = BinaryOpNode(left_node, op, right)
            return self.parse_ExprTail(combined_node)
        return left_node

    # Term -> Factor TermTail
    def parse_Term(self):
        self.log_call("Term")
        node = self.parse_Factor()
        return self.parse_TermTail(node)

    # TermTail -> MulOp Factor TermTail | epsilon
    def parse_TermTail(self, left_node):
        self.log_call("TermTail")
        if self.current_token.type in ["*", "/"]:
            op = self.match(self.current_token.type)
            right = self.parse_Factor()
            combined_node = BinaryOpNode(left_node, op, right)
            return self.parse_TermTail(combined_node)
        return left_node

    # Factor -> IDENTIFIER | INT_CONST | REAL_CONST | CHAR_CONST | ( Expression )
    def parse_Factor(self):
        self.log_call("Factor")
        t = self.current_token.type
        if t == "IDENTIFIER":
            var_name = self.current_token.value
            line = self.current_token.line
            col = self.current_token.column
            self.match("IDENTIFIER")
            # Semantic check: declared?
            sym_entry = self.symbol_table.lookup(var_name)
            if not sym_entry:
                self.errors.report_semantic_error(
                    f"Undeclared variable '{var_name}'",
                    line, col
                )
            return IdentifierNode(var_name)
        elif t == "INT_CONST":
            val = self.match("INT_CONST")
            return ConstantNode(val, "integer")
        elif t == "REAL_CONST":
            val = self.match("REAL_CONST")
            return ConstantNode(val, "real")
        elif t == "CHAR_CONST":
            val = self.match("CHAR_CONST")
            return ConstantNode(val, "char")
        elif t == "(":
            self.match("(")
            expr = self.parse_Expression()
            self.match(")")
            return expr
        else:
            self.errors.report_syntactic_error(
                f"Expected factor (identifier, constant, or parenthesized expression), found '{self.current_token.value}'",
                self.current_token.line,
                self.current_token.column
            )
            # Skip token to prevent infinite loop
            self._next_token()
            return ConstantNode("0", "integer")

    def _get_expr_type(self, node):
        if not node:
            return None
        if isinstance(node, ConstantNode):
            return node.type_str
        elif isinstance(node, IdentifierNode):
            sym = self.symbol_table.lookup(node.name)
            return sym.type if sym else None
        elif isinstance(node, BinaryOpNode):
            # Evaluate type recursively
            t_left = self._get_expr_type(node.left)
            t_right = self._get_expr_type(node.right)
            if t_left == "real" or t_right == "real":
                return "real"
            if t_left == "integer" and t_right == "integer":
                return "integer"
            return t_left
        return None
