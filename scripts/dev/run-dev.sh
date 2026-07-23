#!/bin/zsh

SESSION="apsara-backend"
PROJECT_DIR="/Users/bondeth/Projects/Apsara Talent/apsaratalent-api"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$PROJECT_DIR" || {
  echo "Error: cannot cd to $PROJECT_DIR"
  exit 1
}

tmux has-session -t "$SESSION" 2>/dev/null && tmux kill-session -t "$SESSION"

tmux new-session -d -s "$SESSION" -n api "cd \"$PROJECT_DIR\" && npm run start:dev:api"
tmux new-window -t "$SESSION" -n auth "cd \"$PROJECT_DIR\" && npm run start:dev:auth"
tmux new-window -t "$SESSION" -n users "cd \"$PROJECT_DIR\" && npm run start:dev:users"
tmux new-window -t "$SESSION" -n job "cd \"$PROJECT_DIR\" && npm run start:dev:job"
tmux new-window -t "$SESSION" -n resume "cd \"$PROJECT_DIR\" && npm run start:dev:resume"
tmux new-window -t "$SESSION" -n chat "cd \"$PROJECT_DIR\" && npm run start:dev:chat"
tmux new-window -t "$SESSION" -n notification "cd \"$PROJECT_DIR\" && npm run start:dev:notification"

tmux select-window -t "$SESSION:api"
exec tmux attach -t "$SESSION"