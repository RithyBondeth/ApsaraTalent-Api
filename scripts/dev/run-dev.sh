#!/bin/zsh
#
# Start every backend service in its own tmux window.
#
#   ./scripts/dev/run-dev.sh                 # all services
#   ./scripts/dev/run-dev.sh api auth        # only these two
#   ./scripts/dev/run-dev.sh --kill          # stop everything
#   ./scripts/dev/run-dev.sh --list          # show the service registry
#
# Re-running restarts the whole session. Ctrl-b w lists windows, Ctrl-b d
# detaches (services keep running), Ctrl-b z zooms the focused pane.

set -u

SESSION="apsara-backend"

# Resolve the repo root from this script's own location (scripts/dev/../..)
# instead of a hardcoded personal path, so it works from any clone/machine.
PROJECT_DIR="$(cd "$(dirname "${0:A}")/../.." && pwd)"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# label | npm script | port it listens on (for the preflight conflict check)
SERVICES=(
  "api|start:dev:api|3000"
  "auth|start:dev:auth|3001"
  "users|start:dev:users|3002"
  "job|start:dev:job|3005"
  "resume|start:dev:resume|3003"
  "chat|start:dev:chat|3004"
  "notification|start:dev:notification|3007"
)

C_DIM=$'\033[2m'; C_RED=$'\033[31m'; C_GREEN=$'\033[32m'
C_YELLOW=$'\033[33m'; C_CYAN=$'\033[36m'; C_BOLD=$'\033[1m'; C_OFF=$'\033[0m'

info()  { print -r -- "${C_CYAN}▸${C_OFF} $*"; }
ok()    { print -r -- "${C_GREEN}✓${C_OFF} $*"; }
warn()  { print -r -- "${C_YELLOW}!${C_OFF} $*"; }
fail()  { print -r -- "${C_RED}✗${C_OFF} $*" >&2; exit 1; }

case "${1:-}" in
  --kill|-k)
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      tmux kill-session -t "$SESSION"; ok "Stopped $SESSION."
    else
      info "Nothing running."
    fi
    # Killing the session does not always reap the node children it spawned;
    # a service still holding its port will break the next start.
    left=()
    for entry in "${SERVICES[@]}"; do
      port="${entry##*|}"
      lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && left+=("$port")
    done
    if [ ${#left[@]} -gt 0 ]; then
      warn "Still listening: ${left[*]}"
      warn "Free them with: ${C_BOLD}lsof -ti:${(j:,:)left} | xargs kill${C_OFF}"
    fi
    exit 0
    ;;
  --list|-l)
    print -r -- "${C_BOLD}Services${C_OFF}"
    for entry in "${SERVICES[@]}"; do
      print -r -- "  ${entry%%|*}  ${C_DIM}port ${entry##*|}${C_OFF}"
    done
    exit 0
    ;;
  --help|-h)
    sed -n '3,12p' "${0:A}" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
esac

# ---------------------------------------------------------------- preflight
command -v tmux >/dev/null || fail "tmux not found. brew install tmux"
[ -f "$PROJECT_DIR/package.json" ] ||
  fail "No package.json at $PROJECT_DIR — repo root resolved incorrectly."
[ -d "$PROJECT_DIR/node_modules" ] ||
  fail "node_modules missing. Run: npm install"
[ -f "$PROJECT_DIR/.env" ] ||
  warn ".env not found — services will fall back to defaults and may not boot."

