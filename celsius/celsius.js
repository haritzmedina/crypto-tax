const Papa = require('papaparse')
const _ = require('lodash')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../Transaction')

const exchangeName = 'Celsius'

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
let transactionsCSVText = fs.readFileSync("input/celsius-transactions.csv", "utf8")
let transactions = Papa.parse(transactionsCSVText, {header: true})

// Deposits
let deposits = transactions.data.filter(deposit => {
    return deposit[' Transaction type'] === 'Transfer'
})

let transactionsDeposits = deposits.map(deposit => {
    return new Transaction({
        dateTime: new Date(deposit[' Date and time']).toISOString(),
        type: 'Transfer In',
        receivedQuantity: parseFloat(deposit[' Coin amount']),
        receivedCurrency: currencySolver(deposit[' Coin type']),
        receivingDestination: exchangeName,
        exchangeTransactionId: deposit['Internal id']
    })
})

fs.writeFileSync('output/celsius_deposit.csv', Papa.unparse(transactionsDeposits))

// Withdrawal

let withdraws = transactions.data.filter(transaction => {
    return transaction[' Transaction type'] === 'Withdrawal'
})

let transactionsWithdraw = withdraws.map(withdrawal => {
    return new Transaction({
        dateTime: new Date(withdrawal[' Date and time']).toISOString(),
        type: 'Transfer Out',
        sentQuantity: parseFloat(withdrawal[' Coin amount'])*-1,
        sentCurrency: currencySolver(withdrawal[' Coin type']),
        sendingSource: exchangeName,
        exchangeTransactionId: withdrawal['Internal id']
    })
})

fs.writeFileSync('output/celsius_withdraw.csv', Papa.unparse(transactionsWithdraw))

// Loans interest

let loanInterests = transactions.data.filter(transaction => {
    return transaction[' Transaction type'] === 'Reward' || transaction[' Transaction type'] === 'Referred Award'
})

let transactionsInterest = loanInterests.map(interests => {
    return new Transaction({
        dateTime: new Date(interests[' Date and time']).toISOString(),
        type: 'Income',
        receivedQuantity: parseFloat(interests[' Coin amount']).toFixed(8),
        receivedCurrency: currencySolver(interests[' Coin type']),
        receivingDestination: exchangeName,
        exchangeTransactionId: interests['Internal id']
    })
})

fs.writeFileSync('output/celsius_interest.csv', Papa.unparse(transactionsInterest))

// TODO Buy

// TODO Sales

// TODO Trades

/*let usedTransactions = _.concat(buyTrades, saleTrades, nonFiatTrades)
let nonUsedTransactions = _.difference(trades.data, usedTransactions)
console.log(nonUsedTransactions)*/

// TODO Expenses

// Check pending transactions to be processed
let usedTransactions = _.concat(loanInterests, deposits, withdraws)
let nonUsedTransactions = _.difference(transactions.data, usedTransactions)
fs.writeFileSync('output/celsius_pending.csv', Papa.unparse(nonUsedTransactions))

// A file for all transactions
let allTransactions = _.concat(transactionsDeposits, transactionsWithdraw, transactionsInterest)
fs.writeFileSync('output/celsius_all_taxbit.csv', Papa.unparse(allTransactions))
fs.writeFileSync('output/celsius_all_koinly.csv', Papa.unparse(allTransactions.map(trans => trans.toKoinly())))
fs.writeFileSync('output/celsius_all_cointracking.csv', Papa.unparse(allTransactions.map(trans => trans.toCointracking(exchangeName))))
