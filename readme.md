# OpenTrade is the best opensource cryptocurrency exchange!

Life version https://trade.multicoins.org/

Step-by-step install instructions:

1. Register on the VPS hosting like this https://m.do.co/c/1ece5d76d5cd
2. Create "Droplet" Ubuntu 16 x64 / 1GB / 1vCPU / 25 GB SSD
3. Log in to Droplet console over SSH
4

```
sudo apt-get update
sudo apt-get install build-essential libssl-dev -y
curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh -o install_nvm.sh
bash install_nvm.sh
reboot

nvm install 6.0.0

git clone https://github.com/3s3s/opentrade.git
cd opentrade
git checkout test

sudo npm install express
sudo npm install ws
sudo npm install sendmail
sudo npm install sqlite3
sudo npm install ejs
sudo npm install cors
mkdir ~/opentrade/server/database
>> ~/opentrade/server/modules/private_constants.js
>> /root/privkey.pem
>> /root/fullchain.pem
```

## Here is an example of file ~/opentrade/server/modules/private_constants.js

```
'use strict';

exports.recaptcha_priv_key = 'YOUR_GOOGLE_RECAPTCHA_PRIVATE_KEY';
exports.password_private_suffix = 'LONG_RANDOM_STRING1';
exports.SSL_KEY = '/root/privkey.pem';
exports.SSL_CERT = '/root/fullchain.pem';

exports.walletspassphrase = {
    'MC' : 'LONG_RANDOM_STRING2',
    'BTC' : 'LONG_RANDOM_STRING3',
    'DOGE' : 'LONG_RANDOM_STRING4'
};
```

**If you have not ssl certificates, you can use this for your tests:**

### File /root/privkey.pem

```
-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQC0+cYKfu3ecWjIrFLfwGyUTEFWguGtSTSCrmH7YVwKs3ZB8OEJ
iafVDwvx65Ch/KREc+xyowkb+5YIUKwwGXl14CBHGJeSdtx85lHqfnevA+MzkWYF
KDozc6KanOudDcXXBOE8wh6OZrbRUSUV8Bzl2r3Y5IQET4FGh+rLEG9XRwIDAQAB
AoGAYcx40UM2mHcBATDeuDvscVekF3QzMMnWrqg+GvLKIp5I0emyMs1I/UJcWifK
yT8WJkffBzRDv/N9aJDv/C5IDBn/LQ37Leb7r1OVl15NgxMAl0XvDSTkpLZcWaL/
nqsCDacNXKaomo8A9Lek18i4adDQ4ywy3e6IBzuyKO48WcECQQDoBzMyAPbUsoTT
CZusZnzR/sMksMmvHzpAeLBolKbN+bt9B3yQHmejZ7Ijz0hhk9kofcCTNGIBazJq
gkRKnfA7AkEAx6xP40pdKilYXM2FF4o3zOZjijY416O4/X4cZykX0+MPYQbjCTHQ
5Ii/lbOaOVrT1+8bwB8o27ggO0t2wHWwZQJACZAKZxwtEBUPblcuCEvtBwaV6lQy
67nAv9l5g8XkngaV2JBPbO0j3lMuv1USqZrbT1Tnc+mrxF0zpboasGyT8wJAGFsC
W50khBIK/zbqdxaa+9lWZvN6N4N2+yS43jR6/ZOCurkWVHbJHjc391CzDS/xCzPV
VLf4SeTJubHYyF0SqQJBAMtuyzbq49MZHtMvOmiY/O73G6w2hrxu8GnO2GJxnXtj
KHsKUISxUHpE6035rjlbyxRR+DPFGqxM7BJrk2qkEqI=
-----END RSA PRIVATE KEY-----
```

### File /root/fullchain.pem

```
-----BEGIN CERTIFICATE-----
MIICATCCAWoCCQCIQvm1vUvbqjANBgkqhkiG9w0BAQsFADBFMQswCQYDVQQGEwJB
VTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0
cyBQdHkgTHRkMB4XDTE3MTIwMzE4NDk1M1oXDTE4MTIwMzE4NDk1M1owRTELMAkG
A1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0
IFdpZGdpdHMgUHR5IEx0ZDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAtPnG
Cn7t3nFoyKxS38BslExBVoLhrUk0gq5h+2FcCrN2QfDhCYmn1Q8L8euQofykRHPs
cqMJG/uWCFCsMBl5deAgRxiXknbcfOZR6n53rwPjM5FmBSg6M3OimpzrnQ3F1wTh
PMIejma20VElFfAc5dq92OSEBE+BRofqyxBvV0cCAwEAATANBgkqhkiG9w0BAQsF
AAOBgQBPeC//NfUwivU+hwKK8d5/0J9yxWRI848ghHDXtv0yMiACZHmCThyN/5y6
+WeC8tZjNUXfUK02piVOHAfVj8dn569lDgBR4eZ2z/OhAtu8xbLlecGKaKkzeTMx
zSZnnKQRUSzFwo8DObkVCc1JgT+OR3xkysQqFMnGCKkyvTPYwQ==
-----END CERTIFICATE-----
```


**After all you can run exchange**

```
cd  ~/opentrade/server
sudo node main.js
```

In the browser address string type https://127.0.0.1:40443
You will see OpenTrade.

The first registered user will be exchange administrator. 

# Add trade pairs

For each coin you should create *.conf file
This is common example for "some_coin.conf"

```
rpcuser=long_random_string_one
rpcpassword=long_random_string_two
rpcport=12345
rpcclienttimeout=10
rpcallowip=127.0.0.1
server=1
daemon=1
upnp=0
rpcworkqueue=1000
enableaccounts=1
litemode=1
staking=0
addnode=1.2.3.4
addnode=5.6.7.8

```

Also you must encrypt wallet.dat by the command

```
./bitcoind encryptwallet random_long_string_SAME_AS_IN_FILE_private_constants.js

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

https://github.com/3s3s/opentrade/blob/master/server/constants.js#L5

```
exports.TRADE_MAIN_COIN = "Marycoin"; //change Marycoin to your main coin pair
exports.TRADE_DEFAULT_PAIR = "Litecoin"; //change Litecoin to your default coin pair
exports.TRADE_COMISSION = 0.001; //change trade comission percent

exports.recaptcha_pub_key = "6LeX5SQUAAAAAKTieM68Sz4MECO6kJXsSR7_sGP1"; //change to your recaptcha public key

exports.NOREPLY_EMAIL = 'no-reply@multicoins.org'; //change no-reply email
exports.SUPPORT_EMAIL = 'ivanivanovkzv@gmail.com'; //change to your valid email for support requests
exports.my_portSSL = 40443; //change to your ssl port

```

After that you coins should appear on the main page.


