# backend/compiler/grammar.py

# Grammar rule format: (NonTerminal, [Symbols...])
# Use empty list [] to represent epsilon (empty production)
GRAMMAR_RULES = [
    # 0. Augmented rule (used for LR parsing)
    ("Program'", ["Program"]),
    
    # 1. Program
    ("Program", ["program", "IDENTIFIER", ";", "Declarations", "CompoundStmt", "."]),
    
    # 2-3. Declarations
    ("Declarations", ["VarDecl"]),
    ("Declarations", []),
    
    # 4. VarDecl
    ("VarDecl", ["var", "IdList", ":", "Type", ";", "Declarations"]),
    
    # 5. IdList
    ("IdList", ["IDENTIFIER", "IdListTail"]),
    
    # 6-7. IdListTail
    ("IdListTail", [",", "IDENTIFIER", "IdListTail"]),
    ("IdListTail", []),
    
    # 8-10. Type
    ("Type", ["integer"]),
    ("Type", ["real"]),
    ("Type", ["char"]),
    
    # 11. CompoundStmt
    ("CompoundStmt", ["begin", "StmtList", "end"]),
    
    # 12. StmtList
    ("StmtList", ["Statement", "StmtListTail"]),
    
    # 13-14. StmtListTail
    ("StmtListTail", [";", "Statement", "StmtListTail"]),
    ("StmtListTail", []),
    
    # 15-20. Statement
    ("Statement", ["Assignment"]),
    ("Statement", ["IfStmt"]),
    ("Statement", ["WhileStmt"]),
    ("Statement", ["CompoundStmt"]),
    ("Statement", ["WriteStmt"]),
    ("Statement", []),
    
    # 21. Assignment
    ("Assignment", ["IDENTIFIER", ":=", "Expression"]),
    
    # 22. IfStmt (Dangling else resolved by parser state preferences)
    ("IfStmt", ["if", "Condition", "then", "Statement", "ElsePart"]),
    
    # 23-24. ElsePart
    ("ElsePart", ["else", "Statement"]),
    ("ElsePart", []),
    
    # 25. WhileStmt
    ("WhileStmt", ["while", "Condition", "do", "Statement"]),
    
    # 26-27. WriteStmt
    ("WriteStmt", ["write", "(", "Expression", ")"]),
    ("WriteStmt", ["writeln", "(", "Expression", ")"]),
    
    # 28. Condition
    ("Condition", ["Expression", "RelOp", "Expression"]),
    
    # 29-34. RelOp
    ("RelOp", ["="]),
    ("RelOp", ["<>"]),
    ("RelOp", ["<"]),
    ("RelOp", [">"]),
    ("RelOp", ["<="]),
    ("RelOp", [">="]),
    
    # 35. Expression
    ("Expression", ["Term", "ExprTail"]),
    
    # 36-37. ExprTail
    ("ExprTail", ["AddOp", "Term", "ExprTail"]),
    ("ExprTail", []),
    
    # 38-39. AddOp
    ("AddOp", ["+"]),
    ("AddOp", ["-"]),
    
    # 40. Term
    ("Term", ["Factor", "TermTail"]),
    
    # 41-42. TermTail
    ("TermTail", ["MulOp", "Factor", "TermTail"]),
    ("TermTail", []),
    
    # 43-44. MulOp
    ("MulOp", ["*"]),
    ("MulOp", ["/"]),
    
    # 45-49. Factor
    ("Factor", ["IDENTIFIER"]),
    ("Factor", ["INT_CONST"]),
    ("Factor", ["REAL_CONST"]),
    ("Factor", ["CHAR_CONST"]),
    ("Factor", ["(", "Expression", ")"])
]

NON_TERMINALS = {rule[0] for rule in GRAMMAR_RULES}
TERMINALS = set()
for _, rhs in GRAMMAR_RULES:
    for symbol in rhs:
        if symbol not in NON_TERMINALS:
            TERMINALS.add(symbol)
# Add end marker
TERMINALS.add("$")

START_SYMBOL = "Program"

