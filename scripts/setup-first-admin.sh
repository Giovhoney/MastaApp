#!/bin/zsh
set -e
cd "${0:A:h}/.."
print 'First administrator setup (one time only).'
read 'admin_name?Administrator first name: '
read -s 'admin_pin?Administrator 6-digit PIN (hidden): '
print ''
printf '%s\n%s\n' "$admin_name" "$admin_pin" | npx tsx scripts/bootstrap-admin.ts
unset admin_pin
