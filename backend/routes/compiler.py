# backend/routes/compiler.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any

from compiler.grammar import (
    GRAMMAR_RULES, FIRST_SETS, FOLLOW_SETS, LL1_TABLE,
    LR_ACTION, LR_GOTO, NON_TERMINALS, TERMINALS
)
from compiler.lexer import Lexer
from compiler.error_handler import ErrorHandler
from compiler.parser_rd import RecursiveDescentParser
from compiler.parser_ll1 import LL1Parser
from compiler.parser_lr import LRParser

router = APIRouter(prefix="/compiler", tags=["compiler"])

class CompileRequest(BaseModel):
    code: str

# Helper to format rules
def get_formatted_rules() -> List[str]:
    formatted = []
    for idx, (nt, rhs) in enumerate(GRAMMAR_RULES):
        rhs_str = " ".join(rhs) if rhs else "epsilon"
        formatted.append(f"({idx}) {nt} -> {rhs_str}")
    return formatted

# Format LL(1) Table for Frontend
def get_formatted_ll1():
    formatted = {}
    for nt in LL1_TABLE:
        formatted[nt] = {}
        for term, (rule_idx, rhs) in LL1_TABLE[nt].items():
            rhs_str = " ".join(rhs) if rhs else "epsilon"
            formatted[nt][term] = f"({rule_idx}) {rhs_str}"
    return formatted

# Format LR tables for Frontend
def get_formatted_lr():
    action_fmt = {}
    for state_idx in LR_ACTION:
        action_fmt[state_idx] = {}
        for term, (act, val) in LR_ACTION[state_idx].items():
            if act == "shift":
                action_fmt[state_idx][term] = f"s{val}"
            elif act == "reduce":
                action_fmt[state_idx][term] = f"r{val}"
            elif act == "accept":
                action_fmt[state_idx][term] = "acc"
                
    goto_fmt = {}
    for state_idx in LR_GOTO:
        goto_fmt[state_idx] = {}
        for nt, target in LR_GOTO[state_idx].items():
            goto_fmt[state_idx][nt] = str(target)
            
    return {"action": action_fmt, "goto": goto_fmt}

@router.get("/grammar")
def get_grammar_info():
    return {
        "rules": get_formatted_rules(),
        "non_terminals": list(NON_TERMINALS),
        "terminals": list(TERMINALS),
        "first": {nt: list(first_set) for nt, first_set in FIRST_SETS.items() if nt in NON_TERMINALS},
        "follow": {nt: list(follow_set) for nt, follow_set in FOLLOW_SETS.items() if nt in NON_TERMINALS},
        "ll1_table": get_formatted_ll1(),
        "lr_table": get_formatted_lr()
    }

@router.post("/compile")
def compile_code(payload: CompileRequest):
    code = payload.code
    
    # 1. Lexical Analysis
    lexer = Lexer(code)
    tokens, lex_errors = lexer.tokenize_all()
    
    if lex_errors:
        return {
            "success": False,
            "errors": [{"type": "Lexical", "message": err, "line": 1, "column": 1} for err in lex_errors],
            "tokens": [t.to_dict() for t in tokens]
        }
        
    # Remove EOF token from standard tokens list for displaying, but keep it in token stream for parsers
    display_tokens = [t.to_dict() for t in tokens if t.type != "$"]
    
    # 2. Recursive Descent Parser (AST + Semantics)
    rd_errors = ErrorHandler()
    rd_parser = RecursiveDescentParser(tokens, rd_errors)
    ast = rd_parser.parse()
    symbol_table_data = rd_parser.symbol_table.get_all_scopes_data()
    rd_trace = rd_parser.trace
    
    # 3. LL(1) Parser (Trace + Recovery)
    ll1_errors = ErrorHandler()
    ll1_parser = LL1Parser(tokens, ll1_errors)
    ll1_success = ll1_parser.parse()
    ll1_trace = ll1_parser.trace
    
    # 4. LR Parser (Trace + Recovery)
    lr_errors = ErrorHandler()
    lr_parser = LRParser(tokens, lr_errors)
    lr_success = lr_parser.parse()
    lr_trace = lr_parser.trace
    
    # Collate all errors
    all_errors = []
    all_errors.extend(rd_errors.get_errors())
    
    # If RD succeeded, check LL1 and LR errors to present any syntax recovery errors
    # Deduplicate matching errors
    seen_errors = set()
    unique_errors = []
    for err in all_errors:
        err_key = (err["type"], err["line"], err["column"], err["message"])
        if err_key not in seen_errors:
            seen_errors.add(err_key)
            unique_errors.append(err)
            
    # Include LL1 and LR syntax errors for demonstration of separate recovery
    ll1_errs = ll1_errors.get_errors()
    lr_errs = lr_errors.get_errors()
    
    success = not rd_errors.has_errors() and not ll1_errors.has_errors() and not lr_errors.has_errors()
    
    return {
        "success": success,
        "tokens": display_tokens,
        "ast": ast.to_dict() if ast else None,
        "symbol_table": symbol_table_data,
        "rd_trace": rd_trace,
        "ll1_trace": ll1_trace,
        "ll1_success": ll1_success,
        "ll1_errors": ll1_errs,
        "lr_trace": lr_trace,
        "lr_success": lr_success,
        "lr_errors": lr_errs,
        "errors": unique_errors,
    }
