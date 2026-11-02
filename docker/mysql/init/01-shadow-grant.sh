#!/bin/sh
# Hak shadow database untuk `prisma migrate dev`, terbatas pada pola nama prisma_migrate_shadow_db%.
# Dijalankan otomatis oleh image MySQL hanya saat volume baru dibuat.
# Untuk volume yang sudah ada: docker compose exec mysql sh /docker-entrypoint-initdb.d/01-shadow-grant.sh
set -e
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot <<SQL
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES ON \`prisma_migrate_shadow_db%\`.* TO '$MYSQL_USER'@'%';
SQL
