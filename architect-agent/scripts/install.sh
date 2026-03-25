#!/bin/bash
# ARIA Architect Agent — install script
set -e

echo "Installing architect-agent..."
cp architect-agent.js /root/aria-core/
psql "$DATABASE_URL" -f references/schema.sql
echo "Done. Add /architect endpoint to your aria-core index.js"
