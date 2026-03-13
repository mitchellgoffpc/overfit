#!/usr/bin/env bash
set -euo pipefail

repo_path="${1:-$(pwd)}"

if [ ! -d "$repo_path" ]; then
  echo "Path not found: $repo_path" >&2
  exit 1
fi

repo_path="$(cd "$repo_path" && pwd -P)"

if [ ! -f "$repo_path/package.json" ]; then
  echo "No package.json found in: $repo_path" >&2
  exit 1
fi

cd "$repo_path"

npm install

session_base="underfit-dev-$(basename "$repo_path")"
session="$(echo "$session_base" | tr -c 'A-Za-z0-9_.-' '_')"

if tmux has-session -t "$session" 2>/dev/null; then
  echo "tmux session already exists: $session" >&2
  echo "Attach with: tmux attach -t $session" >&2
  exit 1
fi

data_path="$repo_path/.underfit"
mkdir -p "$data_path"
config_path="$data_path/dev.toml"

cat > "$config_path" <<EOF
[db]
type = "sqlite"
path = "$data_path/dev.db"

[storage]
type = "file"
baseDir = "$data_path/storage"
EOF

tmux new-session -d -s "$session" -c "$repo_path" "npm run dev:backend -- \"$config_path\""
tmux split-window -h -t "$session" -c "$repo_path" "npm run dev:frontend"
tmux select-layout -t "$session" even-horizontal
bash "$repo_path/scripts/seed.sh"
tmux attach -t "$session"
