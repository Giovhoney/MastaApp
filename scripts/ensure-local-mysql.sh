#!/bin/zsh
set -e
MYSQL_HOME="$HOME/.local/mysql"
DATA_DIR="$HOME/.local/mysql-data"
if /usr/sbin/lsof -nP -iTCP:3307 -sTCP:LISTEN 2>/dev/null | /usr/bin/grep -q mysqld; then
  echo 'MastaApp MySQL is already running.'
  exit 0
fi
if [[ ! -x "$MYSQL_HOME/bin/mysqld" || ! -d "$DATA_DIR" ]]; then
  echo 'MastaApp local MySQL installation was not found.' >&2
  exit 1
fi
/usr/bin/nohup "$MYSQL_HOME/bin/mysqld" \
  --no-defaults \
  --basedir="$MYSQL_HOME" \
  --datadir="$DATA_DIR" \
  --socket="$DATA_DIR/mysql.sock" \
  --pid-file="$DATA_DIR/mysql.pid" \
  --log-error="$DATA_DIR/mysql-error.log" \
  --bind-address=127.0.0.1 \
  --port=3307 </dev/null >/dev/null 2>&1 &
for i in {1..30}; do
  if /usr/sbin/lsof -nP -iTCP:3307 -sTCP:LISTEN 2>/dev/null | /usr/bin/grep -q mysqld; then
    echo 'MastaApp MySQL is ready on 127.0.0.1:3307.'
    exit 0
  fi
  /bin/sleep 1
done
echo "MySQL did not start. Check $DATA_DIR/mysql-error.log" >&2
exit 1
