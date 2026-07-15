#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export NVM_DIR="$SCRIPT_DIR/nvm"

# this only outputs if stdout is connected to a terminal - true for running manually, false
# for when run by systemd
if [[ -t 1 ]]; then
    echo "Set NVM_DIR = $NVM_DIR"
    echo "Sourcing nvm.sh"
fi

[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

if [[ -t 1 ]]; then
    echo "nvm: $(command -v nvm)"
    echo "Changing version of NodeJS used to v20"
fi
nvm use default >/dev/null

if [[ -t 1 ]]; then
    echo "node: $(which node)"
    echo "pm2: $(which pm2)"
fi
