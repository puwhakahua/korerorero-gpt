export NVM_DIR=`pwd`/nvm
export PROFILE=/dev/null

mkdir nvm
echo "***Download the nvm install.sh and running it"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash

echo "***Source nvm.sh"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
echo "nvm: $(command -v nvm)"

echo "***Get nodejs version 20"
nvm install 20
echo "***Switch to use version 20"
nvm use 20
# use nodejs package manager to install pm2. -g installs it for the nodejs version, rather than for a current project
echo "***Install pm2 into nodejs 20"
npm install -g pm2

pm2 update
