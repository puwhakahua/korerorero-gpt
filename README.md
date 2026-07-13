--------------
Install
--------------
Run ./INSTALL.sh

--------------
Run
--------------
source ./SETUP.sh
./RUN.sh

You can edit RUN.sh to run as dev server or as production server
If you are in production mode, and you chnage the code, you need to run 'npm run build' to recompile before running ./RUN.sh

To run as a service:
pm2 start ecosystem.config.js
pm2 save

pm2 startup (to have it start up on reboot - follow the instructions and then pm2 save again)

This runs it under the name korerorero-gpt

You can do:
  *pm2 status
  *pm2 logs
  *pm2 restart korerorero-gpt (full restart)
  *pm2 reload korerorero-gpt (zero-downtime reload)


The default config options can be set in src/app/page.js

speechToText: PapaReo [OpenAI, fake]
chatLLM: Claude [fake, OpenAI, OpenRouter]
textToSpeech: MaoriTTSW [OpenAI, PapaReo, MaoriTTSK, fake, Piper, Puwhakahua]




Inspiration taken from:

  https://github.com/ZaharBerku/openai-speech-to-text

