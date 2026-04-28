#!/usr/bin/env bash
#
# Basecamp MCP Server installer.
# Designed to run via:  curl -fsSL <raw-url>/install.sh | bash
# Also works after a manual clone:  ./install.sh

set -euo pipefail

REPO_URL="${BASECAMP_MCP_REPO_URL:-https://github.com/jhliberty/basecamp-mcp-server.git}"
REPO_DIR="${BASECAMP_MCP_DIR:-basecamp-mcp-server}"
REDIRECT_URI="http://lvh.me:8000/auth/callback"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BLUE=$'\033[0;34m'
BOLD=$'\033[1m'
NC=$'\033[0m'

info() { printf "%s==>%s %s\n" "$BLUE" "$NC" "$*"; }
ok()   { printf "%s✓%s %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%s⚠%s %s\n" "$YELLOW" "$NC" "$*"; }
fail() { printf "%s✗%s %s\n" "$RED" "$NC" "$*" >&2; exit 1; }

require_tty() {
  if [ ! -e /dev/tty ]; then
    fail "This installer needs an interactive terminal (no /dev/tty available)."
  fi
}

prompt() {
  # prompt VAR_NAME "Question text" [default]
  local __var=$1
  local __msg=$2
  local __default=${3:-}
  local __reply
  if [ -n "$__default" ]; then
    printf "%s [%s]: " "$__msg" "$__default" > /dev/tty
  else
    printf "%s: " "$__msg" > /dev/tty
  fi
  IFS= read -r __reply < /dev/tty
  if [ -z "$__reply" ] && [ -n "$__default" ]; then
    __reply=$__default
  fi
  eval "$__var=\$__reply"
}

_restore_tty() { ( stty echo < /dev/tty ) >/dev/null 2>&1 || true; }
trap _restore_tty EXIT INT TERM

prompt_secret() {
  # prompt_secret VAR_NAME "Question text" [allow_keep_existing_value]
  # If $3 is non-empty, an empty reply keeps that value (still hidden).
  local __var=$1
  local __msg=$2
  local __keep=${3:-}
  local __reply
  if [ -n "$__keep" ]; then
    printf "%s (press Enter to keep existing): " "$__msg" > /dev/tty
  else
    printf "%s: " "$__msg" > /dev/tty
  fi
  stty -echo < /dev/tty
  IFS= read -r __reply < /dev/tty
  stty echo < /dev/tty
  printf "\n" > /dev/tty
  if [ -z "$__reply" ] && [ -n "$__keep" ]; then
    __reply=$__keep
  fi
  eval "$__var=\$__reply"
}

read_env_value() {
  # read_env_value KEY [FILE] — extract VALUE from KEY=VALUE, stripping surrounding quotes.
  local key=$1
  local file=${2:-.env}
  [ -f "$file" ] || return 0
  awk -F= -v k="$key" '
    $1 == k {
      sub(/^[^=]*=/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$file"
}

confirm() {
  # confirm "Question" - returns 0 for yes, 1 for no
  local __reply
  printf "%s [y/N]: " "$1" > /dev/tty
  IFS= read -r __reply < /dev/tty
  case "$__reply" in
    y|Y|yes|YES|Yes) return 0 ;;
    *) return 1 ;;
  esac
}

detect_os() {
  case "$(uname -s)" in
    Darwin) OS="macos" ;;
    Linux)  OS="linux" ;;
    *) fail "Unsupported OS: $(uname -s). This installer supports macOS and Linux." ;;
  esac
  ok "Detected OS: $OS"
}

ensure_homebrew() {
  if [ "$OS" != "macos" ]; then
    return
  fi
  if command -v brew >/dev/null 2>&1; then
    ok "Homebrew already installed"
    return
  fi
  info "Installing Homebrew (you may be prompted for your password)..."
  NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
    < /dev/tty
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  command -v brew >/dev/null 2>&1 || fail "Homebrew install did not put brew on PATH."
  ok "Homebrew installed"
}

ensure_git() {
  if command -v git >/dev/null 2>&1; then
    ok "git already installed ($(git --version))"
    return
  fi
  info "Installing git..."
  if [ "$OS" = "macos" ]; then
    brew install git
  elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y git
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y git
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y git
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm git
  else
    fail "No supported package manager found. Please install git manually and re-run."
  fi
  ok "git installed"
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major=$(node -v | sed 's/^v//' | cut -d. -f1)
    if [ "$major" -ge 18 ] 2>/dev/null; then
      ok "Node.js already installed ($(node -v))"
      return
    fi
    warn "Node.js $(node -v) is too old; need 18+. Installing newer version..."
  else
    info "Installing Node.js 20..."
  fi
  if [ "$OS" = "macos" ]; then
    brew install node
  elif command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm nodejs npm
  else
    fail "No supported package manager found. Please install Node.js 18+ manually."
  fi
  command -v node >/dev/null 2>&1 || fail "Node.js install did not put node on PATH."
  ok "Node.js installed ($(node -v))"
}

