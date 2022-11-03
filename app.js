const solanaWeb3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const app = express();

const domainName = 'abhmore.ru';

const sslEnabled = fs.existsSync('ssl-on');
const isLocal = fs.existsSync('is-local');

let credentials = {};
let privateKey = '';
let certificate = '';
let ca = '';

if(sslEnabled) {

  if(!isLocal) {
    // Certificate
    privateKey = fs.readFileSync('/etc/letsencrypt/live/' + domainName + '/privkey.pem', 'utf8');
    certificate = fs.readFileSync('/etc/letsencrypt/live/' + domainName + '/cert.pem', 'utf8');
    ca = fs.readFileSync('/etc/letsencrypt/live/' + domainName + '/chain.pem', 'utf8');

    credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    };
  }
}

async function sendToken (fromWalletAddress, toWalletAddress, amount, token) {
    // Connect to cluster
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');

    // Generate a new wallet keypair and airdrop SOL
    const fromWallet = solanaWeb3.Keypair.generate();

    // Generate a new wallet to receive newly minted token
    const toWallet = solanaWeb3.Keypair.generate();

    const tokenVariants = {
      usdt: {
        mint: 'Q6XprfkF8RQQKoQVG33xT88H7wi8Uk1B1CC7YAs69Gi',
        freeze: 'Q6XprfkF8RQQKoQVG33xT88H7wi8Uk1B1CC7YAs69Gi',
      },
      usdc: {
        mint: '2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9',
        freeze: '3sNBr7kMccME5D55xNgsmYpZnzPgP2g12CixAajXypn6'
      }
    }

    const selectedToken = tokenVariants[token];

    console.log(tokenVariants, selectedToken, token);

    try {
      const mint = await splToken.createMint(
        connection,
        fromWallet,
        new solanaWeb3.PublicKey(selectedToken.mint), 
        new solanaWeb3.PublicKey(selectedToken.freeze),
        6,
        solanaWeb3.Keypair.generate(),
        []
      );

      const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
          connection,
          fromWallet,
          mint,
          fromWallet.publicKey
      );

      const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, toWallet.publicKey);

      /*let signature = await splToken.mintTo(
          connection,
          fromWallet,
          mint,
          fromTokenAccount.address,
          fromWallet.publicKey,
          amount * solanaWeb3.LAMPORTS_PER_SOL
      );
      console.log('mint tx:', signature);*/

      let signature = await splToken.transfer(
          connection,
          fromWallet,
          fromTokenAccount.address,
          toTokenAccount.address,
          fromWallet.publicKey,
          amount * solanaWeb3.LAMPORTS_PER_SOL
      );
    } catch(e) {
      console.log(e);
      return JSON.stringify({'status': 'fail', 'error': e.message});
    }

    return JSON.stringify({'status': 'ok'});
}

app.get('/', function(req, res) {
  console.log('get main page');
  res.sendFile(__dirname + "/" + "main.html");
});

app.use(express.json());

app.post('/', (req, res) => {
  var body = req.body;

  sendToken(body.from, body.to, body.amount, body.token).then(
    (result) => {
      res.end(result)
    });
});

const httpServer = http.createServer(app);
let httpsServer;
if(sslEnabled) {
  httpsServer = https.createServer(credentials, app);
}

httpServer.listen(8124, () => {
    console.log('HTTP Server running on port 8124');
});

if(sslEnabled) {
  httpsServer.listen(8125, () => {
      console.log('HTTPS Server running on port 8125');
  });
}