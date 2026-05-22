# backend/compiler/parser_lr.py

from .lexer import Token
from .error_handler import ErrorHandler
from .grammar import LR_ACTION, LR_GOTO, GRAMMAR_RULES, FOLLOW_SETS

class LRParser:
    def __init__(self, tokens: list, error_handler: ErrorHandler):
        self.tokens = tokens
        self.errors = error_handler
        self.state_stack = [0]
        self.symbol_stack = ["$"]
        self.ptr = 0
        self.current_token = tokens[0] if tokens else Token("$", "$", 1, 1)
        self.trace = [] # list of dicts: {"states": str, "symbols": str, "input": str, "action": str}

    def _next_token(self):
        if self.ptr < len(self.tokens) - 1:
            self.ptr += 1
            self.current_token = self.tokens[self.ptr]
        else:
            self.current_token = Token("$", "$", self.current_token.line, self.current_token.column)

    def get_remaining_input(self):
        return " ".join([t.value for t in self.tokens[self.ptr:]])

    def parse(self) -> bool:
        while True:
            s = self.state_stack[-1]
            a = self.current_token.type
            
            # Format stacks for tracing
            states_str = " ".join(map(str, self.state_stack))
            symbols_str = " ".join(self.symbol_stack)
            input_str = self.get_remaining_input()
            
            # Check action table
            action_entry = LR_ACTION.get(s, {}).get(a)
            
            if action_entry is not None:
                act_type, val = action_entry
                
                if act_type == "shift":
                    self.trace.append({
                        "states": states_str,
                        "symbols": symbols_str,
                        "input": input_str,
                        "action": f"Shift to state {val}"
                    })
                    self.state_stack.append(val)
                    self.symbol_stack.append(self.current_token.value)
                    self._next_token()
                    
                elif act_type == "reduce":
                    rule_idx = val
                    lhs, rhs = GRAMMAR_RULES[rule_idx]
                    rhs_len = len(rhs)
                    rhs_str = " ".join(rhs) if rhs else "epsilon"
                    
                    self.trace.append({
                        "states": states_str,
                        "symbols": symbols_str,
                        "input": input_str,
                        "action": f"Reduce by rule {rule_idx} ({lhs} -> {rhs_str})"
                    })
                    
                    # Pop RHS symbols and states
                    if rhs_len > 0:
                        self.state_stack = self.state_stack[:-rhs_len]
                        self.symbol_stack = self.symbol_stack[:-rhs_len]
                        
                    s_top = self.state_stack[-1]
                    
                    # Look up Goto
                    goto_state = LR_GOTO.get(s_top, {}).get(lhs)
                    if goto_state is not None:
                        self.state_stack.append(goto_state)
                        self.symbol_stack.append(lhs)
                    else:
                        # Major parsing error: GOTO entry missing during reduction
                        self.errors.report_syntactic_error(
                            f"Missing GOTO transition for non-terminal '{lhs}' from state {s_top}",
                            self.current_token.line,
                            self.current_token.column
                        )
                        return False
                        
                elif act_type == "accept":
                    self.trace.append({
                        "states": states_str,
                        "symbols": symbols_str,
                        "input": input_str,
                        "action": "Accept"
                    })
                    return True
            else:
                # Syntax Error! Action is empty.
                self.errors.report_syntactic_error(
                    f"Unexpected token '{self.current_token.value}' in state {s}",
                    self.current_token.line,
                    self.current_token.column
                )
                
                self.trace.append({
                    "states": states_str,
                    "symbols": symbols_str,
                    "input": input_str,
                    "action": f"Error: Recovering from state {s}"
                })
                
                # Recover: Pop states until we find a state that has a GOTO transition on Statement or Declarations
                recovered = False
                recovery_nt = "Statement" if "begin" in symbols_str else "Declarations"
                
                while len(self.state_stack) > 1:
                    s_check = self.state_stack[-1]
                    goto_state = LR_GOTO.get(s_check, {}).get(recovery_nt)
                    if goto_state is not None:
                        # Found a state where we can transition on the recovery non-terminal
                        self.state_stack.append(goto_state)
                        self.symbol_stack.append(recovery_nt)
                        
                        # Skip tokens until we find one in the FOLLOW set of recovery_nt
                        follow_nt = FOLLOW_SETS.get(recovery_nt, set())
                        follow_nt = follow_nt.union({";", "end", "$"})
                        
                        # Ensure we consume at least one token (either the error token itself or skip until synchronization)
                        # to guarantee forward progress and prevent infinite parsing loops.
                        if a in follow_nt and a != "$":
                            self._next_token()
                            a = self.current_token.type
                        else:
                            while a not in follow_nt and a != "$":
                                self._next_token()
                                a = self.current_token.type
                        
                        recovered = True
                        break
                    else:
                        # Pop the state
                        self.state_stack.pop()
                        self.symbol_stack.pop()
                        
                if not recovered:
                    # If we couldn't recover, terminate
                    self.trace.append({
                        "states": states_str,
                        "symbols": symbols_str,
                        "input": input_str,
                        "action": "Fatal: Unrecoverable LR syntax error"
                    })
                    return False
