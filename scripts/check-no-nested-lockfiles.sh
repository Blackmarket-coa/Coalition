#!/usr/bin/env bash
set -euo pipefail

mapfile -t lockfiles < <(find . \
  \( -type d \( -name 'node_modules' -o -name '.yarn' -o -name '.git' \) -prune \) -o \
  \( -type f \( -name 'yarn.lock' -o -name 'package-lock.json' -o -name 'pnpm-lock.yaml' \) -print \) | sort)

allowed='./yarn.lock'
invalid=()
for file in "${lockfiles[@]}"; do
  if [[ "$file" != "$allowed" ]]; then
    invalid+=("$file")
  fi
done

if ((${#invalid[@]} > 0)); then
  echo "❌ Nested lockfiles are not allowed. Keep a single root lockfile: $allowed"
  printf ' - %s\n' "${invalid[@]}"
  exit 1
fi

echo "✅ Lockfile policy check passed (single root yarn.lock)."
