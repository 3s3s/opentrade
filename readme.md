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

npm install express
npm install ws
npm install sendmail
npm install sqlite3
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
node main.js
```

In the browser address string type https://127.0.0.1:40443
You will see OpenTrade.

The first registered user will be exchange administrator. 









