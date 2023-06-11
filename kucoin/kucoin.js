const Papa = require('papaparse')
const _ = require('lodash')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../Transaction')

const exchangeName = 'Kucoin'

const currencySolver = require('../CurrencySolver')

let isFiat = (currency) => {
    let fiatCurrencies = {
        'EUR': 'EUR',
        'USD': 'USD',
        'TRY': 'TRY'
    } // TODO To complete
    return !!fiatCurrencies[currencySolver(currency)];
}

let parseKucoinDate = (dateTimeString) => {
    let [datePart, timePart] = dateTimeString.split(' ');
    let [year, month, day] = datePart.split('-').map(Number);
    let [hours, minutes, seconds] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
}

// Deposits

let depositsCSVText = fs.readFileSync("input/kucoin_deposit.csv", "utf8")
let deposits = Papa.parse(depositsCSVText, {header: true})

let transactionsDeposits = deposits.data.map(deposit => {
    return new Transaction({
        dateTime: parseKucoinDate(deposit["﻿Time"]),
        type: 'Transfer In',
        receivedQuantity: parseFloat(deposit['Amount']),
        receivedCurrency: currencySolver(deposit['Coin']),
        receivingDestination: exchangeName,
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/kucoin_deposit.csv', Papa.unparse(transactionsDeposits))

// Withdrawal

let withdrawalCSVText = fs.readFileSync("input/kucoin_withdrawal.csv", "utf8")
let withdraws = Papa.parse(withdrawalCSVText, {header: true})


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

fs.writeFileSync('output/kucoin_withdraw.csv', Papa.unparse(transactionsWithdraw))
/*

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

fs.writeFileSync('output/kucoin_interest.csv', Papa.unparse(transactionsInterest))

// TODO Buy

// TODO Sales
*/
// TODO Trades
let tradesCSVText = fs.readFileSync("input/kucoin_trades.csv", "utf8")
let trades = Papa.parse(tradesCSVText, {header: true})

let transactionsTrades = trades.data.map(trade => {
    let receivedQuantity
    let receivedCurrency
    let sentQuantity
    let sentCurrency
    if (trade['side'] === 'buy') {
        receivedQuantity = trade['size']
        sentQuantity = trade['funds']
        receivedCurrency = trade['symbol'].split('-')[0]
        sentCurrency = trade['symbol'].split('-')[1]
    } else {
        receivedQuantity = trade['funds']
        sentQuantity = trade['size']
        receivedCurrency = trade['symbol'].split('-')[1]
        sentCurrency = trade['symbol'].split('-')[0]
    }
    return new Transaction({
        dateTime: parseKucoinDate(trade['tradeCreatedAt']),
        type: 'Trade',
        receivedQuantity: parseFloat(receivedQuantity),
        receivedCurrency: currencySolver(receivedCurrency),
        receivingDestination: exchangeName,
        sentQuantity: parseFloat(sentQuantity),
        sentCurrency: currencySolver(sentCurrency),
        sendingSource: exchangeName,
        fee: trade['fee'],
        feeCurrency: trade['feeCurrency'],
        exchangeTransactionId: trade['orderId']
    })
})

fs.writeFileSync('output/kucoin_trade.csv', Papa.unparse(transactionsDeposits))



/*let usedTransactions = _.concat(buyTrades, saleTrades, trades.data)
let nonUsedTransactions = _.difference(trades.data, usedTransactions)
console.log(nonUsedTransactions)*/

// TODO Expenses

// Check pending transactions to be processed
/*let usedTransactions = _.concat(loanInterests, deposits, withdraws)
let nonUsedTransactions = _.difference(transactions.data, usedTransactions)
fs.writeFileSync('output/kucoin_pending.csv', Papa.unparse(nonUsedTransactions))*/

// A file for all transactions
let allTransactions = _.concat(transactionsDeposits, transactionsTrades)
//let allTransactions = _.concat(transactionsDeposits, transactionsWithdraw, transactionsInterest)
fs.writeFileSync('output/kucoin_all_taxbit.csv', Papa.unparse(allTransactions))
fs.writeFileSync('output/kucoin_all_koinly.csv', Papa.unparse(allTransactions.map(trans => trans.toKoinly())))
fs.writeFileSync('output/kucoin_all_cointracking.csv', Papa.unparse(allTransactions.map(trans => trans.toCointracking(exchangeName))))