# Calculate FIRST sets
def compute_first():
    first = {nt: set() for nt in NON_TERMINALS}
    # For terminals, FIRST(t) = {t}
    for t in TERMINALS:
        first[t] = {t}
    first[""] = {""} # for epsilon
    
    changed = True
    while changed:
        changed = False
        for nt, rhs in GRAMMAR_RULES:
            if nt == "Program'":
                continue
            
            # Epsilon rule
            if len(rhs) == 0:
                if "" not in first[nt]:
                    first[nt].add("")
                    changed = True
                continue
            
            # Non-epsilon rule X -> Y1 Y2 ... Yk
            before_len = len(first[nt])
            all_have_epsilon = True
            for symbol in rhs:
                first_sym = first[symbol]
                first[nt].update(first_sym - {""})
                if "" not in first_sym:
                    all_have_epsilon = False
                    break
            
            if all_have_epsilon:
                first[nt].add("")
            
            if len(first[nt]) > before_len:
                changed = True
    return first

# Compute FOLLOW sets
def compute_follow(first):
    follow = {nt: set() for nt in NON_TERMINALS}
    follow[START_SYMBOL].add("$")
    
    changed = True
    while changed:
        changed = False
        for nt, rhs in GRAMMAR_RULES:
            if nt == "Program'":
                continue
            
            for i, symbol in enumerate(rhs):
                if symbol in NON_TERMINALS:
                    before_len = len(follow[symbol])
                    
                    # Look at what follows X: A -> alpha X beta
                    # Add FIRST(beta) except epsilon to FOLLOW(X)
                    beta = rhs[i+1:]
                    
                    # Compute FIRST(beta)
                    first_beta = set()
                    beta_all_epsilon = True
                    for b_sym in beta:
                        first_beta.update(first[b_sym] - {""})
                        if "" not in first[b_sym]:
                            beta_all_epsilon = False
                            break
                    if len(beta) == 0 or beta_all_epsilon:
                        first_beta.add("")
                    
                    follow[symbol].update(first_beta - {""})
                    
                    # If beta can be epsilon, add FOLLOW(A) to FOLLOW(X)
                    if "" in first_beta:
                        follow[symbol].update(follow[nt])
                        
                    if len(follow[symbol]) > before_len:
                        changed = True
    return follow

# Compute LL(1) parsing table
def compute_ll1_table(first, follow):
    table = {nt: {} for nt in NON_TERMINALS if nt != "Program'"}
    for idx, (nt, rhs) in enumerate(GRAMMAR_RULES):
        if nt == "Program'":
            continue
        
        # Find FIRST(rhs)
        first_rhs = set()
        rhs_all_epsilon = True
        for symbol in rhs:
            first_rhs.update(first[symbol] - {""})
            if "" not in first[symbol]:
                rhs_all_epsilon = False
                break
        if len(rhs) == 0 or rhs_all_epsilon:
            first_rhs.add("")
            
        for term in first_rhs - {""}:
            # Resolve dangling else in LL(1) in favor of shifting 'else'
            # (which means choosing the production ElsePart -> else Statement over ElsePart -> epsilon)
            if term == "else" and nt == "ElsePart" and idx == 24: # rule ElsePart -> epsilon
                continue
            table[nt][term] = (idx, rhs)
            
        if "" in first_rhs:
            for term in follow[nt]:
                # Semicolon/END/ELSE synchronizing follow
                if term not in table[nt]:
                    table[nt][term] = (idx, rhs)
    return table

# LR(0) / SLR(1) parsing table helper functions
class LR0Item:
    def __init__(self, rule_idx, dot_pos):
        self.rule_idx = rule_idx
        self.dot_pos = dot_pos
        self.nt, self.rhs = GRAMMAR_RULES[rule_idx]

    def next_symbol(self):
        if self.dot_pos < len(self.rhs):
            return self.rhs[self.dot_pos]
        return None

    def advance(self):
        return LR0Item(self.rule_idx, self.dot_pos + 1)

    def __eq__(self, other):
        return self.rule_idx == other.rule_idx and self.dot_pos == other.dot_pos

    def __hash__(self):
        return hash((self.rule_idx, self.dot_pos))

    def __repr__(self):
        rhs_with_dot = list(self.rhs)
        rhs_with_dot.insert(self.dot_pos, ".")
        return f"{self.nt} -> {' '.join(rhs_with_dot) if rhs_with_dot else '.'}"

