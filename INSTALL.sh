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
#nvm use 20
nvm alias default 20

# use nodejs package manager to install pm2. -g installs it for the nodejs version, rather than for a current project
echo "***Install pm2 into nodejs 20"
npm install -g pm2

pm2 update

echo "*** Install packages for the current project"
npm install

echo "*** Please create .env and set the relevant keys. See README-KEYS.md"

echo "*** If you want a local Piper, run the following:"

echo "> wget -O piper_linux_x86_64.tar.gz   https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz"
echo "> tar xzvf piper_linux_x86_64.tar.gz"

echo " This will also need the onnx model to be put into a models folder"
echo " e.g. models/model.onnx"
echo "            /model.onnx.json"

