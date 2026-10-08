#!/usr/bin/env bash
# PreToolUse hook: blocks any tool call that tries to read constants.js.
# Checks Read (file_path), Grep (path/glob) and Bash (command).
input=$(cat)

target=$(printf '%s' "$input" | jq -r '
  [.tool_input.file_path, .tool_input.path, .tool_input.glob, .tool_input.pattern, .tool_input.command]
  | map(select(. != null)) | join("\n")')

if printf '%s' "$target" | grep -Eq '(^|[^[:alnum:]_.-])constants\.js([^[:alnum:]_.-]|$)'; then
  echo "Acceso bloqueado: el archivo constants.js no puede ser leído por los agentes." >&2
  exit 2
fi
exit 0