def get_lr0_closure(item_set):
    closure = set(item_set)
    changed = True
    while changed:
        changed = False
        new_items = set()
        for item in closure:
            next_sym = item.next_symbol()
            if next_sym and next_sym in NON_TERMINALS:
                for idx, (nt, rhs) in enumerate(GRAMMAR_RULES):
                    if nt == next_sym:
                        new_item = LR0Item(idx, 0)
                        if new_item not in closure:
                            new_items.add(new_item)
                            changed = True
        closure.update(new_items)
    return frozenset(closure)

def get_lr0_goto(item_set, symbol):
    moved = set()
    for item in item_set:
        if item.next_symbol() == symbol:
            moved.add(item.advance())
    return get_lr0_closure(moved)

def compute_lr_states():
    # Start state closure of Item(0, 0) (which is Program' -> . Program)
    start_state = get_lr0_closure({LR0Item(0, 0)})
    states = [start_state]
    transitions = {} # (state_idx, symbol) -> state_idx
    
    changed = True
    while changed:
        changed = False
        for i, state in enumerate(states):
            # All possible next symbols in state
            symbols = set()
            for item in state:
                sym = item.next_symbol()
                if sym:
                    symbols.add(sym)
                    
            for sym in symbols:
                target = get_lr0_goto(state, sym)
                if len(target) > 0:
                    if target not in states:
                        states.append(target)
                        changed = True
                    target_idx = states.index(target)
                    if (i, sym) not in transitions:
                        transitions[(i, sym)] = target_idx
                        changed = True
                        
    return states, transitions

def compute_slr_tables(states, transitions, follow):
    # Action: dict of dicts {state_idx: {terminal: ("shift"/"reduce"/"accept", val)}}
    # Goto: dict of dicts {state_idx: {non_terminal: state_idx}}
    action = {i: {} for i in range(len(states))}
    goto = {i: {} for i in range(len(states))}
    
    for i, state in enumerate(states):
        # Shifts and Gotos
        for sym in TERMINALS:
            if (i, sym) in transitions:
                action[i][sym] = ("shift", transitions[(i, sym)])
        for nt in NON_TERMINALS:
            if (i, nt) in transitions:
                goto[i][nt] = transitions[(i, nt)]
                
        # Reduces & Accepts
        for item in state:
            if item.next_symbol() is None:
                # Can reduce
                if item.rule_idx == 0: # Program' -> Program .
                    action[i]["$"] = ("accept", 0)
                else:
                    for term in follow[item.nt]:
                        # Handle shift-reduce conflicts in SLR(1)
                        # Standard conflict resolution: prefer Shift (dangling else resolved)
                        if term in action[i]:
                            # If it's a shift, keep shift, otherwise prioritize lower rule index
                            current_action = action[i][term]
                            if current_action[0] == "shift":
                                continue # keep shift
                            elif current_action[0] == "reduce":
                                # resolve conflict: keep the rule with lower index (or keep first)
                                if item.rule_idx < current_action[1]:
                                    action[i][term] = ("reduce", item.rule_idx)
                        else:
                            action[i][term] = ("reduce", item.rule_idx)
                            
    return action, goto

# Package up grammar metadata
FIRST_SETS = compute_first()
FOLLOW_SETS = compute_follow(FIRST_SETS)
LL1_TABLE = compute_ll1_table(FIRST_SETS, FOLLOW_SETS)
LR_STATES, LR_TRANSITIONS = compute_lr_states()
LR_ACTION, LR_GOTO = compute_slr_tables(LR_STATES, LR_TRANSITIONS, FOLLOW_SETS)
