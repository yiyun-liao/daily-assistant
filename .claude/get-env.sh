#!/bin/bash
# Load environment variables from .env for remote triggers

ENV_FILE="$(dirname "$0")/../.env"

if [ ! -f "$ENV_FILE" ]; then
  exit 1
fi

# Source the .env file and output JSON
source "$ENV_FILE"

cat <<EOF
{
  "TELEGRAM_BOT_TOKEN": "$TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID": "$TELEGRAM_CHAT_ID",
  "CLAUDE_API_KEY": "$CLAUDE_API_KEY",
  "ICAL_USER_ID": "$ICAL_USER_ID",
  "ICAL_PASSWORD": "$ICAL_PASSWORD"
}
EOF