# Select the requested subset, preserving registry order.
selected=()
if [ $# -gt 0 ]; then
  for want in "$@"; do
    match=""
    for entry in "${SERVICES[@]}"; do
      [[ "${entry%%|*}" == "$want" ]] && match="$entry" && break
    done
    [ -n "$match" ] || fail "Unknown service '$want'. Try --list."
    selected+=("$match")
  done
else
  selected=("${SERVICES[@]}")
fi

# Warn about ports already in use — the usual cause of a service dying on boot.
busy=()
for entry in "${selected[@]}"; do
  port="${entry##*|}"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && busy+=("${entry%%|*}:$port")
done
if [ ${#busy[@]} -gt 0 ]; then
  warn "Ports already in use: ${busy[*]}"
  warn "A previous run may still be alive. ${C_BOLD}$0 --kill${C_OFF} clears it."
fi

cd "$PROJECT_DIR" || fail "cannot cd to $PROJECT_DIR"

# ------------------------------------------------------------------ session
tmux has-session -t "$SESSION" 2>/dev/null && tmux kill-session -t "$SESSION"

first="${selected[1]}"
tmux new-session -d -s "$SESSION" -n "${first%%|*}" \
  "cd ${(q)PROJECT_DIR} && npm run ${${first#*|}%|*}"

for entry in "${selected[@]:1}"; do
  tmux new-window -t "$SESSION" -n "${entry%%|*}" \
    "cd ${(q)PROJECT_DIR} && npm run ${${entry#*|}%|*}"
done

# ------------------------------------------------------------------ styling
# Scoped to this session so none of it leaks into other tmux sessions.
tmux set-option -t "$SESSION" mouse on            # click a name to switch, scroll panes
tmux set-option -t "$SESSION" base-index 0

# remain-on-exit / allow-rename / automatic-rename are WINDOW options: setting
# them with `-t $SESSION` only hits the session's currently active window, so
# they must be applied to each window explicitly.
for entry in "${selected[@]}"; do
  w="${SESSION}:${entry%%|*}"
  tmux set-option -w -t "$w" remain-on-exit on    # a crash leaves its error on screen
  tmux set-option -w -t "$w" allow-rename off     # keep our names, not the process name
  tmux set-option -w -t "$w" automatic-rename off
done
tmux set-option -t "$SESSION" status-interval 5
tmux set-option -t "$SESSION" status-justify left

tmux set-option -t "$SESSION" status-style "bg=colour235,fg=colour250"
tmux set-option -t "$SESSION" status-left \
  "#[bg=colour38,fg=colour235,bold] APSARA #[bg=colour235,fg=colour38] "
tmux set-option -t "$SESSION" status-left-length 20
tmux set-option -t "$SESSION" status-right \
  "#[fg=colour244]Ctrl-b w#[fg=colour238] · #[fg=colour244]Ctrl-b d detach #[bg=colour238,fg=colour250] %H:%M "
tmux set-option -t "$SESSION" status-right-length 60

tmux set-option -t "$SESSION" window-status-format \
  "#[fg=colour244] #I#[fg=colour250] #W "
tmux set-option -t "$SESSION" window-status-current-format \
  "#[bg=colour38,fg=colour235,bold] #I #W "
tmux set-option -t "$SESSION" window-status-separator ""

# Braces are required: in zsh "$SESSION:api" applies the `:a` history modifier
# (absolutize), producing "<cwd>/apsara-backendpi" and a "can't find window".
tmux select-window -t "${SESSION}:${first%%|*}"

# ------------------------------------------------------------------ summary
print
print -r -- "${C_BOLD}Apsara backend${C_OFF} ${C_DIM}— ${#selected[@]} services${C_OFF}"
i=0
for entry in "${selected[@]}"; do
  label="${entry%%|*}"; port="${entry##*|}"
  printf "  ${C_DIM}%d${C_OFF}  %-13s ${C_DIM}localhost:%s${C_OFF}\n" "$i" "$label" "$port"
  i=$((i + 1))
done
print
ok "Session ${C_BOLD}$SESSION${C_OFF} ready. Click a name in the status bar to switch."
print

if [ -n "${TMUX:-}" ]; then
  # Already inside tmux — attaching would nest, so switch instead.
  tmux switch-client -t "$SESSION"
else
  exec tmux attach -t "$SESSION"
fi
