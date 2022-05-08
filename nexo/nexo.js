const Papa = require('papaparse')
const _ = require('lodash')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../Transaction')

const exchangeName = 'Nexo'

const currencySolver = require('../CurrencySolver')

let isFiat = (currency) => {
    let fiatCurrencies = {
        'EUR': 'EUR',
        'USD': 'USD',
        'TRY': 'TRY'
    } // TODO To complete
    return !!fiatCurrencies[currencySolver(currency)];
}

// Load ledger
let transactionsCSVText = fs.readFileSync("input/nexo_transactions.csv", "utf8")
let transactions = Papa.parse(transactionsCSVText, {header: true})

// Deposits
let deposits = transactions.data.filter(deposit => {
    return deposit['Type'] === 'Deposit' || deposit['Type'] === 'ExchangeDepositedOn'
})

let transactionsDeposits = deposits.map(deposit => {
    return new Transaction({
        dateTime: new Date(deposit['Date / Time']).toISOString(),
        type: 'Transfer In',
        receivedQuantity: parseFloat(deposit['Input Amount']),
        receivedCurrency: currencySolver(deposit['Input Currency']),
        receivingDestination: exchangeName,
        exchangeTransactionId: deposit['Transaction'],
        blockchainTransactionHash: deposit['Details'].split('/ ')[1]
    })
})

fs.writeFileSync('output/nexo_deposit.csv', Papa.unparse(transactionsDeposits))


// Withdrawal

let withdraws = transactions.data.filter(transaction => {
    return transaction['Type'] === 'Withdrawal'
})

let transactionsWithdraw = withdraws.map(withdrawal => {
    return new Transaction({
        dateTime: new Date(withdrawal['Date / Time']).toISOString(),
        type: 'Transfer Out',
        sentQuantity: parseFloat(withdrawal['Output Amount']),
        sentCurrency: currencySolver(withdrawal['Output Currency']),
        sendingSource: exchangeName,
        exchangeTransactionId: withdrawal['Transaction']
    })
})

fs.writeFileSync('output/nexo_withdraw.csv', Papa.unparse(transactionsWithdraw))

// Interest loans
let loanInterests = transactions.data.filter(transaction => {
    return transaction['Type'] === 'Interest' || transaction['Type'] === 'FixedTermInterest' || transaction['Type'] === 'Exchange Cashback' || transaction['Type'] === 'ReferralBonus'
})

let transactionsInterest = loanInterests.map(interests => {
    return new Transaction({
        dateTime: new Date(interests['Date / Time']).toISOString(),
        type: 'Income',
        receivedQuantity: parseFloat(interests['Output Amount']).toFixed(8),
        receivedCurrency: currencySolver(interests['Output Currency']),
        receivingDestination: exchangeName,
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/nexo_interest.csv', Papa.unparse(transactionsInterest))

// Buy
let buyTrades = transactions.data.filter(transaction => {
    return transaction['Type'] === 'Exchange' && isFiat(currencySolver(transaction['Input Currency']))
})

let transactionsBuy = buyTrades.map(buy => {
    return new Transaction({
        dateTime: new Date(buy['Date / Time']).toISOString(),
        type: 'Buy',
        sentQuantity: parseFloat(buy['Input Amount']) * -1,
        sentCurrency: currencySolver(buy['Input Currency']),
        sendingSource: exchangeName,
        exchangeTransactionId: buy['Transaction'],
        receivedQuantity: parseFloat(buy['Output Amount']),
        receivedCurrency: currencySolver(buy['Output Currency']),
        receivingDestination: exchangeName,
        fee: 0,
        feeCurrency: currencySolver(buy['Input Currency'])
    })
})

fs.writeFileSync('output/nexo_buy.csv', Papa.unparse(transactionsBuy))

// TODO Sales
let saleTrades = transactions.data.filter(transaction => {
    return transaction['Type'] === 'Exchange' && isFiat(currencySolver(transaction['Output Currency']))
})

let transactionsSale = saleTrades.map(sale => {
    return new Transaction({
        dateTime: new Date(sale['Date / Time']).toISOString(),
        type: 'Sale',
        receivedQuantity: parseFloat(sale['Output Amount']),
        receivedCurrency: currencySolver(sale['Output Currency']),
        receivingDestination: exchangeName,
        exchangeTransactionId: sale['Transaction'],
        fee: 0,
        feeCurrency: currencySolver(sale['Output Currency']),
        sentQuantity: parseFloat(sale['Input Amount']) * -1,
        sentCurrency: currencySolver(sale['Input Currency']),
        sendingSource: exchangeName
    })
})

fs.writeFileSync('output/nexo_sale.csv', Papa.unparse(transactionsSale))

// TODO Trades
let nonFiatTrades = transactions.data.filter(transaction => {
    return transaction['Type'] === 'Exchange' && !isFiat(currencySolver(transaction['Output Currency'])) && !isFiat(currencySolver(transaction['Input Currency']))
})

let transactionsTrade = nonFiatTrades.map(trade => {
    return new Transaction({
        dateTime: new Date(trade['Date / Time']).toISOString(),
        type: 'Trade',
        receivedQuantity: parseFloat(trade['Output Amount']),
        receivedCurrency: currencySolver(trade['Output Currency']),
        receivingDestination: exchangeName,
        exchangeTransactionId: trade['Transaction'],
        fee: 0,
        feeCurrency: currencySolver(trade['Output Currency']),
        sentQuantity: parseFloat(trade['Input Amount']) * -1,
        sentCurrency: currencySolver(trade['Input Currency']),
        sendingSource: exchangeName
    })
})

fs.writeFileSync('output/nexo_trade.csv', Papa.unparse(transactionsTrade))

// TODO Expenses

// Check pending transactions to be processed
let usedTransactions = _.concat(buyTrades, saleTrades, nonFiatTrades, loanInterests, deposits, withdraws)
let nonUsedTransactions = _.difference(transactions.data, usedTransactions)
fs.writeFileSync('output/nexo_pending.csv', Papa.unparse(nonUsedTransactions))

// A file for all transactions
let allTransactions = _.concat(transactionsDeposits, transactionsWithdraw, transactionsInterest, transactionsBuy, transactionsSale, transactionsTrade)
fs.writeFileSync('output/nexo_all_taxbit.csv', Papa.unparse(allTransactions))
fs.writeFileSync('output/nexo_all_koinly.csv', Papa.unparse(allTransactions.map(trans => trans.toKoinly())))
