# backend/compiler/parser_ll1.py

from .lexer import Token
from .error_handler import ErrorHandler
from .grammar import LL1_TABLE, FIRST_SETS, FOLLOW_SETS, NON_TERMINALS, TERMINALS

class LL1Parser:
    def __init__(self, tokens: list, error_handler: ErrorHandler):
        self.tokens = tokens
        self.errors = error_handler
        self.stack = ["$", "Program"]
        self.ptr = 0
        self.current_token = tokens[0] if tokens else Token("$", "$", 1, 1)
        self.trace = [] # Steps: list of dicts: {"stack": str, "input": str, "action": str}

    def _next_token(self):
        if self.ptr < len(self.tokens) - 1:
            self.ptr += 1
            self.current_token = self.tokens[self.ptr]
        else:
            self.current_token = Token("$", "$", self.current_token.line, self.current_token.column)

    def get_remaining_input(self):
        return " ".join([t.value for t in self.tokens[self.ptr:]])

    def parse(self) -> bool:
        while len(self.stack) > 0:
            top = self.stack[-1]
            a = self.current_token.type
            
            # Format stack and input for logging
            stack_str = " ".join(self.stack)
            input_str = self.get_remaining_input()
            
            # If top is EOF and input is EOF -> Accept
            if top == "$" and a == "$":
                self.trace.append({
                    "stack": stack_str,
                    "input": input_str,
                    "action": "Accept"
                })
                self.stack.pop()
                return True
                
            # If top is a terminal
            elif top in TERMINALS or top == "$":
                if top == a:
                    self.trace.append({
                        "stack": stack_str,
                        "input": input_str,
                        "action": f"Match '{self.current_token.value}'"
                    })
                    self.stack.pop()
                    self._next_token()
                else:
                    # Syntax Error: Stack terminal doesn't match input
                    self.errors.report_syntactic_error(
                        f"Expected terminal '{top}', found '{self.current_token.value}'",
                        self.current_token.line,
                        self.current_token.column
                    )
                    # Recovery: Pop the unmatched terminal from stack and continue
                    self.trace.append({
                        "stack": stack_str,
                        "input": input_str,
                        "action": f"Error: Pop mismatched terminal '{top}'"
                    })
                    self.stack.pop()
                    
            # If top is a non-terminal
            elif top in NON_TERMINALS:
                # Look up table
                entry = LL1_TABLE.get(top, {}).get(a)
                
                if entry is not None:
                    rule_idx, rhs = entry
                    rhs_str = " ".join(rhs) if rhs else "epsilon"
                    self.trace.append({
                        "stack": stack_str,
                        "input": input_str,
                        "action": f"Apply rule {top} -> {rhs_str}"
                    })
                    self.stack.pop()
                    # Push RHS in reverse order
                    for symbol in reversed(rhs):
                        self.stack.append(symbol)
                else:
                    # Syntax Error: Table cell is empty -> Trigger PANIC-MODE recovery
                    self.errors.report_syntactic_error(
                        f"Unexpected token '{self.current_token.value}' for grammar rule '{top}'",
                        self.current_token.line,
                        self.current_token.column
                    )
                    
                    # Compute synchronization sets based on FOLLOW set of top
                    sync_set = FOLLOW_SETS.get(top, set())
                    # Ensure semicolons and END are in sync_set for better recovery in block structures
                    sync_set = sync_set.union({";", "end", "$"})
                    
                    self.trace.append({
                        "stack": stack_str,
                        "input": input_str,
                        "action": f"Error: Panic-mode recovery for NT '{top}'"
                    })
                    
                    # If current input token is in FOLLOW set, pop top and continue
                    if a in sync_set:
                        self.stack.pop()
                    else:
                        # Otherwise skip input tokens until one is in FIRST or FOLLOW
                        first_top = FIRST_SETS.get(top, set())
                        while a not in first_top and a not in sync_set and a != "$":
                            self._next_token()
                            a = self.current_token.type
                        # If we found a token in FIRST, we keep the non-terminal on the stack to try again
                        # If we found a token in FOLLOW, we pop the non-terminal
                        if a in sync_set and a != "$":
                            self.stack.pop()
            else:
                # Catch-all
                self.errors.report_syntactic_error(
                    f"Invalid grammar symbol '{top}' on stack",
                    self.current_token.line,
                    self.current_token.column
                )
                self.stack.pop()
                
        return not self.errors.has_errors()
