const solanaWeb3 = require('@solana/web3.js');
const sptToken = require('@solana/spl-token');
const express = require('express');
var bodyParser = require('body-parser');
var app = express();
require('body-parser-xml')(bodyParser);

async function sendToken (fromWalletAddress, toWalletAddress, amount, token) {
    // Connect to cluster
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');

    // Generate a new wallet keypair and airdrop SOL
    const fromWallet = solanaWeb3.Keypair.generate();
    const fromAirdropSignature = await connection.requestAirdrop(fromWallet.publicKey, solanaWeb3.LAMPORTS_PER_SOL);

    // Wait for airdrop confirmation
    await connection.confirmTransaction(fromAirdropSignature);

    // Generate a new wallet to receive newly minted token
    const toWallet = solanaWeb3.Keypair.generate();

    // Create new token mint
    const mint = await solanaWeb3.createMint(connection, fromWallet, fromWallet.publicKey, null, 9);

    // Get the token account of the fromWallet address, and if it does not exist, create it
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        fromWallet,
        mint,
        fromWallet.publicKey
    );

    // Get the token account of the toWallet address, and if it does not exist, create it
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, toWallet.publicKey);

    // Mint 1 new token to the "fromTokenAccount" account we just created
    let signature = await mintTo(
        connection,
        fromWallet,
        mint,
        fromTokenAccount.address,
        fromWallet.publicKey,
        1000000000
    );
    console.log('mint tx:', signature);

    // Transfer the new token to the "toTokenAccount" we just created
    signature = await transfer(
        connection,
        fromWallet,
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        50
    );
}

var app = express();

app.use(bodyParser.xml({
  limit: '1MB',
  XmlParseOptions: {
    normalize: true,
    normalizeTags: true,
    explicitArray: false
  }
}));

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/" + "main.html");
});

app.post('/sendtoken', bodyParser.urlencoded({ extended: false }), function(req, res) {
  console.log(req.body);
  var body = req.body;

  sendToken(body.from, body.to, body.amount, body.token);
});

var server = app.listen(8080, function() {
  var host = '127.0.0.1';
  var port = server.address().port;
  console.log("Server running at http://%s:%s\n", host, port);
});