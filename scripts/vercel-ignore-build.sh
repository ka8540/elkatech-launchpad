#!/usr/bin/env bash
set -euo pipefail

# Vercel "Ignored Build Step" hook.
#
# Vercel convention:
#   exit 0  -> SKIP the build/deployment
#   exit 1+ -> ALLOW the build/deployment
#
# We only want Vercel to deploy the long-lived branches:
#   main (production), dev (development), test (QA/staging).
# Every other branch (feature/*, fix/*, enhance/*, random) is skipped.

BRANCH="${VERCEL_GIT_COMMIT_REF:-unknown}"

echo "Vercel branch: ${BRANCH}"

case "${BRANCH}" in
  main | dev | test)
    echo "✅ Allowing Vercel deployment for branch: ${BRANCH}"
    exit 1
    ;;
  *)
    echo "⏭️ Skipping Vercel deployment for branch: ${BRANCH}"
    exit 0
    ;;
esac
