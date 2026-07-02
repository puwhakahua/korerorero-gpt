export NVM_DIR=`pwd`/nvm
echo "Set NVM_DIR = $NVM_DIR"

echo "Sourcing nvm.sh"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
echo "nvm: $(command -v nvm)"

echo "Changing version of NodeJS used to v20"
nvm use 20

echo "node: $(which node)"

echo "pm2: $(which pm2)"
