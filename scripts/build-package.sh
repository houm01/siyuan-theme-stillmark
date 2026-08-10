#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$script_dir/.." && pwd)
output=${1:-"$repo_dir/package.zip"}

if [[ "$output" != /* ]]; then
    output="$repo_dir/$output"
fi

files=(
    CHANGELOG.md
    LICENSE
    README.md
    README.zh-CN.md
    icon.png
    preview.png
    theme.css
    theme.json
)

temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/stillmark-theme-package.XXXXXX")
cleanup() {
    find "$temp_dir" -depth -delete
}
trap cleanup EXIT

(
    cd "$repo_dir"
    zip -X -q "$temp_dir/package.zip" "${files[@]}"
)

install -m 0644 "$temp_dir/package.zip" "$output"

archive_files=$(unzip -Z1 "$output" | LC_ALL=C sort)
expected_files=$(printf '%s\n' "${files[@]}" | LC_ALL=C sort)

if [[ "$archive_files" != "$expected_files" ]]; then
    printf 'Unexpected package contents:\n%s\n' "$archive_files" >&2
    exit 1
fi

if unzip -Z1 "$output" | grep -Eq '(^|/)theme\.js$|\.js$'; then
    printf 'JavaScript files are not allowed in the theme package.\n' >&2
    exit 1
fi

printf 'Built %s\n' "$output"
