# crypto-tax
| :warning:  This repo software is provided without any guarantees. Make sure to verify that transactions are correctly converted before submitting your taxes |
|-----------------------------------------|

This is a repo to parse and convert movements and trades in different platforms to make them compatible with Ctax calculators. The main reason to create this repo is because different platforms has insufficient importing methods or sometimes are broken. This code is easy extensible and creates CSVs for different tax calculators.

# Support
Currently we have partial support for parsing CSVs from the following exchanges:
* Binance
* Blockfi
* Celsius (platform has been declared in bankruptcy)
* Crypto.com app and exchange
* FTX (platform has been declared in bankruptcy)
* Kraken
* Kucoin
* Nexo
* Oasis network wallet

Currently we have support to export transactions to:
* Koinly
* Cointracking
* Taxbit

# How to execute
* `npm install`
* Create an input folder inside the exchange you want to parse from with the corresponding CSVs. Check the js inside the folder to figure out the names that the CSVs should have (usually they are the default ones given when downloading transactions from the exchange).
* Create an output folder inside the exchange you want to parse from. This should be empty
* Run the corresponding js. For example for Binance `node binance.js`
* Check output folder and there should be a CSV for each of the tax platforms and a CSV for each type of transaction (deposit, withdrawal, etc.)

 # Contribute
 There is plenty of work to do in this repo. There are thousands or millions of exchanges that we can give support to. If you want, open an issue and ask for it, or create a pull request with your own new supported platform or fixed patch. Thanks.
