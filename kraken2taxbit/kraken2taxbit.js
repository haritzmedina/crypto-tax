const Papa = require('papaparse')
const fs = require('fs')
const Transaction = require('../Transaction')

let ledgersCSVText = fs.readFileSync("input/ledgers.csv", "utf8")
let ledgersData = Papa.parse(ledgersCSVText, {header: true})

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

