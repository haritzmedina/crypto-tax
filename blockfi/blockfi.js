const Papa = require('papaparse')
const _ = require('lodash')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../Transaction')

const exchangeName = 'BlockFi'

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
let transactionsCSVText = fs.readFileSync("input/blockfi-ledger.csv", "utf8")
let transactions = Papa.parse(transactionsCSVText, {header: true})

// Deposits
let deposits = transactions.data.filter(deposit => {
    return deposit['Transaction Type'] === 'Crypto Transfer'
})

let transactionsDeposits = deposits.map(deposit => {
    return new Transaction({
        dateTime: new Date(deposit['Confirmed At']).toISOString(),
        type: 'Transfer In',
        receivedQuantity: parseFloat(deposit['Amount']),
        receivedCurrency: currencySolver(deposit['Cryptocurrency']),
        receivingDestination: exchangeName,
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/blockfi_deposit.csv', Papa.unparse(transactionsDeposits))

// Withdrawal

let withdraws = transactions.data.filter(transaction => {
    return transaction['Transaction Type'] === 'Withdrawal'
})

let transactionsWithdraw = withdraws.map(withdrawal => {
    return new Transaction({
        dateTime: new Date(withdrawal['Confirmed At']).toISOString(),
        type: 'Transfer Out',
        sentQuantity: parseFloat(withdrawal['Amount'])*-1,
        sentCurrency: currencySolver(withdrawal['Cryptocurrency']),
        sendingSource: exchangeName,
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/blockfi_withdraw.csv', Papa.unparse(transactionsWithdraw))

// Interest loans (BIA)

let loanInterests = transactions.data.filter(transaction => {
    return transaction['Transaction Type'] === 'Interest Payment' || transaction['Transaction Type'] === 'Bonus Payment'
})

let transactionsInterest = loanInterests.map(interests => {
    return new Transaction({
        dateTime: new Date(interests['Confirmed At']).toISOString(),
        type: 'Income',
        receivedQuantity: parseFloat(interests['Amount']).toFixed(8),
        receivedCurrency: currencySolver(interests['Cryptocurrency']),
        receivingDestination: exchangeName,
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/blockfi_interest.csv', Papa.unparse(transactionsInterest))

// TODO Buy

// TODO Sales

// TODO Trades

/*let usedTransactions = _.concat(buyTrades, saleTrades, nonFiatTrades)
let nonUsedTransactions = _.difference(trades.data, usedTransactions)
console.log(nonUsedTransactions)*/

// TODO Expenses

// A file for all transactions
let allTransactions = _.concat(transactionsDeposits, transactionsWithdraw, transactionsInterest)
fs.writeFileSync('output/blockfi_all_taxbit.csv', Papa.unparse(allTransactions))
fs.writeFileSync('output/blockfi_all_koinly.csv', Papa.unparse(allTransactions.map(trans => trans.toKoinly())))
fs.writeFileSync('output/blockfi_all_cointracking.csv', Papa.unparse(allTransactions.map(trans => trans.toCointracking(exchangeName))))