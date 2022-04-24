const Papa = require('papaparse')
const fs = require('fs')
const _ = require('lodash')
const Transaction = require('../Transaction')

let ledgersCSVText = fs.readFileSync("input/ledgers.csv", "utf8")
let ledgersData = Papa.parse(ledgersCSVText, {header: true})

let currencySolver = (currency) => {
    let currencies = {
        ZEUR: 'EUR',
        ZUSD: 'USD',
        XXBT: 'BTC',
        XBT: 'BTC',
        XETH: 'ETH',
        ETH2: 'ETH',
        XXRP: 'XRP',
        XXLM: 'XLM',
        XXMR: 'XMR',
        XLTC: 'LTC',
        'DOT.S': 'DOT',
        'XBT.M': 'BTC',
        'KAVA.S': 'KAVA',
        'ATOM.S': 'ATOM',
        'ALGO.S': 'ALGO',
        'ADA.S': 'ADA',
        'SOL.S': 'SOL',
        'KSM.S': 'KSM',
        'DOT.P': 'DOT',
        'KSM.P': 'KSM'
    }
    if (currencies[currency]) {
        return currencies[currency]
    } else {
        return currency
    }
}

let isFiat = (currency) => {
    let fiatCurrencies = {
        'EUR': 'EUR',
        'USD': 'USD',
        'TRY': 'TRY'
    } // TODO To complete
    return !!fiatCurrencies[currencySolver(currency)];
}

//console.log(ledgersData.data[1])

// Deposits
let deposits = ledgersData.data.filter(transaction => {return transaction.type === 'deposit' && transaction.txid !== ''})
let transactionsDeposits = deposits.map((deposit) => {
    return new Transaction({
        dateTime: new Date(deposit.time).toISOString(),
        type: 'Transfer In',
        receivedQuantity: deposit.amount,
        receivedCurrency: currencySolver(deposit.asset),
        receivingDestination: 'Kraken',
        exchangeTransactionId: deposit.txid
    })
})

fs.writeFileSync('output/kraken_deposit.csv', Papa.unparse(transactionsDeposits))

// Withdrawal
let withdrawals = ledgersData.data.filter(transaction => {return transaction.type === 'withdrawal' && transaction.txid !== ''})
let transactionsWithdrawals = withdrawals.map((withdrawal) => {
    return new Transaction({
        dateTime: new Date(withdrawal.time).toISOString(),
        type: 'Transfer Out',
        sentQuantity: parseFloat(withdrawal.amount)*-1,
        sentCurrency: currencySolver(withdrawal.asset),
        sendingSource: 'Kraken',
        exchangeTransactionId: withdrawal.txid,
        fee: withdrawal.fee,
        feeCurrency: currencySolver(withdrawal.asset)
    })
})

fs.writeFileSync('output/kraken_withdrawal.csv', Papa.unparse(transactionsWithdrawals))

// Staking
let stakings = ledgersData.data.filter(transaction => {return transaction.type === 'staking' && transaction.txid !== ''})
let transactionsStakings = stakings.map((staking) => {
    return new Transaction({
        dateTime: new Date(staking.time).toISOString(),
        type: 'Income',
        receivedQuantity: staking.amount,
        receivedCurrency: currencySolver(staking.asset),
        receivingDestination: 'Kraken',
        exchangeTransactionId: staking.txid
    })
})

fs.writeFileSync('output/kraken_staking.csv', Papa.unparse(transactionsStakings))

// Buy
let buyPairs = []
ledgersData.data.forEach((transaction, index, array) => {
    let pair = {}
    if (transaction.type === 'trade' && isFiat(transaction.asset)) {
        pair.origin = transaction
        if (array.length > index+1 && array[index+1].refid === transaction.refid) {
            pair.destination = array[index+1]
            buyPairs.push(pair)
        } else {
            // Nothing to do, is a sale pair
        }
    }
})

let transactionsBuys = buyPairs.map((buyPair) => {
    return new Transaction({
        dateTime: new Date(buyPair.origin.time).toISOString(),
        type: 'Buy',
        sentQuantity: parseFloat(buyPair.origin.amount)*-1,
        sentCurrency: currencySolver(buyPair.origin.asset),
        sendingSource: 'Kraken',
        receivedCurrency: currencySolver(buyPair.destination.asset),
        receivedQuantity: buyPair.destination.amount,
        receivingDestination: 'Kraken',
        fee: buyPair.origin.fee,
        feeCurrency: currencySolver(buyPair.origin.asset),
        exchangeTransactionId: buyPair.origin.refid
    })
})

fs.writeFileSync('output/kraken_buy.csv', Papa.unparse(transactionsBuys))

// TODO Sales
let salePairs = []
ledgersData.data.forEach((transaction, index, array) => {
    let pair = {}
    if (transaction.type === 'trade' && isFiat(transaction.asset)) {
        pair.destination = transaction
        if (0 <= index-1 && array[index-1].refid === transaction.refid) {
            pair.origin = array[index-1]
            salePairs.push(pair)
        } else {
            // Nothing to do, is a bought pair
        }
    }
})

let transactionsSales = salePairs.map((salePair) => {
    return new Transaction({
        dateTime: new Date(salePair.origin.time).toISOString(),
        type: 'Sale',
        sentQuantity: parseFloat(salePair.origin.amount)*-1,
        sentCurrency: currencySolver(salePair.origin.asset),
        sendingSource: 'Kraken',
        receivedCurrency: currencySolver(salePair.destination.asset),
        receivedQuantity: salePair.destination.amount,
        receivingDestination: 'Kraken',
        fee: salePair.destination.fee,
        feeCurrency: currencySolver(salePair.destination.asset),
        exchangeTransactionId: salePair.origin.refid
    })
})

fs.writeFileSync('output/kraken_sale.csv', Papa.unparse(transactionsSales))

// Trades
let tradePairs = []
ledgersData.data.forEach((transaction, index, array) => {
    let pair = {}
    if ((transaction.type === 'trade' || transaction.type === 'spend') && !isFiat(transaction.asset)) {
        pair.origin = transaction
        if (array.length > index+1 && array[index+1].refid === transaction.refid && !isFiat(array[index+1].asset)) {
            pair.destination = array[index+1]
            tradePairs.push(pair)
        } else {
            // Nothing to do, is a fiat bought or crypto trade destination
        }
    }
})

let transactionsTrades = tradePairs.map((tradePair) => {
    return new Transaction({
        dateTime: new Date(tradePair.origin.time).toISOString(),
        type: 'Sale',
        sentQuantity: parseFloat(tradePair.origin.amount)*-1,
        sentCurrency: currencySolver(tradePair.origin.asset),
        sendingSource: 'Kraken',
        receivedCurrency: currencySolver(tradePair.destination.asset),
        receivedQuantity: tradePair.destination.amount,
        receivingDestination: 'Kraken',
        fee: tradePair.origin.fee,
        feeCurrency: currencySolver(tradePair.origin.asset),
        exchangeTransactionId: tradePair.origin.refid
    })
})

fs.writeFileSync('output/kraken_trade.csv', Papa.unparse(transactionsTrades))

// TODO Expenses

let allTransactions = _.concat(transactionsTrades, transactionsSales, transactionsBuys, transactionsStakings, transactionsDeposits, transactionsWithdrawals)
fs.writeFileSync('output/kraken_all.csv', Papa.unparse(allTransactions))

