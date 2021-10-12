# levr-sale
The contracts necessary to deploy the levr.ly token, the levr.ly DAO, gulper and levr.ly DAO.

## $LEVR
$LEVR is the levr.ly token. 
It has an initial maximum supply of 7000 tokens.
It is built to be:
1. Scarse.
2. Have very good liquidity.
3. Have irrevocalble liquidity.
4. Have not only a low total supply, but a low circulating supply.

## levr.ly DAO
This is based off of our work on adjusting Compound governance for use as Foundry's initial governance system.
It consists of:
1. The $gLEVR token, which is a wrapping token to around $LEVR to allow it to work with Compound governance.
2. The Governor Alpha contract
3. The timelock contract

## The $LEVR sale
This consists of 
1. The sale contract. This allows for Ether to be traded for $LEVR with a 5 day delay.
2. The gulper. This converts the collected Ether into $LEVR-$ETH liquidity and $LEVR-$dETH liquidity.

## The staking contract
This is a contract that is meant to pull excess $LEVR out of circulation in order to earn staking rewards. 
 
## $LEVR faucet
This is a faucet that emits a predicible maximum amount $LEVR to the governance and staking contracts.
Note the funds sent to the governance can be optionally burnt. 