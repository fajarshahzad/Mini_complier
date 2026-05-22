# backend/compiler/ast.py

class ASTNode:
    def to_dict(self) -> dict:
        raise NotImplementedError()

class ProgramNode(ASTNode):
    def __init__(self, name: str, declarations, compound_stmt):
        self.name = name
        self.declarations = declarations # list of VarDeclNode
        self.compound_stmt = compound_stmt # CompoundStmtNode

    def to_dict(self):
        return {
            "node_type": "Program",
            "name": self.name,
            "children": [
                {
                    "node_type": "Declarations",
                    "children": [d.to_dict() for d in self.declarations]
                },
                self.compound_stmt.to_dict()
            ]
        }

class VarDeclNode(ASTNode):
    def __init__(self, id_list: list, type_str: str):
        self.id_list = id_list
        self.type_str = type_str

    def to_dict(self):
        return {
            "node_type": "VarDecl",
            "type": self.type_str,
            "variables": self.id_list
        }

class CompoundStmtNode(ASTNode):
    def __init__(self, statements: list):
        self.statements = statements

    def to_dict(self):
        return {
            "node_type": "CompoundStatement",
            "children": [s.to_dict() for s in self.statements if s is not None]
        }

class AssignmentNode(ASTNode):
    def __init__(self, identifier: str, expression: ASTNode):
        self.identifier = identifier
        self.expression = expression

    def to_dict(self):
        return {
            "node_type": "Assignment",
            "variable": self.identifier,
            "expression": self.expression.to_dict()
        }

class IfStmtNode(ASTNode):
    def __init__(self, condition: ASTNode, then_branch: ASTNode, else_branch: ASTNode = None):
        self.condition = condition
        self.then_branch = then_branch
        self.else_branch = else_branch

    def to_dict(self):
        res = {
            "node_type": "IfStatement",
            "condition": self.condition.to_dict(),
            "then": self.then_branch.to_dict()
        }
        if self.else_branch:
            res["else"] = self.else_branch.to_dict()
        return res

class WhileStmtNode(ASTNode):
    def __init__(self, condition: ASTNode, body: ASTNode):
        self.condition = condition
        self.body = body

    def to_dict(self):
        return {
            "node_type": "WhileStatement",
            "condition": self.condition.to_dict(),
            "body": self.body.to_dict()
        }

class WriteStmtNode(ASTNode):
    def __init__(self, expression: ASTNode, is_writeln: bool = False):
        self.expression = expression
        self.is_writeln = is_writeln

    def to_dict(self):
        return {
            "node_type": "WriteStatement" if not self.is_writeln else "WritelnStatement",
            "expression": self.expression.to_dict()
        }

class BinaryOpNode(ASTNode):
    def __init__(self, left: ASTNode, op: str, right: ASTNode):
        self.left = left
        self.op = op
        self.right = right

    def to_dict(self):
        return {
            "node_type": "BinaryOp",
            "op": self.op,
            "left": self.left.to_dict(),
            "right": self.right.to_dict()
        }

class IdentifierNode(ASTNode):
    def __init__(self, name: str):
        self.name = name

    def to_dict(self):
        return {
            "node_type": "Identifier",
            "name": self.name
        }

class ConstantNode(ASTNode):
    def __init__(self, value: str, type_str: str):
        self.value = value
        self.type_str = type_str # 'integer', 'real', 'char'

    def to_dict(self):
        return {
            "node_type": "Constant",
            "value": self.value,
            "type": self.type_str
        }