get_repo() {
  if [ -f package.json ] && grep -q '"name": "basecamp-mcp-server"' package.json; then
    ok "Already inside basecamp-mcp-server checkout: $(pwd)"
    return
  fi
  if [ -d "$REPO_DIR/.git" ]; then
    local existing_origin
    existing_origin=$(git -C "$REPO_DIR" config --get remote.origin.url 2>/dev/null || echo "")
    if [ -n "$existing_origin" ] && [ "$existing_origin" != "$REPO_URL" ]; then
      fail "Directory '$REPO_DIR' already exists with a different remote: $existing_origin
Expected: $REPO_URL
Either remove '$REPO_DIR', cd into a different directory, or set BASECAMP_MCP_DIR=<other-name>."
    fi
    info "Updating existing clone at $REPO_DIR..."
    git -C "$REPO_DIR" pull --ff-only
  elif [ -d "$REPO_DIR" ]; then
    fail "Directory '$REPO_DIR' exists but is not a git repository.
Remove it or set BASECAMP_MCP_DIR=<other-name> before re-running."
  else
    info "Cloning $REPO_URL into $REPO_DIR..."
    git clone "$REPO_URL" "$REPO_DIR"
  fi
  cd "$REPO_DIR"
  ok "Repository ready: $(pwd)"
}

install_and_build() {
  info "Installing npm dependencies (this may take a minute)..."
  npm install
  ok "Dependencies installed"
  info "Building TypeScript..."
  npm run build
  ok "Build complete"
}

configure_env() {
  local EXISTING_CLIENT_ID="" EXISTING_CLIENT_SECRET="" EXISTING_ACCOUNT_ID=""
  local EXISTING_USER_AGENT="" EXISTING_APP_NAME="" EXISTING_USER_EMAIL=""

  if [ -f .env ]; then
    info "Existing .env detected at $(pwd)/.env — its values will pre-fill the prompts."
    EXISTING_CLIENT_ID=$(read_env_value BASECAMP_CLIENT_ID)
    EXISTING_CLIENT_SECRET=$(read_env_value BASECAMP_CLIENT_SECRET)
    EXISTING_ACCOUNT_ID=$(read_env_value BASECAMP_ACCOUNT_ID)
    EXISTING_USER_AGENT=$(read_env_value USER_AGENT)
    # USER_AGENT is "App Name (email)" — split into parts.
    EXISTING_APP_NAME=$(printf '%s' "$EXISTING_USER_AGENT" | sed -e 's/ *(.*$//')
    EXISTING_USER_EMAIL=$(printf '%s' "$EXISTING_USER_AGENT" | sed -n 's/.*(\(.*\)).*/\1/p')
  fi

  printf "\n%sBasecamp OAuth credentials%s\n" "$BOLD" "$NC" > /dev/tty
  printf "Create an OAuth app at: https://launchpad.37signals.com/integrations\n" > /dev/tty
  printf "Use this exact redirect URI when creating the app:\n  %s%s%s\n\n" \
    "$BOLD" "$REDIRECT_URI" "$NC" > /dev/tty

  local CLIENT_ID CLIENT_SECRET ACCOUNT_ID USER_EMAIL APP_NAME
  prompt        CLIENT_ID     "Client ID"                                    "$EXISTING_CLIENT_ID"
  prompt_secret CLIENT_SECRET "Client Secret (input hidden)"                 "$EXISTING_CLIENT_SECRET"
  prompt        ACCOUNT_ID    "Account ID (the number from your Basecamp URL)" "$EXISTING_ACCOUNT_ID"
  prompt        USER_EMAIL    "Your email (for the User-Agent header)"       "$EXISTING_USER_EMAIL"
  prompt        APP_NAME      "App name for the User-Agent"                  "${EXISTING_APP_NAME:-Basecamp MCP}"

  if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$ACCOUNT_ID" ] || [ -z "$USER_EMAIL" ]; then
    fail "Client ID, Client Secret, Account ID, and email are all required."
  fi

  umask 077
  cat > .env <<EOF
# Basecamp OAuth Configuration
BASECAMP_CLIENT_ID=${CLIENT_ID}
BASECAMP_CLIENT_SECRET=${CLIENT_SECRET}
BASECAMP_REDIRECT_URI=${REDIRECT_URI}

# Basecamp Account
BASECAMP_ACCOUNT_ID=${ACCOUNT_ID}

# User-Agent (required by Basecamp API)
USER_AGENT="${APP_NAME} (${USER_EMAIL})"

# OAuth tokens (filled automatically after authentication)
BASECAMP_ACCESS_TOKEN=
BASECAMP_REFRESH_TOKEN=
EOF
  ok ".env written to $(pwd)/.env"
}

open_browser() {
  local url=$1
  if [ "$OS" = "macos" ] && command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

port_in_use() {
  # Returns 0 if TCP port $1 on localhost is currently bound.
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -lnt "sport = :$port" 2>/dev/null | grep -q LISTEN
  elif command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | grep -E "[.:]${port}[[:space:]].*LISTEN" >/dev/null
  else
    return 1  # Can't tell — assume free.
  fi
}

run_oauth() {
  printf "\n"
  if port_in_use 8000; then
    warn "Port 8000 is already in use. The OAuth server can't start until it's freed."
    warn "Find the process with: lsof -i :8000   (then kill it), or stop your other dev server."
    fail "Refusing to launch OAuth on a busy port."
  fi
  info "Starting OAuth server. A browser window will open at http://lvh.me:8000"
  info "Complete the authorization, then come back here. Press Ctrl+C to stop."
  ( sleep 2 && open_browser "http://lvh.me:8000" ) &
  npm run auth
}

main() {
  printf "%s🏕️  Basecamp MCP Server installer%s\n" "$BOLD" "$NC"
  printf "================================================\n"
  require_tty
  detect_os
  ensure_homebrew
  ensure_git
  ensure_node
  get_repo
  install_and_build
  configure_env
  run_oauth
  printf "\n%s✓ Done.%s\n" "$GREEN" "$NC"
}

main "$@"
