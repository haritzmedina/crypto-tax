const Papa = require('papaparse')
const _ = require('lodash')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../Transaction')

let currencySolver = (currency) => {
    let currencies = {
        ZEUR: 'EUR',
        XXBT: 'BTC',
        XBT: 'BTC',
        XETH: 'ETH',
        ETH2: 'ETH',
        XXRP: 'XRP',
        XLTC: 'LTC',
        'DOT.S': 'DOT',
        'XBT.M': 'BTC',
        'KAVA.S': 'KAVA',
        'ATOM.S': 'ATOM',
        'ALGO.S': 'ALGO',
        'ADA.S': 'ADA',
        'SOL.S': 'SOL',
        'KSM.S': 'KSM'
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

// Deposits
let depositsCSVText = fs.readFileSync("input/ftx-deposits.csv", "utf8")
let deposits = Papa.parse(depositsCSVText, {header: true})

let transactionsDeposits = deposits.data.map((deposit) => {
    if (deposit['Status'] === 'complete' || deposit['Status'] === 'confirmed') {
        return new Transaction({
            dateTime: deposit['Time'],
            type: 'Transfer In',
            receivedQuantity: parseFloat(deposit['Amount']),
            receivedCurrency: currencySolver(deposit['Coin']),
            receivingDestination: 'FTX',
            exchangeTransactionId: uuidv4()
        })
    }
})
transactionsDeposits = _.compact(transactionsDeposits)

fs.writeFileSync('output/ftx_deposit.csv', Papa.unparse(transactionsDeposits))

// Withdrawal
let withdrawalsCSVText = fs.readFileSync("input/ftx-withdrawals.csv", "utf8")
let withdrawals = Papa.parse(withdrawalsCSVText, {header: true})

let transactionsWithdrawals = withdrawals.data.map((withdrawal) => {
    return new Transaction({
        dateTime: withdrawal['Time'],
        type: 'Transfer Out',
        sentQuantity: parseFloat(withdrawal['Amount']),
        sentCurrency: currencySolver(withdrawal['Coin']),
        sendingSource: 'FTX',
        exchangeTransactionId: uuidv4(),
        fee: withdrawal['fee'], // TODO Fee is included
        feeCurrency: currencySolver(withdrawal['Coin']),
        blockchainTransactionHash: withdrawal['Transaction ID']
    })
})

fs.writeFileSync('output/ftx_withdrawal.csv', Papa.unparse(transactionsWithdrawals))

// Staking
let stakingsCSVText = fs.readFileSync("input/ftx-staking.csv", "utf8")
let stakings = Papa.parse(stakingsCSVText, {header: true})

let transactionsStakings = stakings.data.map((staking) => {
    return new Transaction({
        dateTime: staking['Time'],
        type: 'Income',
        receivedQuantity: parseFloat(staking['Reward']).toFixed(8),
        receivedCurrency: currencySolver(staking['Coin']),
        receivingDestination: 'FTX',
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/ftx_staking.csv', Papa.unparse(transactionsStakings))

// Lending
let lendingsCSVText = fs.readFileSync("input/ftx-lending.csv", "utf8")
let lendings = Papa.parse(lendingsCSVText, {header: true})

let transactionsLendings = lendings.data.map((lending) => {
    return new Transaction({
        dateTime: lending['Time'],
        type: 'Income',
        receivedQuantity: parseFloat(lending['Proceeds']).toFixed(8),
        receivedCurrency: currencySolver(lending['Currency']),
        receivingDestination: 'FTX',
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/ftx_lending.csv', Papa.unparse(transactionsLendings))

let tradesCSVText = fs.readFileSync("input/ftx-trades.csv", "utf8")
let trades = Papa.parse(tradesCSVText, {header: true})

// Buy
let buyTrades = trades.data.filter((trade) => {
    return (isFiat(trade['Market'].split('/')[1]) && !isFiat(trade['Market'].split('/')[0]) && trade['Side'] === 'buy')
        || (isFiat(trade['Market'].split('/')[0]) && !isFiat(trade['Market'].split('/')[1]) && trade['Side'] === 'sell')
})

let transactionsBuys = buyTrades.map((trade) => {
    if (trade['Side'] === 'buy') {
        return new Transaction({
            dateTime: trade['Time'],
            type: 'Buy',
            sentQuantity: parseFloat(trade['Total']),
            sentCurrency: currencySolver(trade['Market'].split('/')[1]),
            receivingDestination: 'FTX',
            receivedCurrency: currencySolver(trade['Market'].split('/')[0]),
            receivedQuantity: parseFloat(trade['Size']),
            fee: trade['Fee'],
            feeCurrency: currencySolver(trade['Fee Currency']),
            exchangeTransactionId: trade['ID']
        })
    } else if (trade['Side'] === 'sell') {
        return new Transaction({
            dateTime: trade['Time'],
            type: 'Buy',
            sentQuantity: parseFloat(trade['Size']),
            sentCurrency: currencySolver(trade['Market'].split('/')[0]),
            receivingDestination: 'FTX',
            receivedCurrency: currencySolver(trade['Market'].split('/')[1]),
            receivedQuantity: parseFloat(trade['Total']),
            fee: trade['Fee'],
            feeCurrency: currencySolver(trade['Fee Currency']),
            exchangeTransactionId: trade['ID']
        })
    }
})

fs.writeFileSync('output/ftx_buy.csv', Papa.unparse(transactionsBuys))

// Sales
let saleTrades = trades.data.filter((trade) => {
    return (isFiat(trade['Market'].split('/')[0]) && !isFiat(trade['Market'].split('/')[1]) && trade['Side'] === 'buy')
        || (isFiat(trade['Market'].split('/')[1]) && !isFiat(trade['Market'].split('/')[0]) && trade['Side'] === 'sell')
})

let transactionsSales = saleTrades.map((trade) => {
    if (trade['Side'] === 'buy') {
        return new Transaction({
            dateTime: trade['Time'],
            type: 'Sale',
            sentQuantity: parseFloat(trade['Total']),
            sentCurrency: currencySolver(trade['Market'].split('/')[1]),
            receivingDestination: 'FTX',
            receivedCurrency: currencySolver(trade['Market'].split('/')[0]),
            receivedQuantity: parseFloat(trade['Size']),
            fee: trade['Fee'],
            feeCurrency: currencySolver(trade['Fee Currency']),
            exchangeTransactionId: trade['ID']
        })
    } else if (trade['Side'] === 'sell') {
        return new Transaction({
            dateTime: trade['Time'],
            type: 'Sale',
            sentQuantity: parseFloat(trade['Size']),
            sentCurrency: currencySolver(trade['Market'].split('/')[0]),
            receivingDestination: 'FTX',
            receivedCurrency: currencySolver(trade['Market'].split('/')[1]),
            receivedQuantity: parseFloat(trade['Total']),
            fee: trade['Fee'],
            feeCurrency: currencySolver(trade['Fee Currency']),
            exchangeTransactionId: trade['ID']
        })
    }
})

fs.writeFileSync('output/ftx_sale.csv', Papa.unparse(transactionsSales))

// Trades
let nonFiatTrades = trades.data.filter((trade) => {
    return (!isFiat(trade['Market'].split('/')[0]) && !isFiat(trade['Market'].split('/')[1])) ||
        (isFiat(trade['Market'].split('/')[0]) && isFiat(trade['Market'].split('/')[1]))
})

let transactionsTrades = nonFiatTrades.map((trade) => {
    if (trade['Side'] === 'buy') {
        return new Transaction({
            dateTime: trade['Time'],
            type: 'Trade',
            sentQuantity: parseFloat(trade['Total']),
            sentCurrency: currencySolver(trade['Market'].split('/')[1]),
            receivingDestination: 'FTX',
            receivedCurrency: currencySolver(trade['Market'].split('/')[0]),
            receivedQuantity: parseFloat(trade['Size']),
            fee: trade['Fee'],
            feeCurrency: currencySolver(trade['Fee Currency']),
            exchangeTransactionId: trade['ID']
        })
    } else if (trade['Side'] === 'sell') {
        return new Transaction({
            dateTime: trade['Time'],
            type: 'Trade',
            sentQuantity: parseFloat(trade['Size']),
            sentCurrency: currencySolver(trade['Market'].split('/')[0]),
            receivingDestination: 'FTX',
            receivedCurrency: currencySolver(trade['Market'].split('/')[1]),
            receivedQuantity: parseFloat(trade['Total']),
            fee: trade['Fee'],
            feeCurrency: currencySolver(trade['Fee Currency']),
            exchangeTransactionId: trade['ID']
        })
    }
})

fs.writeFileSync('output/ftx_trades.csv', Papa.unparse(transactionsTrades))

let usedTransactions = _.concat(buyTrades, saleTrades, nonFiatTrades)
let nonUsedTransactions = _.difference(trades.data, usedTransactions)
console.log(nonUsedTransactions)

// TODO Expenses

// A file for all transactions
let allTransactions = _.concat(transactionsTrades, transactionsSales, transactionsBuys, transactionsStakings, transactionsLendings, transactionsDeposits, transactionsWithdrawals)
fs.writeFileSync('output/ftx_all_taxbit.csv', Papa.unparse(allTransactions))
fs.writeFileSync('output/ftx_all_koinly.csv', Papa.unparse(allTransactions.map(trans => trans.toKoinly())))