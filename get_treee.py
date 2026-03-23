import os

def print_tree(dir_path, prefix=""):
    files = [f for f in os.listdir(dir_path) if f not in ['.git', 'node_modules', '__pycache__', 'venv', '.env']]
    for i, file in enumerate(files):
        path = os.path.join(dir_path, file)
        is_last = (i == len(files) - 1)
        print(f"{prefix}{'└── ' if is_last else '├── '}{file}")
        if os.path.isdir(path):
            print_tree(path, prefix + ("    " if is_last else "│   "))

print_tree(".")