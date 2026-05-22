# backend/compiler/symbol_table.py

class SymbolEntry:
    def __init__(self, name: str, kind: str, type_: str, scope_level: int, line: int):
        self.name = name
        self.kind = kind # 'variable', 'constant', 'function', etc.
        self.type = type_ # 'integer', 'real', 'char', etc.
        self.scope_level = scope_level
        self.line = line

    def to_dict(self):
        return {
            "name": self.name,
            "kind": self.kind,
            "type": self.type,
            "scope_level": self.scope_level,
            "line": self.line
        }

    def __repr__(self):
        return f"SymbolEntry({self.name}, Kind:{self.kind}, Type:{self.type}, Scope:{self.scope_level}, Line:{self.line})"

class SymbolTable:
    def __init__(self, scope_id: int, scope_name: str, parent=None):
        self.scope_id = scope_id
        self.scope_name = scope_name
        self.parent = parent
        self.entries = {} # Hash map for fast lookup: name -> SymbolEntry

    def insert(self, name: str, entry: SymbolEntry) -> bool:
        if name in self.entries:
            return False # Already exists in this scope
        self.entries[name] = entry
        return True

    def lookup_local(self, name: str) -> SymbolEntry:
        return self.entries.get(name)

    def lookup(self, name: str) -> SymbolEntry:
        # Check current scope
        if name in self.entries:
            return self.entries[name]
        # Check parent scope
        if self.parent:
            return self.parent.lookup(name)
        return None

    def delete(self, name: str) -> bool:
        if name in self.entries:
            del self.entries[name]
            return True
        return False

    def to_dict(self):
        visible_entries = {}
        scope = self
        chain = []
        while scope:
            chain.append(scope)
            scope = scope.parent

        for visible_scope in reversed(chain):
            for name, entry in visible_scope.entries.items():
                entry_data = entry.to_dict()
                entry_data["origin_scope_id"] = visible_scope.scope_id
                entry_data["visibility"] = "local" if visible_scope is self else "inherited"
                visible_entries[name] = entry_data

        return {
            "scope_id": self.scope_id,
            "scope_name": self.scope_name,
            "parent_id": self.parent.scope_id if self.parent else None,
            "entries": {name: entry.to_dict() for name, entry in self.entries.items()},
            "visible_entries": visible_entries
        }

class SymbolTableManager:
    def __init__(self):
        self.scope_counter = 0
        # Root scope
        self.root_scope = SymbolTable(scope_id=0, scope_name="global", parent=None)
        self.current_scope = self.root_scope
        self.scope_stack = [self.root_scope]
        self.all_scopes = [self.root_scope]

    def enter_scope(self, scope_name: str = "") -> SymbolTable:
        self.scope_counter += 1
        name = scope_name or f"scope_{self.scope_counter}"
        new_scope = SymbolTable(
            scope_id=self.scope_counter,
            scope_name=name,
            parent=self.current_scope
        )
        self.current_scope = new_scope
        self.scope_stack.append(new_scope)
        self.all_scopes.append(new_scope)
        return new_scope

    def exit_scope(self):
        if len(self.scope_stack) > 1:
            self.scope_stack.pop()
            self.current_scope = self.scope_stack[-1]
        else:
            # Cannot exit global scope
            pass

    def insert(self, name: str, kind: str, type_: str, line: int) -> bool:
        scope_level = len(self.scope_stack) - 1
        entry = SymbolEntry(name, kind, type_, scope_level, line)
        return self.current_scope.insert(name, entry)

    def lookup(self, name: str) -> SymbolEntry:
        return self.current_scope.lookup(name)

    def lookup_local(self, name: str) -> SymbolEntry:
        return self.current_scope.lookup_local(name)

    def delete(self, name: str) -> bool:
        return self.current_scope.delete(name)

    def get_all_scopes_data(self):
        """Returns all recorded scopes for frontend rendering."""
        return [scope.to_dict() for scope in self.all_scopes]

    def dump(self) -> str:
        """Dumps current active scopes for debugging."""
        out = []
        for i, scope in enumerate(self.scope_stack):
            out.append(f"Scope Level {i} ({scope.scope_name}):")
            for name, entry in scope.entries.items():
                out.append(f"  {name} -> {entry}")
        return "\n".join(out)
