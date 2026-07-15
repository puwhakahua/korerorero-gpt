# Install

Run `./INSTALL.sh`


# Run

```sh
source ./SETUP.sh
./RUN.sh
```

You can edit RUN.sh to run as dev server or as production server
If you are in production mode, and you change the code, you need to run 'npm run build' to recompile before running ./RUN.sh

Access it at localhost:3002.

# Configure

.env holds environment setup - api keys for the services etc.
If you want it to have a base path in the url, set the NEXT_PUBLIC_BASE_PATH here. Needed if you are running behind apache.

The default config options for which services to use for the various parts can be set in src/app/page.js

 - speechToText: PapaReo [OpenAI, fake]
 - chatLLM: Claude [fake, OpenAI, OpenRouter]
 - textToSpeech: MaoriTTSW [OpenAI, PapaReo, MaoriTTSK, fake, Piper, Puwhakahua]

# Run using pm2

To run using pm2:
```sh
pm2 start ecosystem.config.js
pm2 save
```

This runs it under the name korerorero-gpt

You can do:
 - `pm2 status`
 - `pm2 logs`
 - `pm2 restart korerorero-gpt` (full restart)
 - `pm2 reload korerorero-gpt` (zero-downtime reload)

# Run as a systemd service

The default pm2 way to have it run as a service, enabled at reboot is to run 'pm2 startup', follow the instructions (which sets up a service) then 'pm2 save' again. We are not using that as a) don't have permission on community, and b) we can write our own unti file which sources SETUP.sh, keeping the environment the same between manual running and service running.

A sample unit file is in service.d/korerorero-gpt.service.
Edit this to match your setup, then install it:

 - Copy the file to /etc/systemd/system/
 - `sudo systemctl enable korerorero-gpt`

If you change the service file, you will likely need to run:
  - `sudo systemctl daemon-reload`

# Running behind apache

These are the configuration settings I used on community:

```apache conf
  # password protext korerorero
  <Location /korerorero-gpt>
            AuthType Basic
            AuthName "Restricted Area"
            AuthUserFile /greenstone/httpd/.htpasswd
            Require valid-user
  </Location>

  ProxyPass /korerorero-gpt/ http://pr-webrwb-comm1.cms.waikato.ac.nz:3002/korerorero-gpt/
  ProxyPass /korerorero-gpt http://pr-webrwb-comm1.cms.waikato.ac.nz:3002/korerorero-gpt        
  ProxyPassReverse /korerorero-gpt/ http://pr-webrwb-comm1.cms.waikato.ac.nz:3002/korerorero-gpt/
  ProxyPassReverse /korerorero-gpt http://pr-webrwb-comm1.cms.waikato.ac.nz:3002/korerorero-gpt

```

Setup the password file using
`htpasswd -c /greenstone/httpd/.htpasswd <username>`

To add another user:
`htpasswd /greenstone/httpd/.htpasswd <username>`



Inspiration taken from:

  https://github.com/ZaharBerku/openai-speech-to-text

