#!/bin/zsh
set -e
BASE="$HOME/.local/mysql"
DATA="$HOME/.local/mysql-data"
if "$BASE/bin/mysqladmin" --protocol=SOCKET --socket="$DATA/mysql.sock" ping >/dev/null 2>&1; then
  echo 'Local MySQL is already running on 127.0.0.1:3307.'
  exit 0
fi
nohup "$BASE/bin/mysqld" --no-defaults --basedir="$BASE" --datadir="$DATA" --socket="$DATA/mysql.sock" --pid-file="$DATA/mysql.pid" --log-error="$DATA/mysql-error.log" --bind-address=127.0.0.1 --port=3307 > "$DATA/start.log" 2>&1 < /dev/null &
sleep 3
if ! lsof -nP -iTCP:3307 -sTCP:LISTEN >/dev/null; then
  echo "MySQL did not start. Check $DATA/mysql-error.log" >&2
  exit 1
fi
echo 'Local MySQL started on 127.0.0.1:3307.'
