# OpenTrade is the best opensource cryptocurrency exchange!

Live version: https://greencoin.online/

Forked from: https://trade.multicoins.org/

Step-by-step install instructions:

1. Register on the VPS hosting like this https://m.do.co/c/4124684bc46e
2. Create "Droplet" Ubuntu 16 x64 / 1GB / 1vCPU / 25 GB SSD
3. Log in to Droplet console over SSH (You will receive a email with IP, username and password)
4

```
sudo apt-get update
sudo apt-get install git build-essential libssl-dev curl -y
curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh -o install_nvm.sh
bash install_nvm.sh
sudo reboot

nvm install 8.0.0

git clone https://github.com/3s3s/opentrade.git
cd opentrade

sudo npm install
sudo npm install -g node-gyp
sudo PATH="$PATH:/usr/local/bin" npm install -g grunt-cli
sudo npm install sqlite3 --build-from-source
sudo npm cache clean -f
sudo npm install -g n
sudo n stable
ln -s /usr/bin/nodejs /usr/bin/node
```

## Here is an example of file ~/opentrade/server/modules/private_constants.js Edit as per your config.

```
'use strict';

exports.recaptcha_priv_key = 'YOUR_GOOGLE_RECAPTCHA_PRIVATE_KEY';
exports.password_private_suffix = 'LONG_RANDOM_STRING1';
exports.SSL_KEY = '../ssl_certificates/privkey.pem'; //change to your ssl certificates private key
exports.SSL_CERT = '../ssl_certificates/fullchain.pem'; //change to your ssl certificates fullchain

exports.walletspassphrase = {
    'GRN' : 'LONG_RANDOM_STRING2', // Don't use symbols: !@#$%^&*() etc. Just Uppercase, Lowercase and digits
    'BTC' : 'LONG_RANDOM_STRING3', // Don't use symbols: !@#$%^&*() etc. Just Uppercase, Lowercase and digits
    'DOGE' : 'LONG_RANDOM_STRING4' // Don't use symbols: !@#$%^&*() etc. Just Uppercase, Lowercase and digits
};
```

**After all you can run exchange**

```
cd  ~/opentrade/server
sudo node main.js
```

In the browser address string type https://127.0.0.1:40443
You will see OpenTrade.

The first registered user will be exchange administrator. 

If you can't register, first of all check if opens 25 port. Write to Digital Ocean support for open it.

# To run process in backgroung

you need to send your running process to the background and remove the associated job from current shell.

Press `Ctrl+Z` and type `bg` to send the installation process to the backgroud
then type `disown`.
    
You can now close the terminal, the process will still be alive. You can open another terminal and check its process id with `ps -aef` in left column check your id number of main.js process and next after it. 

To kill your process use `sudo kill #ID_NUMBER_OF_YOUR_PROCESS`


# Add trade pairs

For each coin you should create *.conf file
This is common example for "some_coin.conf"

```
rpcuser=rpc_greencoin_random_long_string
rpcpassword=long_password_string
rpcport=33099
rpcclienttimeout=10
rpcallowip=127.0.0.1
server=1
daemon=1
upnp=0
rpcworkqueue=1000
enableaccounts=1
litemode=1
staking=0
addnode=grn.cryptor.club
addnode=trade.greencoin.space

```

Also you must encrypt wallet.dat by the command

```
./greencoind encryptwallet LONG_RANDOM_STRING2_SAME_AS_IN_FILE_private_constants.js

```

*If coin is not supported encryption (like ZerroCash and it forks) then coin could not be added to the OpenTrade*


When coin daemons will be configured and started

1. Register on exchange. The first registered user will be exchange administrator.
2. Go to "Admin Area" -> "Coins" -> "Add coin"
3. Fill up all fields and click "Confirm"
4. Fill "Minimal confirmations count" and "Minimal balance" and uncheck and check "Coin visible" button
5. Click "Save"
6. Check RPC command for the coin. If it worked then coin was added to the exchange!

All visible coins should be appear in the Wallet. You shoud create default coin pairs now.

File ~/opentrade/server/constants.js have constant that you can change

```
exports.TRADE_MAIN_COIN = "Greencoin"; //change Greencoin to your main coin pair
exports.TRADE_DEFAULT_PAIR = "Litecoin"; //change Litecoin to your default coin pair
exports.TRADE_COMISSION = 0.001; //change trade comission percent

exports.recaptcha_pub_key = "6LeX5SQUAAAAAKTieM68Sz4MECO6kJXsSR7_sGP1"; //change to your recaptcha public key

exports.NOREPLY_EMAIL = 'no-reply@greencoin.online'; //change no-reply email
exports.SUPPORT_EMAIL = 'info@greencoin.online'; //change to your valid email for support requests
exports.my_portSSL = 40443; //change to your ssl port

```

File ~/opentrade/static_pages/chart.html

```
const PORT_SSL = 40443; //change to your ssl port
const MAIN_COIN = 'Marycoin'; //change Marycoin to your main coin pair same as in constants.js
const DEFAULT_PAIR = 'Litecoin'; //change Litecoin to your default coin pair same as in constants.js
      
const TRADE_COMISSION = 0.001;
```

=======
After that, you coins should appear on the main page.



**Donate**
If you find this script is useful then consider donate please

Bitcoin 36WA1WESULub6Q434bQcnmpnk62oLD7vuQ
Marycoin M9dKNcBYgrbbE2f4tz3ud32KLKj1i9FrmN
Dogecoin DCJRhs9Pjr2FBrrUbKvFeWcYC6ZaF2GTAx
Litecoin LTbDdTijroJEyXt27apQSnuMY4RoXyjdq2


